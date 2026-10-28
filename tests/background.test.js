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
  let mockTabsOnAttachedAddListener;
  let mockTabsOnCreatedAddListener;
  let mockStorageLocalGet;
  let mockStorageLocalSet;
  let mockMenusCreate;
  let mockMenusUpdate;
  let mockMenusRefresh;
  let mockMenusOnShownAddListener;
  let mockMenusOnClickedAddListener;
  let mockCommandsOnCommandAddListener;

  let externalMessageCallback;
  let tabRemovedCallback;
  let tabAttachedCallback;
  let tabCreatedCallback;
  let installedCallback;
  let menusOnShownCallback;
  let menusOnClickedCallback;
  let commandsOnCommandCallback;

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
    mockTabsOnAttachedAddListener = jest.fn((callback) => {
      tabAttachedCallback = callback;
    });
    mockTabsOnCreatedAddListener = jest.fn((callback) => {
      tabCreatedCallback = callback;
    });

    mockStorageLocalGet = jest.fn().mockResolvedValue({});
    mockStorageLocalSet = jest.fn().mockResolvedValue();

    mockMenusCreate = jest.fn();
    mockMenusUpdate = jest.fn().mockResolvedValue();
    mockMenusRefresh = jest.fn();
    mockMenusOnShownAddListener = jest.fn((callback) => {
      menusOnShownCallback = callback;
    });
    mockMenusOnClickedAddListener = jest.fn((callback) => {
      menusOnClickedCallback = callback;
    });
    mockCommandsOnCommandAddListener = jest.fn((callback) => {
      commandsOnCommandCallback = callback;
    });

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
        },
        onAttached: {
          addListener: mockTabsOnAttachedAddListener
        },
        onCreated: {
          addListener: mockTabsOnCreatedAddListener
        }
      },
      menus: {
        create: mockMenusCreate,
        update: mockMenusUpdate,
        refresh: mockMenusRefresh,
        onShown: {
          addListener: mockMenusOnShownAddListener
        },
        onClicked: {
          addListener: mockMenusOnClickedAddListener
        }
      },
      commands: {
        onCommand: {
          addListener: mockCommandsOnCommandAddListener
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

    it("should open update.html on upgrade from older version with empty storage (e.g. v1.1.7)", async () => {
      mockStorageLocalGet.mockResolvedValueOnce({}); // Older versions had no update storage keys

      require("../background.js");
      await Promise.resolve();

      expect(installedCallback).toBeDefined();
      mockTabsCreate.mockClear();

      await installedCallback({ reason: "update", previousVersion: "1.1.7" });

      expect(mockTabsCreate).toHaveBeenCalledWith({
        url: "moz-extension://test-uuid/options/update.html"
      });
      expect(mockStorageLocalSet).toHaveBeenCalledWith({
        hasSeenUpdatePage: true,
        lastSeenVersion: "1.2.0"
      });
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

  describe("Keyboard Commands & Shortcuts", () => {
    it("should toggle active tab lock state when toggle-tab-lock command is received", async () => {
      const bg = require("../background.js");
      await Promise.resolve();

      expect(commandsOnCommandCallback).toBeDefined();

      const activeTabId = 777;
      mockTabsQuery.mockResolvedValueOnce([{ id: activeTabId, active: true }]);

      // 1. First trigger: Lock active tab
      mockSendMessage.mockClear();
      await commandsOnCommandCallback("toggle-tab-lock");

      expect(mockTabsQuery).toHaveBeenCalledWith({ highlighted: true, currentWindow: true });
      expect(mockSendMessage).toHaveBeenCalledWith(
        "treestyletab@piro.sakura.ne.jp",
        { type: "add-tab-state", tab: activeTabId, state: "locked" }
      );
      expect(mockSetTabValue).toHaveBeenCalledWith(activeTabId, "locked", true);
      expect(mockSetBadgeText).toHaveBeenLastCalledWith({ text: "1" });
      expect(bg.lockedTabs.has(activeTabId)).toBe(true);

      // 2. Second trigger: Unlock active tab
      mockTabsQuery.mockResolvedValueOnce([{ id: activeTabId, active: true }]);
      mockSendMessage.mockClear();
      await commandsOnCommandCallback("toggle-tab-lock");

      expect(mockSendMessage).toHaveBeenCalledWith(
        "treestyletab@piro.sakura.ne.jp",
        { type: "remove-tab-state", tab: activeTabId, state: "locked" }
      );
      expect(mockRemoveTabValue).toHaveBeenCalledWith(activeTabId, "locked");
      expect(mockSetBadgeText).toHaveBeenLastCalledWith({ text: "0" });
      expect(bg.lockedTabs.has(activeTabId)).toBe(false);
    });

    it("should batch toggle multiple highlighted tabs when toggle-tab-lock command is received", async () => {
      const bg = require("../background.js");
      await Promise.resolve();

      const tabs = [{ id: 101, highlighted: true }, { id: 102, highlighted: true }];
      mockTabsQuery.mockResolvedValueOnce(tabs);

      mockSendMessage.mockClear();
      await commandsOnCommandCallback("toggle-tab-lock");

      expect(mockSendMessage).toHaveBeenCalledWith("treestyletab@piro.sakura.ne.jp", {
        type: "add-tab-state",
        tab: 101,
        state: "locked"
      });
      expect(mockSendMessage).toHaveBeenCalledWith("treestyletab@piro.sakura.ne.jp", {
        type: "add-tab-state",
        tab: 102,
        state: "locked"
      });
      expect(bg.lockedTabs.has(101)).toBe(true);
      expect(bg.lockedTabs.has(102)).toBe(true);
      expect(mockSetBadgeText).toHaveBeenLastCalledWith({ text: "2" });
    });

    it("should safely ignore unknown commands or when no active tab is returned", async () => {
      require("../background.js");
      await Promise.resolve();

      mockSendMessage.mockClear();
      mockTabsQuery.mockClear();

      // Unknown command
      await commandsOnCommandCallback("unknown-command");
      expect(mockTabsQuery).not.toHaveBeenCalled();

      // Known command, empty query result
      mockTabsQuery.mockResolvedValueOnce([]);
      mockTabsQuery.mockResolvedValueOnce([]);
      await commandsOnCommandCallback("toggle-tab-lock");
      expect(mockTabsQuery).toHaveBeenCalledWith({ highlighted: true, currentWindow: true });
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe("Tab Context Menu", () => {
    it("should register context menu item on startup", async () => {
      const bg = require("../background.js");
      await Promise.resolve();

      expect(mockMenusCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: bg.CONTEXT_MENU_ID,
          title: "Lock Tab",
          contexts: ["tab"]
        }),
        expect.any(Function)
      );
    });

    it("should dynamically update menu title on onShown depending on lock state", async () => {
      const bg = require("../background.js");
      await Promise.resolve();

      expect(menusOnShownCallback).toBeDefined();

      const tabId = 888;

      // When tab is not locked
      await menusOnShownCallback({ contexts: ["tab"] }, { id: tabId });
      expect(mockMenusUpdate).toHaveBeenCalledWith(bg.CONTEXT_MENU_ID, {
        title: "Lock Tab"
      });
      expect(mockMenusRefresh).toHaveBeenCalled();

      // Lock the tab
      await bg.toggleTabLock(tabId);
      mockMenusUpdate.mockClear();
      mockMenusRefresh.mockClear();

      // When tab is locked
      await menusOnShownCallback({ contexts: ["tab"] }, { id: tabId });
      expect(mockMenusUpdate).toHaveBeenCalledWith(bg.CONTEXT_MENU_ID, {
        title: "Unlock Tab"
      });
      expect(mockMenusRefresh).toHaveBeenCalled();
    });

    it("should show batch count in menu title when multiple tabs are highlighted", async () => {
      const bg = require("../background.js");
      await Promise.resolve();

      const tabs = [{ id: 301, highlighted: true }, { id: 302, highlighted: true }];
      mockTabsQuery.mockResolvedValueOnce(tabs);

      mockMenusUpdate.mockClear();
      await menusOnShownCallback({ contexts: ["tab"] }, { id: 301 });
      expect(mockMenusUpdate).toHaveBeenCalledWith(bg.CONTEXT_MENU_ID, {
        title: "Lock 2 Tabs"
      });

      // When all are locked
      await bg.toggleTabsLock([301, 302]);
      mockTabsQuery.mockResolvedValueOnce(tabs);
      mockMenusUpdate.mockClear();
      await menusOnShownCallback({ contexts: ["tab"] }, { id: 301 });
      expect(mockMenusUpdate).toHaveBeenCalledWith(bg.CONTEXT_MENU_ID, {
        title: "Unlock 2 Tabs"
      });
    });

    it("should toggle tab lock state when context menu item is clicked", async () => {
      const bg = require("../background.js");
      await Promise.resolve();

      expect(menusOnClickedCallback).toBeDefined();

      const tabId = 999;
      mockSendMessage.mockClear();

      // Click menu item to lock tab
      await menusOnClickedCallback({ menuItemId: bg.CONTEXT_MENU_ID }, { id: tabId });

      expect(mockSendMessage).toHaveBeenCalledWith(
        "treestyletab@piro.sakura.ne.jp",
        { type: "add-tab-state", tab: tabId, state: "locked" }
      );
      expect(bg.lockedTabs.has(tabId)).toBe(true);

      // Click menu item again to unlock tab
      mockSendMessage.mockClear();
      await menusOnClickedCallback({ menuItemId: bg.CONTEXT_MENU_ID }, { id: tabId });

      expect(mockSendMessage).toHaveBeenCalledWith(
        "treestyletab@piro.sakura.ne.jp",
        { type: "remove-tab-state", tab: tabId, state: "locked" }
      );
      expect(bg.lockedTabs.has(tabId)).toBe(false);
    });

    it("should batch toggle tabs when context menu item is clicked on a multi-selection", async () => {
      const bg = require("../background.js");
      await Promise.resolve();

      const tabs = [{ id: 401, highlighted: true }, { id: 402, highlighted: true }];
      mockTabsQuery.mockResolvedValueOnce(tabs);

      mockSendMessage.mockClear();
      await menusOnClickedCallback({ menuItemId: bg.CONTEXT_MENU_ID }, { id: 401 });

      expect(mockSendMessage).toHaveBeenCalledWith("treestyletab@piro.sakura.ne.jp", {
        type: "add-tab-state",
        tab: 401,
        state: "locked"
      });
      expect(mockSendMessage).toHaveBeenCalledWith("treestyletab@piro.sakura.ne.jp", {
        type: "add-tab-state",
        tab: 402,
        state: "locked"
      });
      expect(bg.lockedTabs.has(401)).toBe(true);
      expect(bg.lockedTabs.has(402)).toBe(true);
    });

    it("should ignore clicks for different menu items or invalid tabs", async () => {
      const bg = require("../background.js");
      await Promise.resolve();

      mockSendMessage.mockClear();

      // Different menu item
      await menusOnClickedCallback({ menuItemId: "some-other-item" }, { id: 123 });
      expect(mockSendMessage).not.toHaveBeenCalled();

      // Invalid tab
      await menusOnClickedCallback({ menuItemId: bg.CONTEXT_MENU_ID }, {});
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe("Mouse Click Shortcuts & Preferences", () => {
    it("should normalize legacy and modern mouse shortcut configurations", () => {
      const bg = require("../background.js");

      // Default fallback
      expect(bg.normalizeMouseShortcut(null)).toEqual({ ctrl: true, shift: true, alt: false, disabled: false });
      expect(bg.normalizeMouseShortcut(undefined)).toEqual({ ctrl: true, shift: true, alt: false, disabled: false });

      // Legacy string options
      expect(bg.normalizeMouseShortcut("ctrlShift")).toEqual({ ctrl: true, shift: true, alt: false, disabled: false });
      expect(bg.normalizeMouseShortcut("alt")).toEqual({ ctrl: false, shift: false, alt: true, disabled: false });
      expect(bg.normalizeMouseShortcut("altShift")).toEqual({ ctrl: false, shift: true, alt: true, disabled: false });
      expect(bg.normalizeMouseShortcut("ctrlAlt")).toEqual({ ctrl: true, shift: false, alt: true, disabled: false });
      expect(bg.normalizeMouseShortcut("disabled")).toEqual({ ctrl: false, shift: false, alt: false, disabled: true });

      // Modern object config
      expect(bg.normalizeMouseShortcut({ ctrl: true, shift: false, alt: true, disabled: false })).toEqual({
        ctrl: true,
        shift: false,
        alt: true,
        disabled: false
      });
      // Object with disabled: true (preserves chosen modifiers for when re-enabled)
      expect(bg.normalizeMouseShortcut({ ctrl: true, shift: true, alt: false, disabled: true })).toEqual({
        ctrl: true,
        shift: true,
        alt: false,
        disabled: true
      });
    });

    it("should support custom modifier combinations and legacy string formats", () => {
      const bg = require("../background.js");

      // Default object config: Ctrl + Shift
      const defaultCfg = { ctrl: true, shift: true, alt: false, disabled: false };
      expect(bg.isMouseShortcutMatch({ button: 0, ctrlKey: true, shiftKey: true }, defaultCfg)).toBe(true);
      expect(bg.isMouseShortcutMatch({ button: 0, metaKey: true, shiftKey: true }, defaultCfg)).toBe(true);
      expect(bg.isMouseShortcutMatch({ button: 0, ctrlKey: true, shiftKey: true, altKey: true }, defaultCfg)).toBe(false);

      // Custom object: Ctrl + Shift + Alt
      const allThree = { ctrl: true, shift: true, alt: true, disabled: false };
      expect(bg.isMouseShortcutMatch({ button: 0, ctrlKey: true, shiftKey: true, altKey: true }, allThree)).toBe(true);
      expect(bg.isMouseShortcutMatch({ button: 0, metaKey: true, shiftKey: true, altKey: true }, allThree)).toBe(true);
      expect(bg.isMouseShortcutMatch({ button: 0, ctrlKey: true, shiftKey: true, altKey: false }, allThree)).toBe(false);

      // Custom object: Alt only
      const altOnly = { ctrl: false, shift: false, alt: true, disabled: false };
      expect(bg.isMouseShortcutMatch({ button: 0, altKey: true }, altOnly)).toBe(true);
      expect(bg.isMouseShortcutMatch({ button: 0, altKey: true, ctrlKey: true }, altOnly)).toBe(false);

      // Disabled object
      const disabledCfg = { ctrl: false, shift: false, alt: false, disabled: true };
      expect(bg.isMouseShortcutMatch({ button: 0, ctrlKey: true, shiftKey: true }, disabledCfg)).toBe(false);

      // Legacy string backwards compatibility
      expect(bg.isMouseShortcutMatch({ button: 0, ctrlKey: true, shiftKey: true }, "ctrlShift")).toBe(true);
      expect(bg.isMouseShortcutMatch({ button: 0, altKey: true }, "alt")).toBe(true);
      expect(bg.isMouseShortcutMatch({ button: 0, altKey: true, shiftKey: true }, "altShift")).toBe(true);
      expect(bg.isMouseShortcutMatch({ button: 0, ctrlKey: true, altKey: true }, "ctrlAlt")).toBe(true);
      expect(bg.isMouseShortcutMatch({ button: 0, ctrlKey: true, shiftKey: true }, "disabled")).toBe(false);

      // Must be Left-Click (button: 0), rejects middle (1) or right (2)
      expect(bg.isMouseShortcutMatch({ button: 1, ctrlKey: true, shiftKey: true }, defaultCfg)).toBe(false);
      expect(bg.isMouseShortcutMatch({ button: 2, ctrlKey: true, shiftKey: true }, defaultCfg)).toBe(false);
    });

    it("should batch toggle tabs via mouse click when clicked tab is part of multi-selection", async () => {
      const bg = require("../background.js");
      await Promise.resolve();

      bg.currentMouseShortcut = "ctrlShift";
      const tabs = [{ id: 501, highlighted: true }, { id: 502, highlighted: true }];
      mockTabsQuery.mockResolvedValueOnce(tabs);

      mockSendMessage.mockClear();
      await externalMessageCallback({
        type: "tab-mousedown",
        button: 0,
        ctrlKey: true,
        shiftKey: true,
        tab: { id: 501 }
      });

      expect(mockSendMessage).toHaveBeenCalledWith("treestyletab@piro.sakura.ne.jp", {
        type: "add-tab-state",
        tab: 501,
        state: "locked"
      });
      expect(mockSendMessage).toHaveBeenCalledWith("treestyletab@piro.sakura.ne.jp", {
        type: "add-tab-state",
        tab: 502,
        state: "locked"
      });
      expect(bg.lockedTabs.has(501)).toBe(true);
      expect(bg.lockedTabs.has(502)).toBe(true);
    });
  });

  describe("toggleTabLock helper", () => {
    it("should safely handle invalid or missing tabId", async () => {
      const bg = require("../background.js");
      const resultNull = await bg.toggleTabLock(null);
      const resultUndefined = await bg.toggleTabLock(undefined);

      expect(resultNull).toBe(false);
      expect(resultUndefined).toBe(false);
    });
  });

  describe("Keyboard Shortcut Formatting (options.js)", () => {
    it("should format shortcuts with macOS symbols on Mac", () => {
      const { formatShortcutForDisplay } = require("../options/options.js");

      // Default/fallback
      expect(formatShortcutForDisplay(null, true)).toBe("⌥ + ⌘ + L");
      expect(formatShortcutForDisplay("", true)).toBe("⌥ + ⌘ + L");

      // Manifest & browser strings on Mac
      expect(formatShortcutForDisplay("Alt+Command+L", true)).toBe("⌥ + ⌘ + L");
      expect(formatShortcutForDisplay("Option+Command+L", true)).toBe("⌥ + ⌘ + L");
      expect(formatShortcutForDisplay("Ctrl+Alt+L", true)).toBe("⌥ + ⌘ + L");
      expect(formatShortcutForDisplay("Command+Shift+L", true)).toBe("⇧ + ⌘ + L");
      expect(formatShortcutForDisplay("MacCtrl+Option+L", true)).toBe("⌃ + ⌥ + L");
    });

    it("should format shortcuts cleanly on Windows/Linux", () => {
      const { formatShortcutForDisplay } = require("../options/options.js");

      // Default/fallback
      expect(formatShortcutForDisplay(null, false)).toBe("Ctrl + Alt + L");
      expect(formatShortcutForDisplay("", false)).toBe("Ctrl + Alt + L");

      // Modifiers
      expect(formatShortcutForDisplay("Ctrl+Alt+L", false)).toBe("Ctrl + Alt + L");
      expect(formatShortcutForDisplay("Ctrl+Shift+K", false)).toBe("Ctrl + Shift + K");
    });
  });

  describe("Cross-Window Drag & Tab Attachment", () => {
    it("should re-apply locked state to TST immediately and via retries when a locked tab is attached to a window", async () => {
      const bg = require("../background.js");
      await Promise.resolve();

      const tabId = 999;
      bg.lockedTabs.add(tabId);

      expect(tabAttachedCallback).toBeDefined();
      mockSendMessage.mockClear();

      await tabAttachedCallback(tabId, { newWindowId: 42, newPosition: 1 });

      // Immediate call
      expect(mockSendMessage).toHaveBeenCalledWith("treestyletab@piro.sakura.ne.jp", {
        type: "add-tab-state",
        tab: tabId,
        state: "locked"
      });

      // Advance timers for retries
      mockSendMessage.mockClear();
      jest.advanceTimersByTime(300);
      expect(mockSendMessage).toHaveBeenCalledWith("treestyletab@piro.sakura.ne.jp", {
        type: "add-tab-state",
        tab: tabId,
        state: "locked"
      });

      mockSendMessage.mockClear();
      jest.advanceTimersByTime(350);
      expect(mockSendMessage).toHaveBeenCalledWith("treestyletab@piro.sakura.ne.jp", {
        type: "add-tab-state",
        tab: tabId,
        state: "locked"
      });
    });

    it("should ignore onAttached if the attached tab is not locked", async () => {
      const bg = require("../background.js");
      await Promise.resolve();

      const tabId = 888;
      expect(bg.lockedTabs.has(tabId)).toBe(false);
      mockSendMessage.mockClear();

      await tabAttachedCallback(tabId, { newWindowId: 10, newPosition: 0 });
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it("should re-apply locked state if a restored/created tab carries locked session state", async () => {
      const bg = require("../background.js");
      await Promise.resolve();

      const tabId = 777;
      mockGetTabValue.mockImplementation(async (id, key) => {
        if (id === tabId && key === "locked") return true;
        return false;
      });

      mockSendMessage.mockClear();
      expect(tabCreatedCallback).toBeDefined();

      await tabCreatedCallback({ id: tabId });

      expect(bg.lockedTabs.has(tabId)).toBe(true);
      expect(mockSendMessage).toHaveBeenCalledWith("treestyletab@piro.sakura.ne.jp", {
        type: "add-tab-state",
        tab: tabId,
        state: "locked"
      });
    });
  });
});



