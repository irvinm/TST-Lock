"use strict";

const kTST_ID = "treestyletab@piro.sakura.ne.jp";
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

let shutdownWatchPromise = null;

async function registerSelfToTST() {
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
    
    console.log("TST-Lock: Successfully registered with TST");
    
    // Load stored locks immediately upon successful registration
    loadStoredLockStates().catch((error) => {
      console.log("TST-Lock: Error loading stored lock states: " + error);
    });
    
    // Establish shutdown monitoring
    monitorTSTShutdown();

  } catch (_error) {
    console.log(
      "TST-Lock: registerSelfToTST() -> Error: TST is not available yet (" +
        _error +
        ")"
    );
    console.log("TST-Lock: Retrying registerSelfToTST() in 250 ms");
    await sleep(250);
    registerSelfToTST();
  }
}
console.log("TST-Lock: First - Calling registerSelfToTST()");
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
      // Under normal circumstances when TST is running, the promise does not resolve.
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
  const locked = message.tab && lockedTabs.has(message.tab.id);

  switch (message.type) {
    case "tab-mousedown":
      if (message.button == 0 && message.ctrlKey && message.shiftKey) {
        browser.runtime.sendMessage(kTST_ID, {
          type: locked ? "remove-tab-state" : "add-tab-state",
          tab: message.tab.id,
          state: "locked",
        }).catch(() => {}); // Suppress errors if TST messaging fails

        if (locked) {
          console.log(`TST-Lock: Unlocking tab ${message.tab.id}: Size before = ${lockedTabs.size}`);
          lockedTabs.delete(message.tab.id);
          browser.browserAction.setBadgeText({text: lockedTabs.size.toString()});
          browser.sessions.removeTabValue(message.tab.id, "locked").catch(() => {});
        } else {
          console.log(`TST-Lock: Locking tab ${message.tab.id}: Size before = ${lockedTabs.size}`);
          lockedTabs.add(message.tab.id);
          browser.browserAction.setBadgeText({text: lockedTabs.size.toString()});
          browser.sessions.setTabValue(message.tab.id, "locked", true).catch(() => {});
        }
        return Promise.resolve(true);
      }
      break;

    case "tab-mouseup":
      if (locked && message.button == 1) {
        // Prevent closing the tab via middle click
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

async function loadStoredLockStates() {
  if (locksLoaded) {
    console.log("TST-Lock: loadStoredLockStates - Locks already loaded, skipping");
    return;
  }
  
  console.log("TST-Lock: Inside loadStoredLockStates");
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
  }
}