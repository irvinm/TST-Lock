"use strict";

const SUN_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
const MOON_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

let currentPageTheme = "light";
const pageThemeBtn = document.getElementById("page-theme-btn");
const pageThemeIcon = document.getElementById("page-theme-icon");
const openSettingsBtn = document.getElementById("open-settings-btn");
const closeTabBtn = document.getElementById("close-tab-btn");

function applyTheme(theme) {
  currentPageTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", currentPageTheme);
  if (pageThemeBtn && pageThemeIcon) {
    if (currentPageTheme === "dark") {
      pageThemeIcon.innerHTML = SUN_SVG;
      pageThemeBtn.title = "Switch to light theme";
      pageThemeBtn.setAttribute("aria-label", "Switch to light theme");
    } else {
      pageThemeIcon.innerHTML = MOON_SVG;
      pageThemeBtn.title = "Switch to dark theme";
      pageThemeBtn.setAttribute("aria-label", "Switch to dark theme");
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  let theme = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  if (typeof browser !== "undefined" && browser.storage) {
    const area = browser.storage.sync || browser.storage.local;
    if (area) {
      try {
        const stored = await area.get("pageTheme");
        if (stored && stored.pageTheme) {
          theme = stored.pageTheme;
        }
      } catch (_) {}
    }
  }
  applyTheme(theme);
  if (typeof browser !== "undefined" && browser.storage && browser.storage.local) {
    browser.storage.local.set({ hasSeenUpdatePage: true }).catch(() => {});
  }

  if (pageThemeBtn) {
    pageThemeBtn.addEventListener("click", () => {
      const nextTheme = currentPageTheme === "dark" ? "light" : "dark";
      applyTheme(nextTheme);
      if (typeof browser !== "undefined" && browser.storage) {
        const area = browser.storage.sync || browser.storage.local;
        if (area) {
          area.set({ pageTheme: nextTheme }).catch(() => {});
        }
      }
    });
  }

  if (openSettingsBtn) {
    openSettingsBtn.addEventListener("click", () => {
      if (typeof browser !== "undefined" && browser.runtime && browser.runtime.openOptionsPage) {
        browser.runtime.openOptionsPage().catch(() => {
          window.location.href = "options.html";
        });
      } else {
        window.location.href = "options.html";
      }
    });
  }

  const mockAddonBtn = document.querySelector(".mock-addon-button");
  if (mockAddonBtn) {
    mockAddonBtn.style.cursor = "pointer";
    mockAddonBtn.addEventListener("click", () => {
      if (typeof browser !== "undefined" && browser.browserAction && browser.browserAction.openPopup) {
        browser.browserAction.openPopup().catch(() => {
          window.location.href = "options.html";
        });
      } else {
        window.location.href = "options.html";
      }
    });
  }

  if (closeTabBtn) {
    closeTabBtn.addEventListener("click", async () => {
      try {
        if (typeof browser !== "undefined" && browser.tabs) {
          const currentTab = await browser.tabs.getCurrent();
          if (currentTab && typeof currentTab.id !== "undefined") {
            await browser.tabs.remove(currentTab.id);
            return;
          }
          const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
          if (activeTab && typeof activeTab.id !== "undefined") {
            await browser.tabs.remove(activeTab.id);
            return;
          }
        }
      } catch (_) {}
      window.close();
    });
  }
});
