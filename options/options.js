"use strict";

const DEFAULT_CONFIG = {
  type: "emoji",
  value: "🔒",
  size: 16,
  visibility: "always"
};

const MAX_RECENT_EMOJIS = 10;

const storageArea = (typeof browser !== "undefined" && browser.storage && (browser.storage.sync || browser.storage.local)) || null;

const previewLock = document.getElementById("preview-lock");
const mockTabContainer = document.getElementById("mock-tab-container");
const themeToggleGroup = document.getElementById("theme-toggle-group");
const sizeSlider = document.getElementById("size-slider");
const sizeBadge = document.getElementById("size-badge");
const sizeDecreaseBtn = document.getElementById("size-decrease-btn");
const sizeIncreaseBtn = document.getElementById("size-increase-btn");
const sizeResetBtn = document.getElementById("size-reset-btn");
const visibilityToggleGroup = document.getElementById("visibility-toggle-group");
const presetEmojiGrid = document.getElementById("preset-emojis");
const presetBundledGrid = document.getElementById("preset-bundled");
const recentWrapper = document.getElementById("recent-wrapper");
const recentChips = document.getElementById("recent-chips");
const clearRecentBtn = document.getElementById("clear-recent-btn");
const quickChips = document.getElementById("quick-chips");
const customInput = document.getElementById("custom-emoji-input");
const applyCustomBtn = document.getElementById("apply-custom-btn");
const charCounter = document.getElementById("char-counter");
const customFeedback = document.getElementById("custom-feedback");
const resetBtn = document.getElementById("reset-default-btn");
const statusMsg = document.getElementById("status-msg");
const openTabBtn = document.getElementById("open-tab-btn");
const tabNav = document.getElementById("tab-nav");
let tabNavBtns = [];
let tabPanels = [];

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
      message: "Enter or paste a single emoji or symbol.",
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

  const mockTab = document.querySelector(".mock-tab");
  if (mockTab) {
    mockTab.classList.toggle("visibility-hover", vis === "hover");
  }
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
  if (!previewLock) return;
  previewLock.replaceChildren();

  const size = (config && typeof config.size === "number") ? config.size : 16;
  const imageSize = Math.max(10, Math.round(size * 0.94));
  const translateY = -Math.round((size * 0.09) * 10) / 10;

  previewLock.style.fontSize = `${size}px`;
  previewLock.style.width = "24px";
  previewLock.style.height = "24px";

  if (config.type === "bundled") {
    previewLock.style.transform = "translateY(-0.5px)";
    const img = document.createElement("img");
    img.src = "../" + config.value;
    img.alt = "Lock icon";
    img.style.width = `${imageSize}px`;
    img.style.height = `${imageSize}px`;
    previewLock.appendChild(img);
  } else {
    previewLock.style.transform = `translateY(${translateY}px)`;
    previewLock.textContent = config.value || "🔒";
  }
}

function updateActiveButton(config) {
  const allBtns = document.querySelectorAll(".option-btn");
  allBtns.forEach((btn) => btn.classList.remove("active"));

  if (config.type === "emoji" || config.type === "bundled") {
    const match = document.querySelector(`.option-btn[data-type="${config.type}"][data-value="${config.value}"]`);
    if (match) {
      match.classList.add("active");
    }
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

async function loadConfig() {
  if (!storageArea) return;
  try {
    const result = await storageArea.get({
      iconConfig: DEFAULT_CONFIG,
      recentCustomEmojis: []
    });
    const stored = result.iconConfig || DEFAULT_CONFIG;
    const size = typeof stored.size === "number" ? stored.size : 16;
    const visibility = stored.visibility === "hover" ? "hover" : "always";
    stored.size = size;
    stored.visibility = visibility;
    currentConfig = stored;

    updateSizeUI(size);
    updateVisibilityUI(visibility);

    recentList = Array.isArray(result.recentCustomEmojis) ? result.recentCustomEmojis : [];
    renderRecentChips();

    if (stored.type === "custom-emoji") {
      if (customInput) {
        customInput.value = stored.value;
        const validation = validateCustomInput(stored.value);
        updateValidationUI(validation);
      }
    } else {
      if (customInput) {
        const validation = validateCustomInput("");
        updateValidationUI(validation);
      }
    }

    updatePreview(stored);
    updateActiveButton(stored);

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
  }

  saveConfig({ type: "custom-emoji", value: symbol, size: currentConfig.size || 16 });
  addRecentCustomEmoji(symbol);
}

function handleRecentChipClick(event) {
  const chip = event.target.closest(".chip-btn");
  if (!chip) return;

  const symbol = chip.getAttribute("data-symbol");
  if (!symbol) return;

  if (customInput) {
    customInput.value = symbol;
    const validation = validateCustomInput(symbol);
    updateValidationUI(validation);
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
  } else if (!validation.isEmpty) {
    // Revert preview to current active config if input is invalid
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

  customInput.value = validation.symbol;
  saveConfig({ type: "custom-emoji", value: validation.symbol, size: currentConfig.size || 16 });
  addRecentCustomEmoji(validation.symbol);
}

function handleReset() {
  if (customInput) {
    customInput.value = "";
    updateValidationUI(validateCustomInput(""));
  }
  updateSizeUI(DEFAULT_CONFIG.size);
  updateVisibilityUI(DEFAULT_CONFIG.visibility);
  switchTab("presets", true);
  saveConfig(DEFAULT_CONFIG);
}

function setPreviewTheme(mode) {
  if (!mockTabContainer) return;
  const isDark = mode === "dark";
  document.querySelectorAll(".theme-toggle-btn").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-preview-theme") === (isDark ? "dark" : "light"));
  });

  mockTabContainer.classList.remove("theme-light", "theme-dark");
  mockTabContainer.classList.add(isDark ? "theme-dark" : "theme-light");
}

function handleThemeToggle(event) {
  const btn = event.target.closest(".theme-toggle-btn");
  if (!btn) return;
  setPreviewTheme(btn.getAttribute("data-preview-theme"));
}

document.addEventListener("DOMContentLoaded", () => {
  tabNavBtns = Array.from(document.querySelectorAll(".tab-nav-btn"));
  tabPanels = Array.from(document.querySelectorAll(".tab-panel"));

  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  setPreviewTheme(prefersDark ? "dark" : "light");

  if (tabNav) {
    tabNav.addEventListener("click", handleTabClick);
    tabNav.addEventListener("keydown", handleTabKeydown);
  }
  if (themeToggleGroup) themeToggleGroup.addEventListener("click", handleThemeToggle);
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

  if (openTabBtn) {
    openTabBtn.addEventListener("click", () => {
      const url = (typeof browser !== "undefined" && browser.runtime && browser.runtime.getURL)
        ? browser.runtime.getURL("options/options.html")
        : "options.html";
      window.open(url, "_blank");
    });
  }

  loadConfig();
});
