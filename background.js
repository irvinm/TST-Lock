"use strict";

const kTST_ID = "treestyletab@piro.sakura.ne.jp";
let shutdownWatchPromise = null;

let isRegistering = false;

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
              registerSelfToTST();
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

if (typeof browser !== "undefined" && browser.storage && browser.storage.onChanged) {
  browser.storage.onChanged.addListener((changes) => {
    if (changes && changes.iconConfig) {
      currentIconConfig = changes.iconConfig.newValue || DEFAULT_ICON_CONFIG;
      console.log("TST-Lock: Icon configuration changed, updating TST styles");
      registerSelfToTST();
    }
  });
}

async function registerSelfToTST() {
  if (isRegistering) {
    return;
  }
  isRegistering = true;
  try {
    console.log("TST-Lock: Sending register-self message to TST");
    const result = await browser.runtime.sendMessage(kTST_ID, {
      type: "register-self",
      name: "TST-Lock",
      icons: browser.runtime.getManifest().icons,
      listeningTypes: ["tab-mousedown", "tab-mouseup", "ready", "wait-for-shutdown"],
      style: buildTSTStyle(currentIconConfig),
    });

    if (!result) {
      console.log("TST-Lock: TST is starting up (not initialized yet). Waiting for 'ready' event.");
      return;
    }

    console.log("TST-Lock: Successfully registered with TST");

    // Load stored locks immediately upon successful registration
    loadStoredLockStates().catch((error) => {
      console.log("TST-Lock: Error loading stored lock states: " + error);
    });

    // Establish shutdown monitoring
    monitorTSTShutdown();

  } catch (_error) {
    console.log("TST-Lock: TST is not available yet. Waiting for TST 'ready' event.");
  } finally {
    isRegistering = false;
  }
}
registerSelfToTST();

async function uninitFeaturesForTST() {
  // Put codes to deactivate special features for TST here.
  console.log("TST-Lock: Inside uninitFeaturesForTST()");
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
      uninitFeaturesForTST();
    })
    .catch((error) => {
      console.log("TST-Lock: wait-for-shutdown promise rejected/disconnected: " + error);
      uninitFeaturesForTST();
    })
    .finally(() => {
      shutdownWatchPromise = null;
    });
}

const lockedTabs = new Set();
let locksLoaded = false;
browser.browserAction.setBadgeBackgroundColor({'color': 'green'});
browser.browserAction.setBadgeText({text: lockedTabs.size.toString()});

browser.runtime.onMessageExternal.addListener((message, sender) => {
  if (sender && sender.id && sender.id !== kTST_ID) {
    console.warn(`TST-Lock: Ignored external message from unauthorized sender: ${sender.id}`);
    return;
  }

  const locked = message.tab && lockedTabs.has(message.tab.id);

  switch (message.type) {
    case "tab-mousedown":
      if (message.button == 0 && message.ctrlKey && message.shiftKey) {
        if (!message.tab || typeof message.tab.id === "undefined") {
          console.warn("TST-Lock: Received tab-mousedown without a valid tab target:", message);
          return;
        }

        browser.runtime.sendMessage(kTST_ID, {
          type: locked ? "remove-tab-state" : "add-tab-state",
          tab: message.tab.id,
          state: "locked",
        }).catch((err) => {
          console.warn(`TST-Lock: Failed to update tab state in TST for tab ${message.tab.id}:`, err);
        });

        if (locked) {
          console.log(`TST-Lock: Unlocking tab ${message.tab.id}: Size before = ${lockedTabs.size}`);
          lockedTabs.delete(message.tab.id);
          browser.browserAction.setBadgeText({text: lockedTabs.size.toString()});
          browser.sessions.removeTabValue(message.tab.id, "locked").catch((err) => {
            console.warn(`TST-Lock: Failed to remove lock session state for tab ${message.tab.id}:`, err);
          });
        } else {
          console.log(`TST-Lock: Locking tab ${message.tab.id}: Size before = ${lockedTabs.size}`);
          lockedTabs.add(message.tab.id);
          browser.browserAction.setBadgeText({text: lockedTabs.size.toString()});
          browser.sessions.setTabValue(message.tab.id, "locked", true).catch((err) => {
            console.warn(`TST-Lock: Failed to persist lock session state for tab ${message.tab.id}:`, err);
          });
        }
        return Promise.resolve(true);
      }
      break;

    case "tab-mouseup":
      if (locked && message.button == 1) {
        console.log(`TST-Lock: Blocked middle-click close attempt on locked tab ${message.tab.id}`);
        return Promise.resolve(true);
      }
      break;

    case "ready":
      console.log("TST-Lock: Received 'ready' event from TST");
      locksLoaded = false; 
      registerSelfToTST();
      break;

    case "wait-for-shutdown":
      return new Promise((resolve) => {
        window.addEventListener("beforeunload", () => resolve(true));
      });
  }
});

// Clean up memory when a tab is closed
browser.tabs.onRemoved.addListener(async (tabId, removeInfo = {}) => {
  if (removeInfo.isWindowClosing) return;
  if (lockedTabs.has(tabId)) {
    console.log(`TST-Lock: Closed locked tab ${tabId}: Size before = ${lockedTabs.size}`);
    lockedTabs.delete(tabId);
    // Update badge when a locked tab is closed
    browser.browserAction.setBadgeText({text: lockedTabs.size.toString()});
  }
});

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
    DEFAULT_ICON_CONFIG
  };
}