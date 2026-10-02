"use strict";

describe("TST-Lock Background Script", () => {
  let mockSendMessage;
  let mockGetManifest;
  let mockOnMessageExternalAddListener;
  let mockOnInstalledAddListener;
  let mockSetBadgeBackgroundColor;
  let mockSetBadgeText;
  let mockGetTabValue;
  let mockSetTabValue;
  let mockRemoveTabValue;
  let mockTabsQuery;
  let mockTabsCreate;
  let mockTabsOnRemovedAddListener;
  let mockStorageLocalGet;
  let mockStorageLocalSet;

  let externalMessageCallback;
  let tabRemovedCallback;
  let installedCallback;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();

    mockSendMessage = jest.fn().mockImplementation((id, msg) => {
      // Simulate normal messaging behavior
      return Promise.resolve({ success: true });
    });
    mockGetManifest = jest.fn().mockReturnValue({
      version: "1.2.0",
      icons: { "128": "images/lock.png" }
    });

    mockOnMessageExternalAddListener = jest.fn((callback) => {
      externalMessageCallback = callback;
    });

    mockOnInstalledAddListener = jest.fn((callback) => {
      installedCallback = callback;
    });

    mockSetBadgeBackgroundColor = jest.fn();
    mockSetBadgeText = jest.fn();

    mockGetTabValue = jest.fn().mockResolvedValue(false);
    mockSetTabValue = jest.fn().mockResolvedValue(null);
    mockRemoveTabValue = jest.fn().mockResolvedValue(null);

    mockTabsQuery = jest.fn().mockResolvedValue([]);
    mockTabsCreate = jest.fn().mockResolvedValue({ id: 101 });
    mockTabsOnRemovedAddListener = jest.fn((callback) => {
      tabRemovedCallback = callback;
    });

    mockStorageLocalGet = jest.fn().mockResolvedValue({});
    mockStorageLocalSet = jest.fn().mockResolvedValue();

    global.browser = {
      runtime: {
        sendMessage: mockSendMessage,
        getManifest: mockGetManifest,
        getURL: jest.fn((path) => `moz-extension://test-uuid/${path}`),
        onMessageExternal: {
          addListener: mockOnMessageExternalAddListener
        },
        onInstalled: {
          addListener: mockOnInstalledAddListener
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
        create: mockTabsCreate,
        onRemoved: {
          addListener: mockTabsOnRemovedAddListener
        }
      },
      storage: {
        sync: {
          get: jest.fn().mockResolvedValue({ iconConfig: { type: "emoji", value: "🔒" } }),
          set: jest.fn().mockResolvedValue()
        },
        local: {
          get: mockStorageLocalGet,
          set: mockStorageLocalSet
        },
        onChanged: {
          addListener: jest.fn()
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

  describe("Icon Customization & Styling", () => {
    it("should sanitize emoji inputs safely", () => {
      const { sanitizeEmoji } = require("../background.js");
      expect(sanitizeEmoji("🔒")).toBe("🔒");
      expect(sanitizeEmoji('  "🔒"\\  ')).toBe("🔒");
      expect(sanitizeEmoji("")).toBe("🔒");
      expect(sanitizeEmoji(null)).toBe("🔒");
      expect(sanitizeEmoji("🛡️⚔️")).toBe("🛡️");
      expect(sanitizeEmoji("text")).toBe("t");
    });

    it("should build valid TST CSS for emoji icons", () => {
      const { buildTSTStyle } = require("../background.js");
      const style = buildTSTStyle({ type: "emoji", value: "🔐" });
      expect(style).toContain('content: "🔐";');
      expect(style).toContain(".tab.locked .closebox");
    });

    it("should build valid TST CSS for bundled icons", () => {
      const { buildTSTStyle } = require("../background.js");
      const style = buildTSTStyle({ type: "bundled", value: "images/lock(24x24).png" });
      expect(style).toContain('background-image: url("moz-extension://test-uuid/images/lock(24x24).png")');
      expect(style).toContain("width: 15px");
      expect(style).toContain("height: 15px");
      expect(style).toContain("mask: none");
    });

    it("should scale dimensions and vertical centering proportionally with size setting", () => {
      const { buildTSTStyle } = require("../background.js");

      // Custom size 20px emoji
      const style20 = buildTSTStyle({ type: "emoji", value: "🔒", size: 20 });
      expect(style20).toContain("font-size: 20px !important;");
      expect(style20).toContain("transform: translateY(-1.8px) !important;");
      expect(style20).toContain("width: 24px !important;");
      expect(style20).toContain("height: 24px !important;");

      // Custom size 12px bundled icon
      const style12 = buildTSTStyle({ type: "bundled", value: "images/lock.png", size: 12 });
      expect(style12).toContain("width: 11px !important;");
      expect(style12).toContain("height: 11px !important;");
      expect(style12).toContain("width: 20px !important;");
      expect(style12).toContain("height: 20px !important;");

      // Fallback for missing or out-of-range size
      const styleDefault = buildTSTStyle({ type: "emoji", value: "🔒", size: 999 });
      expect(styleDefault).toContain("font-size: 16px !important;");
    });

    it("should support always and hover visibility modes", () => {
      const { buildTSTStyle } = require("../background.js");

      // Always mode (default)
      const styleAlways = buildTSTStyle({ type: "emoji", value: "🔒", visibility: "always" });
      expect(styleAlways).toContain("opacity: 1 !important;");
      expect(styleAlways).not.toContain(".tab.locked:hover .closebox");

      // Hover mode
      const styleHover = buildTSTStyle({ type: "emoji", value: "🔒", visibility: "hover" });
      expect(styleHover).toContain("opacity: 0 !important;");
      expect(styleHover).toContain(".tab.locked:hover .closebox");
      expect(styleHover).toContain("opacity: 1 !important;");
    });

    it("should re-register with TST when storage onChanged fires", async () => {
      let storageCallback;
      global.browser.storage.onChanged.addListener = jest.fn((cb) => {
        storageCallback = cb;
      });

      require("../background.js");
      await Promise.resolve();

      expect(storageCallback).toBeDefined();
      mockSendMessage.mockClear();

      // Trigger storage change with new icon
      storageCallback({
        iconConfig: {
          newValue: { type: "emoji", value: "🛡️" }
        }
      });

      await Promise.resolve();

      expect(mockSendMessage).toHaveBeenCalledWith(
        "treestyletab@piro.sakura.ne.jp",
        expect.objectContaining({
          type: "register-self",
          style: expect.stringContaining('content: "🛡️";')
        })
      );
    });
  });

  describe("Version Update & Notification Handling", () => {
    it("should open update.html page in a tab on extension update", async () => {
      mockStorageLocalGet.mockResolvedValueOnce({ lastSeenVersion: "1.1.0" });

      require("../background.js");
      await Promise.resolve();

      expect(installedCallback).toBeDefined();

      await installedCallback({ reason: "update", previousVersion: "1.1.0" });

      expect(mockTabsCreate).toHaveBeenCalledWith({
        url: "moz-extension://test-uuid/options/update.html"
      });
      expect(mockStorageLocalSet).toHaveBeenCalledWith(expect.objectContaining({ lastSeenVersion: "1.2.0" }));
    });

    it("should not open update.html tab on initial install", async () => {
      require("../background.js");
      await Promise.resolve();

      expect(installedCallback).toBeDefined();

      mockTabsCreate.mockClear();

      await installedCallback({ reason: "install" });

      expect(mockTabsCreate).not.toHaveBeenCalled();
      expect(mockStorageLocalSet).toHaveBeenCalledWith(expect.objectContaining({ lastSeenVersion: "1.2.0" }));
    });

    it("should not reopen update.html if already shown for current version", async () => {
      mockStorageLocalGet.mockResolvedValueOnce({ lastSeenVersion: "1.2.0" });

      require("../background.js");
      await Promise.resolve();

      mockTabsCreate.mockClear();

      await installedCallback({ reason: "update", previousVersion: "1.1.6" });

      expect(mockTabsCreate).not.toHaveBeenCalled();
    });

    it("should never reopen update.html on future version upgrades if hasSeenUpdatePage is true", async () => {
      mockStorageLocalGet.mockResolvedValueOnce({ hasSeenUpdatePage: true, lastSeenVersion: "1.2.0" });

      require("../background.js");
      await Promise.resolve();

      mockTabsCreate.mockClear();

      await installedCallback({ reason: "update", previousVersion: "1.2.0" });

      expect(mockTabsCreate).not.toHaveBeenCalled();
    });
  });
});


