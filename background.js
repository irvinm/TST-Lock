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
    loadStoredLockStates();
    
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
      // If it resolved (e.g. during TST startup when not ready to hold the promise),
      // we do not call uninitFeaturesForTST because TST is still active.
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

  console.log("TST-Lock: Received event -> " + message.type);
  switch (message.type) {
    case "tab-mousedown":
      if (message.button == 0 && message.ctrlKey && message.shiftKey) {
        browser.runtime.sendMessage(kTST_ID, {
          type: locked ? "remove-tab-state" : "add-tab-state",
          tab: message.tab.id,
          state: "locked",
        });
        if (locked) {
          console.log(
            "TST-Lock: Unlocking tab " +
              message.tab.id +
              ": Size before = " +
              lockedTabs.size
          );
          lockedTabs.delete(message.tab.id);
          browser.browserAction.setBadgeText({text: lockedTabs.size.toString()});
          browser.sessions.removeTabValue(message.tab.id, "locked");
        } else {
          console.log(
            "TST-Lock: Locking tab " +
              message.tab.id +
              ": Size before = " +
              lockedTabs.size
          );
          lockedTabs.add(message.tab.id);
          browser.browserAction.setBadgeText({text: lockedTabs.size.toString()});
          browser.sessions.setTabValue(message.tab.id, "locked", true);
        }
        // Please remind that this cancels TST's default behavior for the action.
        return Promise.resolve(true);
      }
      break;

    case "tab-mouseup":
      if (locked && message.button == 1) {
        // Prevent to close the tab by middle click
        return Promise.resolve(true);
      }
      break;

    case "ready":
      // If getting a "ready" message (maybe after TST upgrade) make to sure to reload locks
      console.log("TST-Lock: Inside ready event - reregister and load locks");
      locksLoaded = false; // Reset flag to allow reloading
      registerSelfToTST();
      break;

    // Triggers teardown process for this addon on TST side.
    // https://github.com/piroor/treestyletab/wiki/API-for-other-addons#unregister-from-tst
    case "wait-for-shutdown":
      return new Promise((resolve) => {
        window.addEventListener("beforeunload", () => resolve(true));
      });
  }
});

browser.tabs.onRemoved.addListener(async (tabId, removeInfo = {}) => {
  if (removeInfo.isWindowClosing) return;
  if (lockedTabs.has(tabId)) {
    lockedTabs.delete(tabId);
    return;
  }
});

function loadStoredLockStates() {
  if (locksLoaded) {
    console.log("TST-Lock: loadStoredLockStates - Locks already loaded, skipping");
    return;
  }
  
  console.log("TST-Lock: Inside loadStoredLockStates");
  locksLoaded = true;
  lockedTabs.clear();
  
  browser.tabs.query({}).then((tabs) => {
    for (const tab of tabs) {
      browser.sessions.getTabValue(tab.id, "locked").then((locked) => {
        if (!locked) return;
        browser.runtime.sendMessage(kTST_ID, {
          type: "add-tab-state",
          tab: tab.id,
          state: "locked",
        });
        console.log(
          "TST-Lock: loadStoredLockStates - Adding tab " +
            tab.id +
            " to lockedTabs (Size before = " +
            lockedTabs.size +
            ")"
        );
        lockedTabs.add(tab.id);
        browser.browserAction.setBadgeText({text: lockedTabs.size.toString()});
      });
    }
  });
}