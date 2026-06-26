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

  it("should retry registration after 250ms if it fails", async () => {
    // Fail the first time, succeed the second time
    mockSendMessage
      .mockRejectedValueOnce(new Error("TST not ready"))
      .mockResolvedValueOnce({ success: true });

    require("../background.js");

    // Wait for the first attempt to fail and schedule retry
    await Promise.resolve(); // Flush microtasks
    expect(mockSendMessage).toHaveBeenCalledTimes(1);

    // Fast-forward time
    jest.advanceTimersByTime(250);
    await Promise.resolve(); // Flush microtasks

    expect(mockSendMessage).toHaveBeenCalledTimes(2);
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
