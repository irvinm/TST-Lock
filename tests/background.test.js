"use strict";

describe("TST-Lock Background Script", () => {
  let mockSendMessage;
  let mockGetManifest;
  let mockOnMessageExternalAddListener;
  let mockSetBadgeBackgroundColor;
  let mockSetBadgeText;
  let mockGetTabValue;
  let mockSetTabValue;
  let mockRemoveTabValue;
  let mockTabsQuery;
  let mockTabsOnRemovedAddListener;

  let externalMessageCallback;
  let tabRemovedCallback;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();

    mockSendMessage = jest.fn().mockImplementation((id, msg) => {
      // Simulate normal messaging behavior
      return Promise.resolve({ success: true });
    });
    mockGetManifest = jest.fn().mockReturnValue({
      icons: { "128": "images/lock.png" }
    });

    mockOnMessageExternalAddListener = jest.fn((callback) => {
      externalMessageCallback = callback;
    });

    mockSetBadgeBackgroundColor = jest.fn();
    mockSetBadgeText = jest.fn();

    mockGetTabValue = jest.fn().mockResolvedValue(false);
    mockSetTabValue = jest.fn().mockResolvedValue(null);
    mockRemoveTabValue = jest.fn().mockResolvedValue(null);

    mockTabsQuery = jest.fn().mockResolvedValue([]);
    mockTabsOnRemovedAddListener = jest.fn((callback) => {
      tabRemovedCallback = callback;
    });

    global.browser = {
      runtime: {
        sendMessage: mockSendMessage,
        getManifest: mockGetManifest,
        onMessageExternal: {
          addListener: mockOnMessageExternalAddListener
        }
      },
      browserAction: {
        setBadgeBackgroundColor: mockSetBadgeBackgroundColor,
        setBadgeText: mockSetBadgeText
      },
      sessions: {
        getTabValue: mockGetTabValue,
        setTabValue: mockSetTabValue,
        removeTabValue: mockRemoveTabValue
      },
      tabs: {
        query: mockTabsQuery,
        onRemoved: {
          addListener: mockTabsOnRemovedAddListener
        }
      }
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.browser;
  });

  it("should attempt registration on startup and configure badges", async () => {
    require("../background.js");

    expect(mockSendMessage).toHaveBeenCalledWith(
      "treestyletab@piro.sakura.ne.jp",
      expect.objectContaining({ type: "register-self" })
    );
    expect(mockSetBadgeBackgroundColor).toHaveBeenCalledWith({ color: "green" });
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: "0" });
  });

  it("should handle registration failure gracefully without polling", async () => {
    mockSendMessage.mockRejectedValue(new Error("TST not ready"));

    require("../background.js");
    await Promise.resolve();

    expect(mockSendMessage).toHaveBeenCalledTimes(1);

    // Fast-forward any timers to verify no polling timers were scheduled
    jest.advanceTimersByTime(10000);
    await Promise.resolve();

    expect(mockSendMessage).toHaveBeenCalledTimes(1);
  });

  it("should defer lock loading and shutdown monitoring when TST returns falsy on startup", async () => {
    mockSendMessage.mockResolvedValueOnce(undefined);

    require("../background.js");
    await Promise.resolve();

    expect(mockSendMessage).toHaveBeenCalledWith(
      "treestyletab@piro.sakura.ne.jp",
      expect.objectContaining({ type: "register-self" })
    );

    expect(mockTabsQuery).not.toHaveBeenCalled();
    expect(mockSendMessage).not.toHaveBeenCalledWith(
      "treestyletab@piro.sakura.ne.jp",
      expect.objectContaining({ type: "wait-for-shutdown" })
    );
  });

  it("should re-register when receiving 'ready' message from TST", async () => {
    require("../background.js");
    await Promise.resolve();

    expect(mockSendMessage).toHaveBeenCalledWith(
      "treestyletab@piro.sakura.ne.jp",
      expect.objectContaining({ type: "register-self" })
    );

    mockSendMessage.mockClear();

    // Trigger TST 'ready' event
    await externalMessageCallback({ type: "ready" }, { id: "treestyletab@piro.sakura.ne.jp" });

    expect(mockSendMessage).toHaveBeenCalledWith(
      "treestyletab@piro.sakura.ne.jp",
      expect.objectContaining({ type: "register-self" })
    );
  });

  it("should toggle lock status on Ctrl+Shift+mousedown", async () => {
    require("../background.js");
    await Promise.resolve(); // Flush registration promises

    expect(externalMessageCallback).toBeDefined();

    const tabId = 123;
    const clickEvent = {
      type: "tab-mousedown",
      button: 0,
      ctrlKey: true,
      shiftKey: true,
      tab: { id: tabId }
    };

    // First click: Lock the tab
    mockSendMessage.mockClear();
    const responsePromise1 = externalMessageCallback(clickEvent);
    const response1 = await responsePromise1;

    expect(response1).toBe(true);
    expect(mockSendMessage).toHaveBeenCalledWith(
      "treestyletab@piro.sakura.ne.jp",
      { type: "add-tab-state", tab: tabId, state: "locked" }
    );
    expect(mockSetTabValue).toHaveBeenCalledWith(tabId, "locked", true);
    expect(mockSetBadgeText).toHaveBeenLastCalledWith({ text: "1" });

    // Second click: Unlock the tab
    mockSendMessage.mockClear();
    const responsePromise2 = externalMessageCallback(clickEvent);
    const response2 = await responsePromise2;

    expect(response2).toBe(true);
    expect(mockSendMessage).toHaveBeenCalledWith(
      "treestyletab@piro.sakura.ne.jp",
      { type: "remove-tab-state", tab: tabId, state: "locked" }
    );
    expect(mockRemoveTabValue).toHaveBeenCalledWith(tabId, "locked");
    expect(mockSetBadgeText).toHaveBeenLastCalledWith({ text: "0" });
  });

  it("should safely ignore tab-mousedown without a valid tab target", async () => {
    require("../background.js");
    await Promise.resolve();

    mockSendMessage.mockClear();
    const result = await externalMessageCallback({
      type: "tab-mousedown",
      button: 0,
      ctrlKey: true,
      shiftKey: true
    });

    expect(result).toBeUndefined();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("should ignore external messages from unauthorized sender", async () => {
    require("../background.js");
    await Promise.resolve();

    mockSendMessage.mockClear();
    const result = await externalMessageCallback(
      { type: "tab-mousedown", button: 0, ctrlKey: true, shiftKey: true, tab: { id: 123 } },
      { id: "unauthorized-addon@example.com" }
    );

    expect(result).toBeUndefined();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("should prevent closing tab with middle click if locked", async () => {
    require("../background.js");
    await Promise.resolve();

    const tabId = 456;
    
    // First, lock the tab via mousedown
    await externalMessageCallback({
      type: "tab-mousedown",
      button: 0,
      ctrlKey: true,
      shiftKey: true,
      tab: { id: tabId }
    });

    // Then middle-click to close
    const response = await externalMessageCallback({
      type: "tab-mouseup",
      button: 1,
      tab: { id: tabId }
    });

    expect(response).toBe(true);
  });

  it("should remove tab from lockedTabs on tab removal", async () => {
    require("../background.js");
    await Promise.resolve();

    const tabId = 789;

    // Lock the tab
    await externalMessageCallback({
      type: "tab-mousedown",
      button: 0,
      ctrlKey: true,
      shiftKey: true,
      tab: { id: tabId }
    });

    expect(mockSetBadgeText).toHaveBeenLastCalledWith({ text: "1" });

    // Simulate tab removed
    expect(tabRemovedCallback).toBeDefined();
    await tabRemovedCallback(tabId);

    // Verify it was deleted (next lock will make text "1" again instead of "2")
    await externalMessageCallback({
      type: "tab-mousedown",
      button: 0,
      ctrlKey: true,
      shiftKey: true,
      tab: { id: 999 }
    });
    expect(mockSetBadgeText).toHaveBeenLastCalledWith({ text: "1" });
  });

  it("should load stored lock states for tabs on registration success", async () => {
    // Mock query to return some tabs
    mockTabsQuery.mockResolvedValue([
      { id: 101 },
      { id: 102 }
    ]);
    
    // Mock session to say tab 101 is locked, but 102 is not
    mockGetTabValue.mockImplementation((tabId, key) => {
      if (tabId === 101 && key === "locked") {
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    });

    require("../background.js");
    
    // Allow the promise resolution inside registerSelfToTST and loadStoredLockStates to run
    await Promise.resolve(); // registerSelfToTST
    await Promise.resolve(); // browser.tabs.query
    await Promise.resolve(); // browser.sessions.getTabValue 101
    await Promise.resolve(); // browser.sessions.getTabValue 102
    await Promise.resolve(); // browser.runtime.sendMessage (add-tab-state)

    expect(mockSendMessage).toHaveBeenCalledWith(
      "treestyletab@piro.sakura.ne.jp",
      { type: "add-tab-state", tab: 101, state: "locked" }
    );
    expect(mockSetBadgeText).toHaveBeenLastCalledWith({ text: "1" });
  });
});
