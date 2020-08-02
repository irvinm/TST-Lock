const kTST_ID = "treestyletab@piro.sakura.ne.jp";

function registerSelfToTST() {
  var myURL = browser.runtime.getURL("images/lock.png");
  console.log("Lock Url = " + myURL);

  browser.runtime.sendMessage(kTST_ID, {
    type: "register-self",
    name: "TST-Lock",
    icons: browser.runtime.getManifest().icons,
    listeningTypes: ["tab-mousedown", "tab-mouseup"],
    style: `
      .tab.locked .closebox {
        pointer-events: none !important;
      }
      .tab:not(.faviconized).locked .closebox::after {
        background: none;

        /* Works */
        /* https://www.compart.com/en/unicode/U+1F512#UNC_DB */
        /* content: "🔒"; */
        /* content: url("http://icons.iconarchive.com/icons/oxygen-icons.org/oxygen/24/Actions-document-encrypt-icon.png"); */
        /* content: url("http://icons.iconarchive.com/icons/fatcow/farm-fresh/24/lock-icon.png"); */
        /* content: url("moz-extension://32b76189-c6cf-43d0-af5c-e10691134da7/lock.png"); */
        /* content: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAD5ElEQVR42rWWX2gcVRTGv7uzs7Ozs/83m2xIumIKNbErYtq0ogYhvogCiVFTVKm+6EsrFHzy2beAvlgVKiAVsChobcECYiVCrCqlbYymRaPRkm6y22RnN7Ob7Py593oYtEltm8VIv+EwOzPnfj/OOXeGZVJK3E4FgdaaPHko2dk9MLpqzj3809kJ0RT8+3zPzk8f2Xe4jBYKoIUmjh/Upeu8WivNvtlcre1vy6ZfXK3b42bFfG1m8nDb/6rgzOevs+KfxfGGWTyYSkam9Xj+mBpKUFfnx05/8fWhtnS2N3rpxFi+d9jaEqBSmn+wePnXA7v37PpSyNizQ8+8dRUk8cHL71UbztGzZyYe78znnwLw/pZatDD343ChbwfryBfGffO/9ej+I8t9O+9+I6QxvjA7NbTlFrXn4l2ZTIIrwr5hmLnsHYtevbxmrVQSWx7y9p6CkELAti7fkFecv8CkkMzjkm0ZoKi6LTwP3BY1/EtrjlWVIPdAwMEmuumL9tk7I32dXbl9IUUbXaksFPRE+ggLBBcBCUYHGEOpvJA1l5Zeasu0zymqemylZn305CsnL7YEHH97WFNV9VT/4MiQuXARxT9m0FMYhKYnwD0bQrhgBKpbJqbPfYdMKo389h345eepr7iQjz1x4IS96ZC56wzcedfuvcmOAjSjE8nO+xA2EmBM0rM1SO5C8CYCwTDu2fUQFLqvR8LIZNv2Li6WBwBMbgro2NbbrRkZY25mgow4GTOIkucbG8kuXPl9GmurJqTwQAng3IGUHMl02IhG5LaW29TQpRtEA7a9DAgyBsAoyBEBmUAqEUQ8EqdLAU5Qz3XBCRSLJ6CrYa8loFa5Ch4Iwm02wL31fCk5pFpFZWmZTJuQBJScg1NIRr8VB6A1LQHfnC/hhef2wFox/YGuEwTNIgakkwR2fQDnHjhVIKREKmXg6IfTGHy+BeCTU1Ps6ZEHCFAjg40VCLhCQ6W8RADH771HIL9SbkNhEZz+9sqtK2AkSUqlYtFkuhuMFvANFdAjqFoUshkFdyw4tkPhwoGAhIJIWIcRCUU3eq0D1iHR++/t6DErRdTrdb8VGwhQ1FX8NvODPwPG/FuQAmABCcMgoOP0kEcMQP1WLYrrup7LZPNQtSoEd7FRQgC5XDudPUDC38ae5/mgRDIKVVFyADYFuI1GwzJLl+A6LrzrKqBkLYRGreJvTzKlkAQR/kvYqFIFnmsBcG76qWAkAHo6ofUP9rePqUElJiSua1FIC2OpVCRTD6B0Bp+LAAO4YNb52ebH1To/B2BNkv4Z3rUgBShUCsU//5dYXxMYfbd8zfO2/235CyRUGSky0aqyAAAAAElFTkSuQmCC'); */
        /* content: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAB3RJTUUH5AYYDC4WrSU8/QAABBpJREFUeJy1VG1olWUYvu77fd73HLeac0JkzG2G82NsiAxFQ3QaVlMiEvLHwqxICcF/1b8oCn/0QQUZgQhBECKU1Q9XiflDSs3m/FjOo1s6tU1ba2fudM523vd97rsf7znbzj7cDHrg+Xff18d9X89DuMshIkdVrXFd1NbWLVu8tKbO87zSTCbde7Gt7WziUnvH2LpJMaYD37hpc8MLL+18s7K8Yo1jHEdUwcTws9lMR8fl5o8/+uD1c61nEszsiMgEkkkJ8uC7X3lt13Pbnv8keSeJnt5eWGjUoQqPDebPewiu6w3sefuNZ5q//eYoEbGqyl0J8kqeenpL41t73mlO/H4l7EsNGgD+9c7O45l0+q/SsrKq8gVVq60fauWD86i0ZHZq144X6y+cP9dJxKQqMhUBAcB9JSWxLw5+ecGLxxdeu91Nd/qT5z/bu3fblUvtbTkRWLH6kceadu783DVmbl31EnPhbOvXu1/esUWBgn3wOPUMQBvWb2iYX15RfbuvDza0yU/fe/fJK5fa24jIEJEjIuaXn386cmD//ibH8/iPW91av2Ll5kW1tZWqaomIJyUAQA6DH65euO5qz00NIHSxteWrG11dNz3PKWJWMCsZB3BdjrecOH6s50bXrwOZNP2Z7PcWL6pexQSekkBV2ApkSExJX/Jvco2Dtt86TwKA70vGWoTWIgwtwiCQ4dACnZevnXFdg95kH7IaLxaF0JjRm7HqVeFvXInlSyqCWmKjgQWtq3ceXVpMniDGBcsjZoYvVQu4TpSgIF2zLFjb144fWxJ6PbdPNdHs4YjAbn08tuHgh/LD9+1Jc/KWVaIQW9dnm5Y9a5oQzgJYR+UIAcbiSMcQTnSHABRbVqW2v/qEaVy9HataE2EXEdhEaiJLa5fzVrGeWTz7Oz/rD3hxM4R5s05L/0BcFLYgcgrAoRhqSpt5aLif42aI5rqnfa+46IH6muGNrQnsY4ZjotlHTdlQlNKOlqVT3DjnMACCPxhjUWd8GEZWOIdS2DTnMBSEzKDHej+rb5XzIiIH+fI0g7qYtN9F1vUABYgUDnRyfAAKg2F1I7hAQSETB6M2zYhfAEhRVOe7CDMGRFMDTyBSAsV8IBDQP5FkGiGgiITyTAJoSLkQT/kfFvhQJUCjgGq+hwpjOgJGjoI9OzPsUQ4oS6FQTCDI1VqC9R0Q6z05IMcCZAt6JiX4zw4cwfg8/E8OpiEYdTBzAoCmdpB/aKKqCkAChmTdnIOZHVUCk4WSVckBaj6mlItpzJBLIHglWbgmO2Pw/AkCgNQhz0TfNeWTrhoZS9yyx6zVAEoklnEv14akTOQMDUvqaq89lcMVjkYDC4D3HcseaOkMDxXFiEVFiBREmPYCClGV4lkUHjrlv3/0YthKAItC/gWYUiVDPGS12QAAAABJRU5ErkJggg=='); */

        /* Doesn't work */
        /* content: url(myURL); */
        /* content: url(browser.runtime.getURL('/lock.png')); */
        /* content: url(moz-extension://__MSG_@@extension_id__/lock.png); */
        /* content: url(lock.png); */
        /* content: url('/lock.png'); */

        /* Current selction */
        content: "🔒";          
        line-height: 1;
        mask: none;
      }
    `,
  });
}
registerSelfToTST();

const lockedTabs = new Set();

browser.runtime.onMessageExternal.addListener((message, sender) => {
  const locked = message.tab && lockedTabs.has(message.tab.id);
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
      console.log("TST-Lock: INIT - Calling registerSelfToTST()");
      registerSelfToTST();
      console.log("TST-Lock: INIT - Calling loadStoredLockStates()");
      loadStoredLockStates();
      break;
  }
});

browser.tabs.onRemoved.addListener(async (tabId, removeInfo = {}) => {
  if (removeInfo.isWindowClosing) return;
  if (lockedTabs.has(tabId)) {
    lockedTabs.delete(tabId);
    return;
  }

  /* MCI - Original code that appeared to be for dealing with "undo close tab"
  // wait until the tab is closed completely
  await new Promise((resolve) => setTimeout(resolve, 100));
  // and undo close tab
  const sessions = await browser.sessions.getRecentlyClosed({ maxResults: 1 });
  if (sessions.length && sessions[0].tab)
    browser.sessions.restore(sessions[0].tab.sessionId);
*/
});

function loadStoredLockStates() {
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
          "TST-Lock: INIT - Adding tab " +
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
