# AMO Listing Documentation (addons.mozilla.org)

This document contains the listing copy for **TST Lock** on [addons.mozilla.org](https://addons.mozilla.org/). Use this content when updating the add-on listing metadata.

---

## Short Description / Summary
*(AMO limit: 250 characters, plain text only)*

Prevents accidentally closing important tabs in Tree Style Tab by locking their close button. Toggle via customizable mouse click, tab context menu, or keyboard shortcut (Ctrl+Alt+L / ⌥+⌘+L). Fully customizable icons, sizes, and hover visibility.

---

## Full Description
*(AMO Markdown format - conforms to Extension Workshop supported Markdown)*

**TST Lock** extends **Tree Style Tab** to help prevent accidentally closing important tabs via the "X" close button. When a tab is locked, its close button is replaced with a non-interactive lock graphic.

**🔒 Three Ways to Lock & Unlock Tabs**

1. **TST Mouse Shortcut (Left-Click)**: Hold `Ctrl + Shift` while left-clicking any tab in the Tree Style Tab sidebar (customizable with any combination of `Ctrl` / `Cmd ⌘`, `Shift`, and `Alt` / `Option ⌥`, or toggled On/Off in extension preferences).
2. **Tab Context Menu**: Right-click on any tab (in the Tree Style Tab sidebar or native tab strip) and select **Lock Tab** or **Unlock Tab**.
3. **Firefox Keyboard Shortcut**: Press `Ctrl + Alt + L` (`⌥ + ⌘ + L` / `Option + Command + L` on macOS) to toggle the active tab's lock state (customizable via `about:addons` ➔ ⚙️ ➔ *Manage Extension Shortcuts*).

**📦 Multi-Tab Batch Locking**

Select multiple tabs to lock or unlock all highlighted tabs simultaneously via keyboard shortcut, right-click context menu (*"Lock 3 Tabs"*), or mouse click.

**⚙️ Visual Customization (No CSS Required)**

Open settings by clicking the **TST Lock toolbar icon** or navigating to `about:addons`:

* **Preset & Custom Indicators**: Choose from classic bundled lock icons, popular presets (📌, ⭐️, 🛡️), or type any single custom emoji/Unicode symbol.
* **Adjustable Sizing**: Scale icons from 12px to 24px (16px default) with a responsive slider to match your tab height.
* **Visibility Modes**: Choose between *Always* visible or *On Hover* only.
* **Dual Live Tab Preview**: Test your custom indicators side-by-side against simulated light and dark tab backgrounds before saving.

*(Note: You can still close a locked tab when needed by right-clicking on the tab and selecting "Close Tab".)*

**🎨 Advanced Customization (Optional TST CSS)**

For power users who wish to further tweak icon positioning, scaling, or spacing, you can add custom styles to Tree Style Tab's Advanced settings:

    #tabbar tab-item.locked tab-closebox {
        display: initial;
        height: 36px;
        width: 18px;
        transform: scale(1.3);
        opacity: 1 !important;
    }

**🔗 Feedback & Support**

* [Original TST discussion](https://github.com/piroor/treestyletab/issues/2104)
* [Issue tracker & feature requests](https://github.com/irvinm/TST-Lock/issues)
