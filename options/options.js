"use strict";

const DEFAULT_CONFIG = {
  type: "emoji",
  value: "🔒",
  size: 16,
  visibility: "always"
};

const MAX_RECENT_EMOJIS = 10;

const storageArea = (typeof browser !== "undefined" && browser.storage && (browser.storage.sync || browser.storage.local)) || null;

const doc = (typeof document !== "undefined") ? document : null;

function getPreviewLocks() {
  return doc ? doc.querySelectorAll(".preview-lock, #preview-lock") : [];
}
const sizeSlider = doc ? doc.getElementById("size-slider") : null;
const sizeBadge = doc ? doc.getElementById("size-badge") : null;
const sizeDecreaseBtn = doc ? doc.getElementById("size-decrease-btn") : null;
const sizeIncreaseBtn = doc ? doc.getElementById("size-increase-btn") : null;
const sizeResetBtn = doc ? doc.getElementById("size-reset-btn") : null;
const visibilityToggleGroup = doc ? doc.getElementById("visibility-toggle-group") : null;
const presetEmojiGrid = doc ? doc.getElementById("preset-emojis") : null;
const presetBundledGrid = doc ? doc.getElementById("preset-bundled") : null;
const recentWrapper = doc ? doc.getElementById("recent-wrapper") : null;
const recentChips = doc ? doc.getElementById("recent-chips") : null;
const clearRecentBtn = doc ? doc.getElementById("clear-recent-btn") : null;
const quickChips = doc ? doc.getElementById("quick-chips") : null;
const customInput = doc ? doc.getElementById("custom-emoji-input") : null;
const applyCustomBtn = doc ? doc.getElementById("apply-custom-btn") : null;
const charCounter = doc ? doc.getElementById("char-counter") : null;
const customFeedback = doc ? doc.getElementById("custom-feedback") : null;
const resetBtn = doc ? doc.getElementById("reset-default-btn") : null;
const statusMsg = doc ? doc.getElementById("status-msg") : null;
const openTabBtn = doc ? doc.getElementById("open-tab-btn") : null;
const tabNav = doc ? doc.getElementById("tab-nav") : null;
const pageThemeBtn = doc ? doc.getElementById("page-theme-btn") : null;
const pageThemeIcon = doc ? doc.getElementById("page-theme-icon") : null;

const modCtrl = doc ? doc.getElementById("mod-ctrl") : null;
const modShift = doc ? doc.getElementById("mod-shift") : null;
const modAlt = doc ? doc.getElementById("mod-alt") : null;
const mouseShortcutToggleGroup = doc ? doc.getElementById("mouse-shortcut-toggle-group") : null;
const shortcutStatusOnBtn = doc ? doc.getElementById("shortcut-status-on-btn") : null;
const shortcutStatusOffBtn = doc ? doc.getElementById("shortcut-status-off-btn") : null;
const modCtrlChip = doc ? doc.getElementById("mod-ctrl-chip") : null;
const modShiftChip = doc ? doc.getElementById("mod-shift-chip") : null;
const modAltChip = doc ? doc.getElementById("mod-alt-chip") : null;
const activeTabShortcutBadge = doc ? doc.getElementById("active-tab-shortcut-badge") : null;

const DEFAULT_MOUSE_SHORTCUT = {
  ctrl: true,
  shift: true,
  alt: false,
  disabled: false
};

const isMac = (typeof navigator !== "undefined") && (
  /Mac|iPod|iPhone|iPad/.test(navigator.platform || "") ||
  /Macintosh/.test(navigator.userAgent || "")
);

function formatShortcutForDisplay(rawShortcut, onMac = isMac) {
  if (!rawShortcut) {
    return onMac ? "⌥ + ⌘ + L" : "Ctrl + Alt + L";
  }

  const parts = rawShortcut.split("+").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) {
    return onMac ? "⌥ + ⌘ + L" : "Ctrl + Alt + L";
  }

  if (onMac) {
    let hasCtrl = false;
    let hasAlt = false;
    let hasShift = false;
    let hasCmd = false;
    let key = "";

    parts.forEach((p) => {
      const lower = p.toLowerCase();
      if (lower === "macctrl" || lower === "control") {
        hasCtrl = true;
      } else if (lower === "ctrl" || lower === "command" || lower === "cmd" || p === "⌘") {
        // In Firefox commands on macOS, 'Ctrl' maps to Command (⌘)
        hasCmd = true;
      } else if (lower === "alt" || lower === "option" || p === "⌥") {
        hasAlt = true;
      } else if (lower === "shift" || p === "⇧") {
        hasShift = true;
      } else {
        key = p.toUpperCase();
      }
    });

    // Standard macOS modifier order: Control (⌃), Option (⌥), Shift (⇧), Command (⌘), Key
    const macSymbols = [];
    if (hasCtrl) macSymbols.push("⌃");
    if (hasAlt) macSymbols.push("⌥");
    if (hasShift) macSymbols.push("⇧");
    if (hasCmd) macSymbols.push("⌘");
    if (key) macSymbols.push(key);

    return macSymbols.length > 0 ? macSymbols.join(" + ") : rawShortcut;
  }

  return parts.map((p) => {
    const lower = p.toLowerCase();
    if (lower === "ctrl" || lower === "control") return "Ctrl";
    if (lower === "alt") return "Alt";
    if (lower === "shift") return "Shift";
    return p.toUpperCase();
  }).join(" + ");
}

function applyPlatformLabels() {
  const badge = activeTabShortcutBadge || (doc ? doc.getElementById("active-tab-shortcut-badge") : null);
  if (isMac) {
    if (modCtrlChip) modCtrlChip.textContent = "Cmd (⌘)";
    if (modAltChip) modAltChip.textContent = "Option (⌥)";
    if (customInput) customInput.placeholder = "Paste emoji, or press Cmd + Ctrl + Space";
    if (badge) {
      badge.textContent = "⌥ + ⌘ + L";
      badge.title = "Option + Command + L (Manage in Firefox Extension Shortcuts)";
    }
  } else {
    if (customInput) customInput.placeholder = "Paste emoji, or press Win + .";
    if (badge) {
      badge.textContent = "Ctrl + Alt + L";
      badge.title = "Manage in Firefox Extension Shortcuts";
    }
  }
}

let tabNavBtns = [];
let tabPanels = [];

const SUN_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
const MOON_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

let currentPageTheme = "light";

function applyPageTheme(theme, save = false) {
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

  if (save && storageArea) {
    storageArea.set({ pageTheme: currentPageTheme }).catch((err) => {
      console.warn("TST-Lock: Failed to save pageTheme:", err);
    });
  }
}

function handlePageThemeToggle() {
  const nextTheme = currentPageTheme === "dark" ? "light" : "dark";
  applyPageTheme(nextTheme, true);
}

let currentConfig = { ...DEFAULT_CONFIG };
let recentList = [];
let statusTimeout = null;

function getGraphemes(str) {
  if (!str) return [];
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(str), (s) => s.segment);
  }
  return Array.from(str);
}

function validateCustomInput(raw) {
  if (!raw || raw.trim().length === 0) {
    return {
      valid: false,
      isEmpty: true,
      count: 0,
      message: "",
      type: "hint"
    };
  }

  if (/["'\\]/.test(raw)) {
    return {
      valid: false,
      isEmpty: false,
      count: getGraphemes(raw).length,
      message: 'Quotes (" \') and backslashes cannot be used.',
      type: "error"
    };
  }

  const clean = raw.trim();
  const graphemes = getGraphemes(clean);

  if (graphemes.length === 1) {
    return {
      valid: true,
      isEmpty: false,
      symbol: graphemes[0],
      count: 1,
      message: "✓ Ready to use as custom lock.",
      type: "valid"
    };
  }

  // Multi-character / words entered
  const displayVal = clean.length > 15 ? clean.substring(0, 15) + "…" : clean;
  return {
    valid: false,
    isEmpty: false,
    count: graphemes.length,
    message: `⚠️ Too many characters (${graphemes.length} entered: "${displayVal}"). Please enter only 1 emoji or symbol so it fits inside the tab close button.`,
    type: "error"
  };
}

function updateValidationUI(validation) {
  if (charCounter) {
    charCounter.textContent = `${validation.count} / 1`;
    if (validation.count > 1 || validation.type === "error") {
      charCounter.classList.add("counter-invalid");
    } else {
      charCounter.classList.remove("counter-invalid");
    }
  }

  if (customFeedback) {
    customFeedback.textContent = validation.message;
    customFeedback.className = `feedback-msg ${validation.type}`;
  }

  if (customInput) {
    customInput.classList.remove("input-valid", "input-invalid");
    if (validation.valid) {
      customInput.classList.add("input-valid");
    } else if (!validation.isEmpty) {
      customInput.classList.add("input-invalid");
    }
  }

  if (applyCustomBtn) {
    applyCustomBtn.disabled = !validation.valid;
  }
}

function updateSizeUI(size) {
  if (sizeSlider) sizeSlider.value = size;
  if (sizeBadge) {
    sizeBadge.textContent = size === 16 ? "16px (Default)" : `${size}px`;
  }
}

function handleSizeChange(newSize, shouldSave = true) {
  const size = Math.max(12, Math.min(24, parseInt(newSize, 10) || 16));
  currentConfig.size = size;
  updateSizeUI(size);
  updatePreview(currentConfig);
  if (shouldSave) {
    saveConfig({ size });
  }
}

function switchTab(tabId, saveSession = true) {
  if (!tabId) return;
  tabNavBtns.forEach((btn) => {
    const isTarget = btn.getAttribute("data-tab") === tabId;
    btn.classList.toggle("active", isTarget);
    btn.setAttribute("aria-selected", isTarget ? "true" : "false");
    btn.tabIndex = isTarget ? 0 : -1;
  });

  tabPanels.forEach((panel) => {
    const isTarget = panel.getAttribute("data-panel") === tabId;
    panel.classList.toggle("active", isTarget);
    panel.hidden = !isTarget;
  });

  if (saveSession) {
    try {
      sessionStorage.setItem("tst_active_tab", tabId);
    } catch (_) {}
  }
}

function handleTabClick(event) {
  const btn = event.target.closest(".tab-nav-btn");
  if (!btn) return;
  const tabId = btn.getAttribute("data-tab");
  switchTab(tabId, true);
}

function handleTabKeydown(event) {
  const btn = event.target.closest(".tab-nav-btn");
  if (!btn) return;
  const currentIndex = tabNavBtns.indexOf(btn);
  if (currentIndex === -1) return;

  let newIndex = null;
  if (event.key === "ArrowRight") {
    newIndex = (currentIndex + 1) % tabNavBtns.length;
  } else if (event.key === "ArrowLeft") {
    newIndex = (currentIndex - 1 + tabNavBtns.length) % tabNavBtns.length;
  } else if (event.key === "Home") {
    newIndex = 0;
  } else if (event.key === "End") {
    newIndex = tabNavBtns.length - 1;
  }

  if (newIndex !== null) {
    event.preventDefault();
    const nextBtn = tabNavBtns[newIndex];
    nextBtn.focus();
    switchTab(nextBtn.getAttribute("data-tab"), true);
  }
}

function updateVisibilityUI(visibility) {
  const vis = visibility === "hover" ? "hover" : "always";
  const buttons = document.querySelectorAll(".visibility-btn");
  buttons.forEach((btn) => {
    const isTarget = btn.getAttribute("data-visibility") === vis;
    btn.classList.toggle("active", isTarget);
    btn.setAttribute("aria-checked", isTarget ? "true" : "false");
  });

  const mockTabs = document.querySelectorAll(".mock-tab");
  mockTabs.forEach((mockTab) => {
    mockTab.classList.toggle("visibility-hover", vis === "hover");
  });
}

function handleVisibilityChange(newVisibility) {
  const vis = newVisibility === "hover" ? "hover" : "always";
  currentConfig.visibility = vis;
  updateVisibilityUI(vis);
  saveConfig({ visibility: vis });
}

function renderRecentChips() {
  if (!recentWrapper || !recentChips) return;
  if (!recentList || recentList.length === 0) {
    recentWrapper.hidden = true;
    recentChips.replaceChildren();
    return;
  }

  recentWrapper.hidden = false;
  recentChips.replaceChildren();

  recentList.forEach((sym) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip-btn";
    btn.setAttribute("data-symbol", sym);
    btn.title = `Use ${sym}`;
    btn.textContent = sym;
    recentChips.appendChild(btn);
  });
  updateActiveButton(currentConfig);
}

function addRecentCustomEmoji(sym) {
  if (!sym) return;
  recentList = [sym, ...recentList.filter((s) => s !== sym)].slice(0, MAX_RECENT_EMOJIS);
  renderRecentChips();
  if (storageArea) {
    storageArea.set({ recentCustomEmojis: recentList }).catch((err) => {
      console.warn("TST-Lock: Failed to save recentCustomEmojis:", err);
    });
  }
}

function updatePreview(config) {
  const locks = getPreviewLocks();
  if (!locks || locks.length === 0) return;

  const size = (config && typeof config.size === "number") ? config.size : 16;
  const imageSize = Math.max(10, Math.round(size * 0.94));
  const translateY = -Math.round((size * 0.09) * 10) / 10;

  locks.forEach((lock) => {
    lock.replaceChildren();
    lock.style.fontSize = `${size}px`;
    lock.style.width = "24px";
    lock.style.height = "24px";

    if (config.type === "bundled") {
      lock.style.transform = "translateY(-0.5px)";
      const img = document.createElement("img");
      img.src = "../" + config.value;
      img.alt = "Lock icon";
      img.style.width = `${imageSize}px`;
      img.style.height = `${imageSize}px`;
      lock.appendChild(img);
    } else {
      lock.style.transform = `translateY(${translateY}px)`;
      lock.textContent = config.value || "🔒";
    }
  });
}

function updateActiveButton(config) {
  const allBtns = document.querySelectorAll(".option-btn, .chip-btn");
  allBtns.forEach((btn) => btn.classList.remove("active"));

  if (config.type === "emoji" || config.type === "bundled") {
    const match = document.querySelector(`.option-btn[data-type="${config.type}"][data-value="${config.value}"]`);
    if (match) {
      match.classList.add("active");
    }
  } else if (config.type === "custom-emoji" && config.value) {
    const selectorVal = (typeof CSS !== "undefined" && CSS.escape) ? CSS.escape(config.value) : config.value;
    const matches = document.querySelectorAll(`.chip-btn[data-symbol="${selectorVal}"]`);
    matches.forEach((m) => m.classList.add("active"));
  }
}

function showStatus(text) {
  if (!statusMsg) return;
  statusMsg.textContent = text;
  statusMsg.classList.add("visible");
  if (statusTimeout) {
    clearTimeout(statusTimeout);
  }
  statusTimeout = setTimeout(() => {
    statusMsg.classList.remove("visible");
  }, 2000);
}

async function saveConfig(partialOrFull) {
  currentConfig = { ...currentConfig, ...partialOrFull };
  updatePreview(currentConfig);
  updateActiveButton(currentConfig);

  if (storageArea) {
    try {
      await storageArea.set({ iconConfig: currentConfig });
      showStatus("Saved!");
    } catch (err) {
      console.error("TST-Lock: Failed to save iconConfig:", err);
      showStatus("Error saving!");
    }
  }
}

async function loadKeyboardShortcut() {
  const badge = activeTabShortcutBadge || (doc ? doc.getElementById("active-tab-shortcut-badge") : null);
  if (!badge) return;

  const defaultText = isMac ? "⌥ + ⌘ + L" : "Ctrl + Alt + L";
  const defaultTitle = isMac
    ? "Option + Command + L (Manage in Firefox Extension Shortcuts)"
    : "Manage in Firefox Extension Shortcuts";

  badge.textContent = defaultText;
  badge.title = defaultTitle;

  if (typeof browser !== "undefined" && browser.commands && browser.commands.getAll) {
    try {
      const commands = await browser.commands.getAll();
      const toggleCmd = (commands || []).find((c) => c.name === "toggle-tab-lock");
      if (toggleCmd) {
        if (toggleCmd.shortcut) {
          badge.textContent = formatShortcutForDisplay(toggleCmd.shortcut, isMac);
          badge.title = isMac
            ? "Option + Command + L (Manage in Firefox Extension Shortcuts)"
            : "Manage in Firefox Extension Shortcuts";
        } else {
          badge.textContent = "None assigned";
          badge.title = "Manage in Firefox Extension Shortcuts";
        }
      }
    } catch (_err) {
      badge.textContent = defaultText;
      badge.title = defaultTitle;
    }
  }
}

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

function updateModifierUI(config) {
  if (!modCtrl || !modShift || !modAlt) return;
  modCtrl.checked = Boolean(config.ctrl);
  modShift.checked = Boolean(config.shift);
  modAlt.checked = Boolean(config.alt);

  const isDisabled = Boolean(config.disabled);
  if (shortcutStatusOnBtn && shortcutStatusOffBtn) {
    shortcutStatusOnBtn.classList.toggle("active", !isDisabled);
    shortcutStatusOnBtn.setAttribute("aria-checked", String(!isDisabled));
    shortcutStatusOffBtn.classList.toggle("active", isDisabled);
    shortcutStatusOffBtn.setAttribute("aria-checked", String(isDisabled));
  }

  const builderRow = document.getElementById("modifier-builder-row");
  if (builderRow) {
    builderRow.classList.toggle("is-disabled", isDisabled);
  }
}

async function saveModifierConfig() {
  if (!modCtrl || !modShift || !modAlt) return;
  const isOff = shortcutStatusOffBtn ? shortcutStatusOffBtn.classList.contains("active") : false;
  const config = {
    ctrl: modCtrl.checked,
    shift: modShift.checked,
    alt: modAlt.checked,
    disabled: isOff
  };

  const builderRow = document.getElementById("modifier-builder-row");
  if (builderRow) {
    builderRow.classList.toggle("is-disabled", config.disabled);
  }

  if (storageArea) {
    try {
      await storageArea.set({ mouseShortcut: config });
      showStatus("Saved!");
    } catch (err) {
      console.error("TST-Lock: Failed to save mouseShortcut:", err);
      showStatus("Error saving!");
    }
  }
}

async function loadConfig() {
  if (!storageArea) return;
  try {
    const result = await storageArea.get({
      iconConfig: DEFAULT_CONFIG,
      recentCustomEmojis: [],
      pageTheme: null,
      mouseShortcut: DEFAULT_MOUSE_SHORTCUT
    });
    const stored = result.iconConfig || DEFAULT_CONFIG;
    const size = typeof stored.size === "number" ? stored.size : 16;
    const visibility = stored.visibility === "hover" ? "hover" : "always";
    stored.size = size;
    stored.visibility = visibility;
    currentConfig = stored;

    const mouseShortcut = normalizeMouseShortcut(result.mouseShortcut);
    updateModifierUI(mouseShortcut);
    loadKeyboardShortcut();

    updateSizeUI(size);
    updateVisibilityUI(visibility);

    recentList = Array.isArray(result.recentCustomEmojis) ? result.recentCustomEmojis : [];
    renderRecentChips();

    if (customInput) {
      customInput.value = "";
      updateValidationUI(validateCustomInput(""));
    }

    updatePreview(stored);
    updateActiveButton(stored);

    // Determine theme defaults from browser mode on first run and save them so they don't change later
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialThemeFromBrowser = prefersDark ? "dark" : "light";
    const initialSettingsToSave = {};

    let pageTheme = result.pageTheme;
    if (!pageTheme) {
      pageTheme = initialThemeFromBrowser;
      initialSettingsToSave.pageTheme = pageTheme;
    }
    applyPageTheme(pageTheme, false);

    if (Object.keys(initialSettingsToSave).length > 0 && storageArea) {
      storageArea.set(initialSettingsToSave).catch((err) => {
        console.warn("TST-Lock: Failed to save initial theme settings:", err);
      });
    }

    // Clean up legacy previewTheme if present in storage
    if (storageArea && typeof storageArea.remove === "function") {
      storageArea.remove("previewTheme").catch(() => {});
    }

    // Activate initial tab based on stored setting or previous session tab
    let initialTab = null;
    try {
      initialTab = sessionStorage.getItem("tst_active_tab");
    } catch (_) {}

    if (!initialTab) {
      if (stored.type === "custom-emoji") {
        initialTab = "custom";
      } else if (stored.type === "bundled") {
        initialTab = "bundled";
      } else {
        initialTab = "presets";
      }
    }
    switchTab(initialTab, false);
  } catch (err) {
    console.error("TST-Lock: Failed to load iconConfig:", err);
    updatePreview(DEFAULT_CONFIG);
  }
}

function handleOptionClick(event) {
  const btn = event.target.closest(".option-btn");
  if (!btn) return;

  const type = btn.getAttribute("data-type");
  const value = btn.getAttribute("data-value");

  // Reset custom input feedback state to empty hint when picking a preset
  if (customInput) {
    customInput.value = "";
    updateValidationUI(validateCustomInput(""));
  }

  saveConfig({ type, value, size: currentConfig.size || 16 });
}

function handleChipClick(event) {
  const chip = event.target.closest(".chip-btn");
  if (!chip) return;

  const symbol = chip.getAttribute("data-symbol");
  if (!symbol) return;

  if (customInput) {
    customInput.value = symbol;
    const validation = validateCustomInput(symbol);
    updateValidationUI(validation);
    customInput.focus();
  }

  // Populate preview so the user can test the idea, but do not change the lock until they click Apply
  updatePreview({ type: "custom-emoji", value: symbol, size: currentConfig.size || 16 });
}

function handleRecentChipClick(event) {
  const chip = event.target.closest(".chip-btn");
  if (!chip) return;

  const symbol = chip.getAttribute("data-symbol");
  if (!symbol) return;

  if (customInput) {
    customInput.value = "";
    updateValidationUI(validateCustomInput(""));
  }

  saveConfig({ type: "custom-emoji", value: symbol, size: currentConfig.size || 16 });
  addRecentCustomEmoji(symbol);
}

function handleClearRecent() {
  recentList = [];
  renderRecentChips();
  if (storageArea) {
    storageArea.remove("recentCustomEmojis").catch((err) => {
      console.warn("TST-Lock: Failed to remove recentCustomEmojis:", err);
    });
  }
}

function handleCustomInput() {
  if (!customInput) return;
  const raw = customInput.value;
  const validation = validateCustomInput(raw);
  updateValidationUI(validation);

  // If user entered a valid single symbol, show it in live preview right away
  if (validation.valid) {
    updatePreview({ type: "custom-emoji", value: validation.symbol, size: currentConfig.size || 16 });
  } else {
    // Revert preview to current active config if input is invalid or cleared
    updatePreview(currentConfig);
  }
}

function handleApplyCustom() {
  if (!customInput) return;
  const raw = customInput.value;
  const validation = validateCustomInput(raw);
  updateValidationUI(validation);

  if (!validation.valid) {
    return;
  }

  saveConfig({ type: "custom-emoji", value: validation.symbol, size: currentConfig.size || 16 });
  addRecentCustomEmoji(validation.symbol);

  // Clear input field and reset validation hint after applying
  customInput.value = "";
  updateValidationUI(validateCustomInput(""));
}

function handleReset() {
  if (customInput) {
    customInput.value = "";
    updateValidationUI(validateCustomInput(""));
  }
  updateSizeUI(DEFAULT_CONFIG.size);
  updateVisibilityUI(DEFAULT_CONFIG.visibility);
  updateModifierUI(DEFAULT_MOUSE_SHORTCUT);
  if (storageArea) {
    storageArea.set({ mouseShortcut: DEFAULT_MOUSE_SHORTCUT }).catch((err) => {
      console.warn("TST-Lock: Failed to reset mouseShortcut:", err);
    });
  }
  switchTab("presets", true);
  saveConfig(DEFAULT_CONFIG);
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
  tabNavBtns = Array.from(document.querySelectorAll(".tab-nav-btn"));
  tabPanels = Array.from(document.querySelectorAll(".tab-panel"));

  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyPageTheme(prefersDark ? "dark" : "light", false);

  if (pageThemeBtn) {
    pageThemeBtn.addEventListener("click", handlePageThemeToggle);
  }

  if (tabNav) {
    tabNav.addEventListener("click", handleTabClick);
    tabNav.addEventListener("keydown", handleTabKeydown);
  }
  if (sizeSlider) {
    sizeSlider.addEventListener("input", () => handleSizeChange(sizeSlider.value, false));
    sizeSlider.addEventListener("change", () => handleSizeChange(sizeSlider.value, true));
  }
  if (sizeDecreaseBtn) {
    sizeDecreaseBtn.addEventListener("click", () => handleSizeChange((currentConfig.size || 16) - 1, true));
  }
  if (sizeIncreaseBtn) {
    sizeIncreaseBtn.addEventListener("click", () => handleSizeChange((currentConfig.size || 16) + 1, true));
  }
  if (sizeResetBtn) {
    sizeResetBtn.addEventListener("click", () => handleSizeChange(16, true));
  }
  if (presetEmojiGrid) presetEmojiGrid.addEventListener("click", handleOptionClick);
  if (presetBundledGrid) presetBundledGrid.addEventListener("click", handleOptionClick);
  if (quickChips) quickChips.addEventListener("click", handleChipClick);
  if (recentChips) recentChips.addEventListener("click", handleRecentChipClick);
  if (clearRecentBtn) clearRecentBtn.addEventListener("click", handleClearRecent);
  if (customInput) {
    customInput.addEventListener("input", handleCustomInput);
    customInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleApplyCustom();
      }
    });
  }
  if (applyCustomBtn) applyCustomBtn.addEventListener("click", handleApplyCustom);
  if (resetBtn) resetBtn.addEventListener("click", handleReset);
  if (visibilityToggleGroup) {
    visibilityToggleGroup.addEventListener("click", (event) => {
      const btn = event.target.closest(".visibility-btn");
      if (btn) {
        handleVisibilityChange(btn.getAttribute("data-visibility"));
      }
    });
  }

  applyPlatformLabels();

  if (mouseShortcutToggleGroup) {
    mouseShortcutToggleGroup.addEventListener("click", (event) => {
      const btn = event.target.closest(".status-btn");
      if (!btn) return;
      const status = btn.getAttribute("data-status");
      const isOff = status === "off";

      if (!isOff) {
        // If turning ON and all modifiers are unchecked, restore default Ctrl + Shift
        if (!modCtrl.checked && !modShift.checked && !modAlt.checked) {
          if (modCtrl) modCtrl.checked = true;
          if (modShift) modShift.checked = true;
        }
      }

      if (shortcutStatusOnBtn && shortcutStatusOffBtn) {
        shortcutStatusOnBtn.classList.toggle("active", !isOff);
        shortcutStatusOnBtn.setAttribute("aria-checked", String(!isOff));
        shortcutStatusOffBtn.classList.toggle("active", isOff);
        shortcutStatusOffBtn.setAttribute("aria-checked", String(isOff));
      }
      saveModifierConfig();
    });
  }

  [modCtrl, modShift, modAlt].forEach((input) => {
    if (!input) return;
    input.addEventListener("change", () => {
      // If user checks a modifier while in Off state, toggle to On
      if (input.checked && shortcutStatusOnBtn && shortcutStatusOffBtn) {
        shortcutStatusOnBtn.classList.add("active");
        shortcutStatusOnBtn.setAttribute("aria-checked", "true");
        shortcutStatusOffBtn.classList.remove("active");
        shortcutStatusOffBtn.setAttribute("aria-checked", "false");
      }
      // If user unchecks all modifiers, automatically toggle to Off
      if (!modCtrl.checked && !modShift.checked && !modAlt.checked) {
        if (shortcutStatusOnBtn && shortcutStatusOffBtn) {
          shortcutStatusOnBtn.classList.remove("active");
          shortcutStatusOnBtn.setAttribute("aria-checked", "false");
          shortcutStatusOffBtn.classList.add("active");
          shortcutStatusOffBtn.setAttribute("aria-checked", "true");
        }
      }
      saveModifierConfig();
    });
  });

  if (openTabBtn) {
    openTabBtn.addEventListener("click", () => {
      const url = (typeof browser !== "undefined" && browser.runtime && browser.runtime.getURL)
        ? browser.runtime.getURL("options/options.html")
        : "options.html";

      if (typeof browser !== "undefined" && browser.tabs && browser.tabs.create) {
        browser.tabs.create({ url }).finally(() => {
          window.close();
        });
      } else {
        window.open(url, "_blank");
        window.close();
      }
    });
  }

  loadConfig();
  });
}

if (typeof browser !== "undefined" && browser.storage && browser.storage.onChanged) {
  browser.storage.onChanged.addListener((changes) => {
    if (changes) {
      if (changes.pageTheme && changes.pageTheme.newValue) {
        applyPageTheme(changes.pageTheme.newValue, false);
      }
    }
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    DEFAULT_CONFIG,
    DEFAULT_MOUSE_SHORTCUT,
    isMac,
    formatShortcutForDisplay,
    loadKeyboardShortcut,
    applyPlatformLabels,
    normalizeMouseShortcut,
    validateCustomInput
  };
}
