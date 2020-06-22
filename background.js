const kTST_ID = 'treestyletab@piro.sakura.ne.jp';

function registerSelfToTST() {
  browser.runtime.sendMessage(kTST_ID, {
    type: 'register-self',
    name: 'TST-Lock',
    icons: browser.runtime.getManifest().icons,
    listeningTypes: ['tab-mousedown', 'tab-mouseup'],
    style: `
      .tab.locked .closebox {
        pointer-events: none !important;
      }
      .tab:not(.faviconized).locked .closebox::after {
        background: none;
        /* https://www.compart.com/en/unicode/U+1F512#UNC_DB */
        content: "🔒";
        line-height: 1;
        mask: none;
      }
    `
  });
}
registerSelfToTST(); 

const lockedTabs = new Set();

browser.runtime.onMessageExternal.addListener((message, sender) => {
  const locked = message.tab && lockedTabs.has(message.tab.id);
  switch (message.type) {
    case 'tab-mousedown':
      if (message.button == 0 &&
          message.ctrlKey &&
          message.shiftKey) {
        browser.runtime.sendMessage(kTST_ID, {
          type:  locked ? 'remove-tab-state' : 'add-tab-state',
          tab:   message.tab.id,
          state: 'locked'
        });
        if (locked) {
          console.log("TST-Lock: Unlocking tab " + message.tab.id + ": Size before = " + lockedTabs.size);
          lockedTabs.delete(message.tab.id);
          browser.sessions.removeTabValue(message.tab.id, 'locked');
        }
        else {
          console.log("TST-Lock: Locking tab " + message.tab.id + ": Size before = " + lockedTabs.size);
          lockedTabs.add(message.tab.id);
          browser.sessions.setTabValue(message.tab.id, 'locked', true);
        }
        // Please remind that this cancels TST's default behavior for the action.
        return Promise.resolve(true);
      }
      break;

    case 'tab-mouseup':
      if (locked && message.button == 1) {
        // Prevent to close the tab by middle click
        return Promise.resolve(true);
      }
      break;

    case 'ready':
      console.log("TST-Lock: INIT - Calling registerSelfToTST()");
      registerSelfToTST();
      console.log("TST-Lock: INIT - Calling loadStoredLockStates()");
      loadStoredLockStates();
      break;
  }
});

browser.tabs.onRemoved.addListener(async (tabId, removeInfo = {}) => {
  if (removeInfo.isWindowClosing)
    return;
  if (!lockedTabs.has(tabId)) {
    lockedTabs.delete(tabId);
    return;
  }
  // wait until the tab is closed completely
  await new Promise(resolve => setTimeout(resolve, 100));
  // and undo close tab
  const sessions = await browser.sessions.getRecentlyClosed({ maxResults: 1 });
  if (sessions.length && sessions[0].tab)
    browser.sessions.restore(sessions[0].tab.sessionId);
});

function loadStoredLockStates() {
  browser.tabs.query({}).then(tabs => {
    for (const tab of tabs) {
      browser.sessions.getTabValue(tab.id, 'locked').then(locked => {
        if (!locked)
          return;
        browser.runtime.sendMessage(kTST_ID, {
          type:  'add-tab-state',
          tab:   tab.id,
          state: 'locked'
        });
        console.log("TST-Lock: INIT - Adding tab " + tab.id + " to lockedTabs (Size before = " + lockedTabs.size + ")");
        lockedTabs.add(tab.id);
      });
    }
  });
}