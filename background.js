"use strict";

const kTST_ID = "treestyletab@piro.sakura.ne.jp";
let shutdownWatchPromise = null;

let isRegistering = false;

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
      style: `
        .tab.locked .closebox {
          pointer-events: none !important;
        }
        .tab:not(.faviconized).locked .closebox::after {
          background: none;
          content: "🔒";          
          line-height: 1;
          mask: none;
        }
      `,
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
      console.log("TST-Lock: Inside ready event - reregister and load locks");
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