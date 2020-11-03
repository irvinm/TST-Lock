"use strict";

const kTST_ID = "treestyletab@piro.sakura.ne.jp";
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

async function registerSelfToTST() {
  try {
    console.log("TST-Lock: Sending register-self message to TST");
    const result = await browser.runtime.sendMessage(kTST_ID, {
      type: "register-self",
      name: "TST-Lock",
      icons: browser.runtime.getManifest().icons,
      listeningTypes: ["tab-mousedown", "tab-mouseup", "wait-for-shutdown"],
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
}

/*
   If you send a message with the type wait-for-shutdown, TST simply returns a promised value 
   it will be resolved after TST is disabled. However, please note that the promise is never 
   been resolved. The promise will be rejected when TST becomes disabled or uninstalled. 
   So you can do uninitialize your addon when the promise is rejected. 
*/
async function waitForTSTShutdown() {
  console.log("TST-Lock: Establishing waitForTSTShutdown()");
  try {
    // https://github.com/piroor/treestyletab/wiki/API-for-other-addons#wait-for-shutdown-type-message
    await browser.runtime.sendMessage(kTST_ID, { type: "wait-for-shutdown" });
  } catch (error) {
    console.log("TST-Lock: " + error);

    // Extension was disabled before message was sent
    if (
      error.message.startsWith(
        "Could not establish connection. Receiving end does not exist."
      )
    ) {
      console.log(
        "TST-Lock: Error -> TST was disabled before message was sent"
      );
      return true;
    }
    // Extension was disabled while we waited
    if (error.message.startsWith("Message manager disconnected")) {
      console.log("TST-Lock: Error -> TST was disabled while we waited");
      return true;
    }
    // Probably an internal Tree Style Tab error
    console.log("TST-Lock: Error -> Probably an internal Tree Style Tab error");
    throw error;
  }
}
waitForTSTShutdown().then(uninitFeaturesForTST);

const lockedTabs = new Set();

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
          browser.sessions.removeTabValue(message.tab.id, "locked");
        } else {
          console.log(
            "TST-Lock: Locking tab " +
              message.tab.id +
              ": Size before = " +
              lockedTabs.size
          );
          lockedTabs.add(message.tab.id);
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
      registerSelfToTST();
      loadStoredLockStates();
      break;

    // Triggers teardown process for this addon on TST side.
    // https://github.com/piroor/treestyletab/wiki/API-for-other-addons#unregister-from-tst
    case "wait-for-shutdown":
      loadStoredLockStates();
      return new Promise(() => {});
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
  console.log("TST-Lock: Inside loadStoredLockStates");
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
      });
    }
  });
}