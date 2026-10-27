"use strict";

const kTST_ID = "treestyletab@piro.sakura.ne.jp";
let shutdownWatchPromise = null;

let isRegistering = false;

const extensionVersion = (typeof browser !== "undefined" && browser.runtime && typeof browser.runtime.getManifest === "function" && browser.runtime.getManifest())
  ? (browser.runtime.getManifest().version || "unknown")
  : "unknown";
console.log(`TST-Lock: Background script loaded (version: ${extensionVersion})`);

const DEFAULT_ICON_CONFIG = {
  type: "emoji",
  value: "🔒",
  size: 16,
  visibility: "always"
};

let currentIconConfig = { ...DEFAULT_ICON_CONFIG };
let iconConfigLoaded = false;

function sanitizeEmoji(val) {
  if (typeof val !== "string") return "🔒";
  const clean = val.trim().replace(/["\\\r\n]/g, "");
  if (!clean) return "🔒";
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const graphemes = Array.from(segmenter.segment(clean), s => s.segment);
    if (graphemes.length === 0) return "🔒";
    return graphemes[0];
  }
  const graphemes = Array.from(clean);
  if (graphemes.length === 0) return "🔒";
  return graphemes[0];
}

function buildTSTStyle(iconConfig) {
  const size = (iconConfig && typeof iconConfig.size === "number" && iconConfig.size >= 10 && iconConfig.size <= 32)
    ? iconConfig.size
    : 16;
  const visibility = (iconConfig && iconConfig.visibility === "hover") ? "hover" : "always";
  const baseOpacity = visibility === "hover" ? 0 : 1;
  const hoverRule = visibility === "hover" ? `
      .tab.locked:hover .closebox,
      tab-item.locked:hover tab-closebox {
        opacity: 1 !important;
        transition: none !important;
        transition-delay: 0s !important;
      }
  ` : "";
  const imageSize = Math.max(10, Math.round(size * 0.94));
  const translateY = -Math.round((size * 0.09) * 10) / 10;
  const boxDimension = Math.max(20, size + 4);

  let contentStyle;
  if (iconConfig && iconConfig.type === "bundled") {
    const allowedImages = [
      "images/lock(24x24).png",
      "images/Actions-document-encrypt-icon.png",
      "images/Secure24.png",
      "images/lock-icon.png",
      "images/lock.png"
    ];
    const imagePath = allowedImages.includes(iconConfig.value)
      ? iconConfig.value
      : "images/lock(24x24).png";
    const imageUrl = (browser.runtime && browser.runtime.getURL)
      ? browser.runtime.getURL(imagePath)
      : imagePath;
    contentStyle = `
        background: none !important;
        content: "" !important;
        display: inline-block !important;
        width: ${imageSize}px !important;
        height: ${imageSize}px !important;
        background-image: url("${imageUrl}") !important;
        background-size: contain !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        transform: translateY(-0.5px) !important;
        mask: none !important;
    `;
  } else {
    const emoji = sanitizeEmoji(iconConfig ? iconConfig.value : "🔒");
    contentStyle = `
        background: none !important;
        content: "${emoji}";
        font-size: ${size}px !important;
        line-height: 1 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        transform: translateY(${translateY}px) !important;
        mask: none;
    `;
  }

  return `
      .tab.locked .closebox,
      tab-item.locked tab-closebox {
        pointer-events: none !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        align-self: center !important;
        width: ${boxDimension}px !important;
        height: ${boxDimension}px !important;
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        opacity: ${baseOpacity} !important;
        transition: none !important;
        transition-delay: 0s !important;
      }
      ${hoverRule}
      .tab:not(.faviconized).locked .closebox::after,
      tab-item:not(.faviconized).locked tab-closebox::after {
        ${contentStyle}
      }
  `;
}

function loadIconConfig() {
  if (typeof browser !== "undefined" && browser.storage) {
    const storageArea = browser.storage.sync || browser.storage.local;
    if (storageArea && typeof storageArea.get === "function") {
      storageArea.get({ iconConfig: DEFAULT_ICON_CONFIG })
        .then((stored) => {
          if (stored && stored.iconConfig) {
            const hasChanged = stored.iconConfig.type !== currentIconConfig.type ||
                               stored.iconConfig.value !== currentIconConfig.value ||
                               stored.iconConfig.size !== currentIconConfig.size ||
                               stored.iconConfig.visibility !== currentIconConfig.visibility;
            currentIconConfig = stored.iconConfig;
            if (hasChanged) {
              console.log("TST-Lock: Loaded new icon config from storage, re-registering with TST");
              registerSelfToTST("icon-config-loaded");
            }
          }
        })
        .catch((err) => {
          console.log("TST-Lock: Error loading icon config from storage: " + err);
        });
    }
  }
}
loadIconConfig();

const DEFAULT_MOUSE_SHORTCUT = {
  ctrl: true,
  shift: true,
  alt: false,
  disabled: false
};
let currentMouseShortcut = { ...DEFAULT_MOUSE_SHORTCUT };

function normalizeMouseShortcut(stored) {
  if (typeof stored === "string") {
    switch (stored) {
      case "alt":
        return { ctrl: false, shift: false, alt: true, disabled: false };
      case "altShift":
        return { ctrl: false, shift: true, alt: true, disabled: false };
      case "ctrlAlt":
        return { ctrl: true, shift: false, alt: true, disabled: false };
      case "disabled":
        return { ctrl: false, shift: false, alt: false, disabled: true };
      case "ctrlShift":
      default:
        return { ctrl: true, shift: true, alt: false, disabled: false };
    }
  }
  if (stored && typeof stored === "object") {
    return {
      ctrl: Boolean(stored.ctrl),
      shift: Boolean(stored.shift),
      alt: Boolean(stored.alt),
      disabled: Boolean(stored.disabled)
    };
  }
  return { ...DEFAULT_MOUSE_SHORTCUT };
}

function isMouseShortcutMatch(message, shortcutSetting = currentMouseShortcut) {
  if (!message || message.button !== 0) {
    return false;
  }
  const config = normalizeMouseShortcut(shortcutSetting);
  if (config.disabled) {
    return false;
  }
  if (!config.ctrl && !config.shift && !config.alt) {
    return false;
  }

  const isCtrlOrMeta = Boolean(message.ctrlKey || message.metaKey);
  const isShift = Boolean(message.shiftKey);
  const isAlt = Boolean(message.altKey);

  return (
    isCtrlOrMeta === config.ctrl &&
    isShift === config.shift &&
    isAlt === config.alt
  );
}

function loadMouseShortcutConfig() {
  if (typeof browser !== "undefined" && browser.storage) {
    const storageArea = browser.storage.sync || browser.storage.local;
    if (storageArea && typeof storageArea.get === "function") {
      storageArea.get({ mouseShortcut: DEFAULT_MOUSE_SHORTCUT })
        .then((stored) => {
          if (stored && stored.mouseShortcut) {
            currentMouseShortcut = normalizeMouseShortcut(stored.mouseShortcut);
            console.log("TST-Lock: Loaded mouse shortcut configuration:", currentMouseShortcut);
          }
        })
        .catch((err) => {
          console.warn("TST-Lock: Error loading mouse shortcut config: " + err);
        });
    }
  }
}
loadMouseShortcutConfig();

if (typeof browser !== "undefined" && browser.storage && browser.storage.onChanged) {
  browser.storage.onChanged.addListener((changes) => {
    if (changes && changes.iconConfig) {
      currentIconConfig = changes.iconConfig.newValue || DEFAULT_ICON_CONFIG;
      console.log("TST-Lock: Icon configuration changed in storage, updating TST styles");
      registerSelfToTST("icon-config-changed");
    }
    if (changes && changes.mouseShortcut) {
      currentMouseShortcut = normalizeMouseShortcut(changes.mouseShortcut.newValue);
      console.log("TST-Lock: Mouse shortcut configuration changed in storage:", currentMouseShortcut);
    }
  });
}

async function registerSelfToTST(reason = "startup") {
  if (isRegistering) {
    console.log(`TST-Lock: Registration already in progress, skipping duplicate request (trigger: ${reason})`);
    return;
  }
  isRegistering = true;
  try {
    console.log(`TST-Lock: Sending register-self message to TST (trigger: ${reason})`);
    const result = await browser.runtime.sendMessage(kTST_ID, {
      type: "register-self",
      name: "TST-Lock",
      icons: browser.runtime.getManifest().icons,
      listeningTypes: ["tab-mousedown", "tab-mouseup", "ready", "wait-for-shutdown"],
      style: buildTSTStyle(currentIconConfig),
    });

    if (!result) {
      console.log(`TST-Lock: TST is starting up (not initialized yet). Waiting for 'ready' event. (trigger: ${reason})`);
      return;
    }

    console.log(`TST-Lock: Successfully registered with TST (trigger: ${reason})`);

    // Load stored locks immediately upon successful registration
    loadStoredLockStates().catch((error) => {
      console.log("TST-Lock: Error loading stored lock states: " + error);
    });

    // Establish shutdown monitoring
    monitorTSTShutdown();

  } catch (error) {
    console.log(`TST-Lock: TST is not available yet (${error && error.message ? error.message : error}). Waiting for TST 'ready' event. (trigger: ${reason})`);
  } finally {
    isRegistering = false;
  }
}
registerSelfToTST("startup");

async function uninitFeaturesForTST(reason = "unknown") {
  // Put codes to deactivate special features for TST here.
  console.log(`TST-Lock: Inside uninitFeaturesForTST() (reason: ${reason})`);
  locksLoaded = false;
}

function monitorTSTShutdown() {
  if (shutdownWatchPromise) {
    return;
  }
  console.log("TST-Lock: Establishing monitorTSTShutdown()");
  shutdownWatchPromise = browser.runtime.sendMessage(kTST_ID, { type: "wait-for-shutdown" })
    .then((result) => {
      console.log("TST-Lock: wait-for-shutdown resolved with:", result);
      uninitFeaturesForTST("tst-shutdown-detected");
    })
    .catch((error) => {
      console.log("TST-Lock: wait-for-shutdown promise rejected/disconnected: " + error);
      uninitFeaturesForTST("tst-connection-lost");
    })
    .finally(() => {
      shutdownWatchPromise = null;
    });
}

const lockedTabs = new Set();
let locksLoaded = false;
browser.browserAction.setBadgeBackgroundColor({'color': 'green'});
browser.browserAction.setBadgeText({text: lockedTabs.size.toString()});

if (typeof browser !== "undefined" && browser.runtime && browser.runtime.onInstalled && browser.runtime.onInstalled.addListener) {
  browser.runtime.onInstalled.addListener(async (details) => {
    try {
      console.log(`TST-Lock: onInstalled event received (reason: ${details && details.reason}, previousVersion: ${details && details.previousVersion})`);
      const manifest = browser.runtime.getManifest ? browser.runtime.getManifest() : null;
      const currentVersion = manifest ? manifest.version : null;

      if (details && details.reason === "update") {
        let hasSeenUpdatePage = false;
        let lastSeenVersion = null;
        if (browser.storage && browser.storage.local) {
          const stored = await browser.storage.local.get(["hasSeenUpdatePage", "lastSeenVersion"]);
          hasSeenUpdatePage = stored ? Boolean(stored.hasSeenUpdatePage) : false;
          lastSeenVersion = stored ? stored.lastSeenVersion : null;
        }

        const alreadyShown = hasSeenUpdatePage || (lastSeenVersion && lastSeenVersion === currentVersion);

        if (!alreadyShown && currentVersion) {
          if (browser.storage && browser.storage.local) {
            await browser.storage.local.set({ hasSeenUpdatePage: true, lastSeenVersion: currentVersion });
          }
          if (browser.tabs && browser.tabs.create) {
            const url = (browser.runtime && browser.runtime.getURL)
              ? browser.runtime.getURL("options/update.html")
              : "options/update.html";
            await browser.tabs.create({ url });
          }
        } else if (browser.storage && browser.storage.local && currentVersion && lastSeenVersion !== currentVersion) {
          await browser.storage.local.set({ lastSeenVersion: currentVersion });
        }
      } else if (details && details.reason === "install") {
        if (browser.storage && browser.storage.local && currentVersion) {
          await browser.storage.local.set({ hasSeenUpdatePage: true, lastSeenVersion: currentVersion });
        }
      }
    } catch (e) {
      console.warn("TST-Lock: Failed in onInstalled handler:", e);
    }
  });
}

async function toggleTabsLock(tabIds, forceState = null) {
  const validIds = (Array.isArray(tabIds) ? tabIds : [tabIds]).filter(id => typeof id !== "undefined" && id !== null);
  if (validIds.length === 0) {
    console.warn("TST-Lock: toggleTabsLock called without a valid tab target");
    return false;
  }

  // If any tab is currently unlocked, lock all; otherwise unlock all
  const anyUnlocked = validIds.some(id => !lockedTabs.has(id));
  const nextLocked = (typeof forceState === "boolean") ? forceState : anyUnlocked;

  for (const tabId of validIds) {
    browser.runtime.sendMessage(kTST_ID, {
      type: nextLocked ? "add-tab-state" : "remove-tab-state",
      tab: tabId,
      state: "locked",
    }).catch((err) => {
      console.warn(`TST-Lock: Failed to update tab state in TST for tab ${tabId}:`, err);
    });

    if (nextLocked) {
      console.log(`TST-Lock: Locking tab ${tabId}: Size before = ${lockedTabs.size}`);
      lockedTabs.add(tabId);
      try {
        await browser.sessions.setTabValue(tabId, "locked", true);
      } catch (err) {
        console.warn(`TST-Lock: Failed to persist lock session state for tab ${tabId}:`, err);
      }
    } else {
      console.log(`TST-Lock: Unlocking tab ${tabId}: Size before = ${lockedTabs.size}`);
      lockedTabs.delete(tabId);
      try {
        await browser.sessions.removeTabValue(tabId, "locked");
      } catch (err) {
        console.warn(`TST-Lock: Failed to remove lock session state for tab ${tabId}:`, err);
      }
    }
  }

  browser.browserAction.setBadgeText({ text: lockedTabs.size.toString() });
  return nextLocked;
}

async function toggleTabLock(tabId) {
  return toggleTabsLock([tabId]);
}

const CONTEXT_MENU_ID = "tst-lock-toggle";

function initContextMenu() {
  if (typeof browser !== "undefined" && browser.menus && browser.menus.create) {
    browser.menus.create({
      id: CONTEXT_MENU_ID,
      title: "Lock Tab",
      contexts: ["tab"],
      icons: { "16": "images/lock.png" }
    }, () => {
      if (browser.runtime && browser.runtime.lastError) {
        // Ignore duplicate menu item creation if already created
      }
    });
  }
}
initContextMenu();

if (typeof browser !== "undefined" && browser.menus) {
  if (browser.menus.onShown && browser.menus.onShown.addListener) {
    browser.menus.onShown.addListener(async (info, tab) => {
      if (info && info.contexts && info.contexts.includes("tab") && tab && typeof tab.id !== "undefined") {
        try {
          let menuTitle = "Lock Tab";
          let isBatch = false;

          if (browser.tabs && browser.tabs.query) {
            const highlighted = await browser.tabs.query({ highlighted: true, currentWindow: true });
            const highlightedIds = (highlighted || []).map((t) => t.id).filter((id) => typeof id !== "undefined");
            if (highlightedIds.length > 1 && highlightedIds.includes(tab.id)) {
              isBatch = true;
              const anyUnlocked = highlightedIds.some((id) => !lockedTabs.has(id));
              menuTitle = anyUnlocked ? `Lock ${highlightedIds.length} Tabs` : `Unlock ${highlightedIds.length} Tabs`;
            }
          }

          if (!isBatch) {
            const isLocked = lockedTabs.has(tab.id);
            menuTitle = isLocked ? "Unlock Tab" : "Lock Tab";
          }

          await browser.menus.update(CONTEXT_MENU_ID, {
            title: menuTitle
          });
          if (typeof browser.menus.refresh === "function") {
            browser.menus.refresh();
          }
        } catch (err) {
          console.warn("TST-Lock: Failed to update context menu item:", err);
        }
      }
    });
  }

  if (browser.menus.onClicked && browser.menus.onClicked.addListener) {
    browser.menus.onClicked.addListener(async (info, tab) => {
      if (info && info.menuItemId === CONTEXT_MENU_ID && tab && typeof tab.id !== "undefined") {
        console.log(`TST-Lock: Context menu 'Lock/Unlock Tab' clicked for tab ${tab.id}`);
        try {
          if (browser.tabs && browser.tabs.query) {
            const highlighted = await browser.tabs.query({ highlighted: true, currentWindow: true });
            const highlightedIds = (highlighted || []).map((t) => t.id).filter((id) => typeof id !== "undefined");
            if (highlightedIds.length > 1 && highlightedIds.includes(tab.id)) {
              console.log(`TST-Lock: Batch toggling ${highlightedIds.length} highlighted tabs via context menu`);
              await toggleTabsLock(highlightedIds);
              return;
            }
          }
        } catch (_err) {
          // Fall through to single tab toggle
        }
        await toggleTabLock(tab.id);
      }
    });
  }
}

if (typeof browser !== "undefined" && browser.commands && browser.commands.onCommand && browser.commands.onCommand.addListener) {
  browser.commands.onCommand.addListener(async (command) => {
    console.log(`TST-Lock: Keyboard shortcut command triggered: ${command}`);
    if (command === "toggle-tab-lock") {
      try {
        let targetTabs = [];
        if (browser.tabs && browser.tabs.query) {
          targetTabs = await browser.tabs.query({ highlighted: true, currentWindow: true });
          if (!targetTabs || targetTabs.length === 0) {
            targetTabs = await browser.tabs.query({ active: true, currentWindow: true });
          }
        }
        const tabIds = (targetTabs || []).map((t) => t.id).filter((id) => typeof id !== "undefined");
        if (tabIds.length > 0) {
          await toggleTabsLock(tabIds);
        }
      } catch (err) {
        console.warn("TST-Lock: Failed to toggle tab lock via keyboard command:", err);
      }
    }
  });
}

browser.runtime.onMessageExternal.addListener((message, sender) => {
  if (sender && sender.id && sender.id !== kTST_ID) {
    console.warn(`TST-Lock: Ignored external message from unauthorized sender: ${sender.id}`);
    return;
  }

  const locked = message.tab && lockedTabs.has(message.tab.id);

  switch (message.type) {
    case "tab-mousedown":
      if (isMouseShortcutMatch(message, currentMouseShortcut)) {
        if (!message.tab || typeof message.tab.id === "undefined") {
          console.warn("TST-Lock: Received tab-mousedown without a valid tab target:", message);
          return;
        }

        return (async () => {
          try {
            if (browser.tabs && browser.tabs.query) {
              const highlighted = await browser.tabs.query({ highlighted: true, currentWindow: true });
              const highlightedIds = (highlighted || []).map((t) => t.id).filter((id) => typeof id !== "undefined");
              if (highlightedIds.length > 1 && highlightedIds.includes(message.tab.id)) {
                console.log(`TST-Lock: Batch toggling ${highlightedIds.length} highlighted tabs via mouse shortcut`);
                await toggleTabsLock(highlightedIds);
                return true;
              }
            }
          } catch (_err) {
            // Fall through to single tab toggle
          }
          await toggleTabLock(message.tab.id);
          return true;
        })();
      }
      break;

    case "tab-mouseup":
      if (locked && message.button == 1) {
        console.log(`TST-Lock: Blocked middle-click close attempt on locked tab ${message.tab.id}`);
        return Promise.resolve(true);
      }
      break;

    case "ready":
      console.log("TST-Lock: Received 'ready' event from TST. Triggering re-registration...");
      locksLoaded = false; 
      registerSelfToTST("tst-ready-event");
      break;

    case "wait-for-shutdown":
      return new Promise((resolve) => {
        window.addEventListener("beforeunload", () => resolve(true));
      });
  }
});

// Clean up memory when a tab is closed
if (typeof browser !== "undefined" && browser.tabs && browser.tabs.onRemoved && browser.tabs.onRemoved.addListener) {
  browser.tabs.onRemoved.addListener(async (tabId, removeInfo = {}) => {
    if (removeInfo && removeInfo.isWindowClosing) return;
    if (lockedTabs.has(tabId)) {
      console.log(`TST-Lock: Closed locked tab ${tabId}: Size before = ${lockedTabs.size}`);
      lockedTabs.delete(tabId);
      // Update badge when a locked tab is closed
      if (browser.browserAction && browser.browserAction.setBadgeText) {
        browser.browserAction.setBadgeText({text: lockedTabs.size.toString()});
      }
    }
  });
}

// Re-apply lock state when a tab is dragged/moved across windows
async function handleTabAttached(tabId, attachInfo = {}) {
  if (typeof tabId === "undefined" || tabId === null) return;
  try {
    const isLocked = lockedTabs.has(tabId) ||
      (typeof browser !== "undefined" && browser.sessions && browser.sessions.getTabValue && await browser.sessions.getTabValue(tabId, "locked").catch(() => false));
    if (isLocked) {
      lockedTabs.add(tabId);
      const winId = attachInfo && typeof attachInfo.newWindowId !== "undefined" ? attachInfo.newWindowId : "unknown";
      console.log(`TST-Lock: Tab ${tabId} attached to window ${winId}. Re-applying lock state to TST`);

      const reapply = () => {
        if (lockedTabs.has(tabId) && typeof browser !== "undefined" && browser.runtime && browser.runtime.sendMessage) {
          browser.runtime.sendMessage(kTST_ID, {
            type: "add-tab-state",
            tab: tabId,
            state: "locked",
          }).catch((err) => {
            console.warn(`TST-Lock: Failed to reapply tab state to TST for tab ${tabId}:`, err);
          });
        }
      };

      // Immediate attempt
      reapply();

      // Delayed retries to ensure destination window sidebar DOM has mounted the tab item
      setTimeout(reapply, 250);
      setTimeout(reapply, 600);
    }
  } catch (err) {
    console.warn(`TST-Lock: Error handling tab onAttached for tab ${tabId}:`, err);
  }
}

if (typeof browser !== "undefined" && browser.tabs && browser.tabs.onAttached && browser.tabs.onAttached.addListener) {
  browser.tabs.onAttached.addListener(handleTabAttached);
}

// Also detect restored or duplicated tabs that carry forward locked session state
async function handleTabCreated(tab) {
  if (!tab || typeof tab.id === "undefined") return;
  try {
    if (typeof browser !== "undefined" && browser.sessions && browser.sessions.getTabValue) {
      const locked = await browser.sessions.getTabValue(tab.id, "locked").catch(() => false);
      if (locked) {
        lockedTabs.add(tab.id);
        if (browser.browserAction && browser.browserAction.setBadgeText) {
          browser.browserAction.setBadgeText({ text: lockedTabs.size.toString() });
        }
        console.log(`TST-Lock: Tab ${tab.id} created with locked session state. Applying lock state to TST`);
        const reapply = () => {
          if (lockedTabs.has(tab.id) && browser.runtime && browser.runtime.sendMessage) {
            browser.runtime.sendMessage(kTST_ID, {
              type: "add-tab-state",
              tab: tab.id,
              state: "locked",
            }).catch(() => {});
          }
        };
        reapply();
        setTimeout(reapply, 250);
        setTimeout(reapply, 600);
      }
    }
  } catch (err) {
    console.warn(`TST-Lock: Error handling tab onCreated for tab ${tab.id}:`, err);
  }
}

if (typeof browser !== "undefined" && browser.tabs && browser.tabs.onCreated && browser.tabs.onCreated.addListener) {
  browser.tabs.onCreated.addListener(handleTabCreated);
}

let isLoadingLocks = false;

async function loadStoredLockStates() {
  if (locksLoaded || isLoadingLocks) {
    console.log("TST-Lock: loadStoredLockStates - Locks already loaded, skipping");
    return;
  }
  
  console.log("TST-Lock: Inside loadStoredLockStates");
  isLoadingLocks = true;
  locksLoaded = true;
  lockedTabs.clear();
  
  try {
    const tabs = await browser.tabs.query({});
    
    // Map tabs to an array of promises for concurrent execution
    const checkPromises = tabs.map(async (tab) => {
      try {
        const locked = await browser.sessions.getTabValue(tab.id, "locked");
        if (locked) {
          // Tell TST the tab is locked (don't await this, let it happen in background)
          browser.runtime.sendMessage(kTST_ID, {
            type: "add-tab-state",
            tab: tab.id,
            state: "locked",
          }).catch(() => {});
          
          lockedTabs.add(tab.id);
        }
      } catch (e) {
        // Silently ignore restricted tabs (e.g. about: config pages)
      }
    });

    // Wait for all session checks to complete
    await Promise.all(checkPromises);
    
    // Performance improvement: Update the UI badge exactly ONCE
    browser.browserAction.setBadgeText({text: lockedTabs.size.toString()});
    console.log(`TST-Lock: Finished loading locks. Total locked: ${lockedTabs.size}`);
    
  } catch (error) {
    console.log("TST-Lock: Error querying tabs: " + error);
    locksLoaded = false;
  } finally {
    isLoadingLocks = false;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    buildTSTStyle,
    sanitizeEmoji,
    DEFAULT_ICON_CONFIG,
    DEFAULT_MOUSE_SHORTCUT,
    normalizeMouseShortcut,
    isMouseShortcutMatch,
    get currentMouseShortcut() { return currentMouseShortcut; },
    set currentMouseShortcut(val) { currentMouseShortcut = val; },
    toggleTabsLock,
    toggleTabLock,
    handleTabAttached,
    handleTabCreated,
    initContextMenu,
    CONTEXT_MENU_ID,
    lockedTabs
  };
}