![CI/CD](https://github.com/irvinm/TST-Lock/workflows/CI/CD/badge.svg) ![Mozilla Add-on](https://img.shields.io/amo/users/TST-Lock.svg?style=flat-square) ![](https://img.shields.io/amo/v/TST-Lock.svg?style=flat-square)

<!-- Can also get # of downloads per week:  https://img.shields.io/amo/dw/TST-Lock.svg?style=flat-square -->
<!-- Github badges:  https://shields.io/search?q=github -->
<!-- Mozilla badges:  https://shields.io/search?q=mozilla -->
<!-- https://shields.io/badges -->
<!-- https://github.com/badges/shields -->

# TST Lock

This project extends "Tree Style Tab" to help prevent users from accidentally closing tabs via the "X" for tabs that you consider important.

### How to Toggle Lock State

You can lock or unlock tabs in three convenient ways:

1. **TST Mouse Shortcut (Left-Click)**: Hold `Ctrl + Shift` while left-clicking on a tab in the Tree Style Tab sidebar (or customize any combination of `Ctrl` / `Cmd ⌘`, `Shift`, and `Alt` / `Option ⌥`, or turn it on/off in the extension preferences).
2. **Tab Context Menu**: Right-click on any tab (in the Tree Style Tab sidebar or native tab strip) and select **Lock Tab** / **Unlock Tab** (or **Lock/Unlock X Tabs** when multiple tabs are selected).
3. **Firefox Keyboard Shortcut**: Press `Ctrl + Alt + L` (`⌥ + ⌘ + L` / `Option + Command + L` on macOS, customizable via Firefox's standard shortcut manager at `about:addons` ➔ ⚙️ ➔ *Manage Extension Shortcuts*) to toggle the lock state of the currently active tab (or all selected tabs).

### Multi-Tab Batch Locking
If multiple tabs are selected/highlighted, triggering any lock action (keyboard shortcut, context menu, or mouse click) will batch lock or unlock all selected tabs simultaneously. If any tab in the selection is unlocked, all selected tabs will be locked; if all are already locked, they will all be unlocked.

When locked, the tab's close button is replaced with a non-interactive lock graphic. (Simply repeat any toggle action to unlock it back to the normal "X"). You can still close a locked tab if needed by right-clicking on the tab and selecting "Close Tab".

Original TST discussion: https://github.com/piroor/treestyletab/issues/2104

Current defect/enhancement requests: https://github.com/irvinm/TST-Lock/issues

------

### View (Windows 11 - Firefox Nova)
<img src="https://github.com/user-attachments/assets/1313b216-e7da-4eee-84a5-4ab331386834" />

### Customization
You can also change how the lock graphic is sized and positioned by using TST CSS. Below is an example.

```
#tabbar tab-item.locked tab-closebox {
  display: initial;
  height: 36px;
  width: 18px; 
  transform: scale(1.3);
  opacity: 1 !important;
}
```

## Version History

<details open>
<summary><b>Version 1.2.0 (October 27, 2026) - Customization Options, Shortcuts & Batch Locking</b></summary>

- **Visual Customization UI**: Added a dedicated Options page and popup interface with preset/bundled lock icons, custom emoji/Unicode input, interactive 12px–24px size slider, and live tab preview on light/dark backgrounds.
- **Lock Visibility Modes**: Added support for choosing between always visible and hover-only lock display.
- **Tab Context Menu**: Right-click on any tab in the Tree Style Tab sidebar or native tab strip to lock or unlock tabs.
- **Firefox Keyboard Shortcut**: Added a customizable keyboard shortcut (`Ctrl+Alt+L` on Windows/Linux, `⌥+⌘+L` on macOS by default, remappable via Firefox's shortcut manager) to toggle the active tab.
- **Custom Mouse Modifiers**: Allowed customizing mouse click shortcut modifiers (`Ctrl`/`Cmd`, `Shift`, `Alt`/`Option`) or toggling mouse shortcut on/off.
- **Multi-Tab Batch Locking**: Added support for locking or unlocking multiple selected/highlighted tabs simultaneously across mouse clicks, context menu actions, and keyboard shortcuts.
- **Cross-Window Drag & Tab Attachment**: Automatically re-applies tab lock states to Tree Style Tab when tabs are moved across windows or restored from previous sessions.
- **Theme Synchronization**: Added dark/light theme switching for the Options page and automatic theme preference persistence.
- **Update Welcome Notice**: Added a one-time update notice tab upon upgrading to v1.2.0 to introduce existing users to new configuration options and shortcut controls.
- **Console Spam Reduction**: Eliminated repetitive event logging on mouse movements and handled expected promise rejections on restricted browser pages (such as `about:` URLs).
- **Diagnostic Logging**: Added structured `console.warn` diagnostics for failed TST communications or storage errors, along with explicit logs when middle-click close is prevented on locked tabs or when locked tabs are closed externally.
- **Startup Performance & Badge Sync**: Concurrently loaded tab lock states via `Promise.all()` during startup, eliminated badge UI thrashing, and ensured the badge counter stays synchronized when locked tabs are closed externally.
- **Security Hardening**: Enforced strict sender verification on all incoming external messages to ensure they originate only from Tree Style Tab.
- **Event-Driven Architecture**: Replaced active polling with a robust, event-driven lifecycle supporting TST restarts and shutdowns.
- **Platform Baseline**: Established minimum required browser version as Firefox 115+ (ESR) for modern WebExtension API compatibility.
- **Test Suite & Build Modernization**: Added a comprehensive Jest unit test suite and standardized `web-ext` build automation.

</details>

<details>
<summary><b>Version 1.1.7 (August 1, 2022) - Badge Counter Support</b></summary>

- **Badge Counter**: Added extension badge text to display the current count of locked tabs in the browser toolbar.
- **Permission Optimization**: Re-added `tabs` permission required for badge counting and state tracking.

</details>

<details>
<summary><b>Version 1.1.5 (April 18, 2022) - Permission Reduction</b></summary>

- **Permissions**: Streamlined extension manifest permissions.

</details>

<details>
<summary><b>Version 1.1.4 (April 18, 2022) - Maintenance Release</b></summary>

- **Publishing Update**: Version bump and publishing maintenance.

</details>

<details>
<summary><b>Version 1.1.3 (November 3, 2020) - Startup Reliability</b></summary>

- **State Loading**: Added fallback call to load stored lock states if the TST "ready" event is delayed or not received.

</details>

<details>
<summary><b>Version 1.1.2 (October 28, 2020) - TST Upgrade Handling</b></summary>

- **Lifecycle Handling**: Re-arranged registration and lock-loading logic to properly handle when Tree Style Tab is upgraded while the browser is running.

</details>

<details>
<summary><b>Version 1.1.1 (September 13, 2020) - Registration Retry Logic</b></summary>

- **Connection Resiliency**: Added retry logic to ensure reliable registration with Tree Style Tab during startup.

</details>

<details>
<summary><b>Version 1.1.0 (September 6, 2020) - Asynchronous Architecture</b></summary>

- **Async Modernization**: Migrated internal registration and messaging logic to modern asynchronous APIs.
- **Shutdown Monitoring**: Added proper handling and logging for TST shutdown notifications.

</details>

<details>
<summary><b>Version 1.0.5 (August 2, 2020) - Tab Management Fixes</b></summary>

- **Tab Restoration**: Cleaned up tab close event handlers to prevent unwanted duplicate tabs during undo-close actions.

</details>

<details>
<summary><b>Version 1.0.4 (August 2, 2020) - Code Refactoring</b></summary>

- **Logic Optimization**: Refined tab close handling logic when tabs are locked.

</details>

<details>
<summary><b>Version 1.0.3 (June 22, 2020) - Session Restoration Fixes</b></summary>

- **Session Persistence**: Fixed an issue where tab lock states could be lost across browser restarts.

</details>

<details>
<summary><b>Version 1.0.1 (June 21, 2020) - Storage Improvements</b></summary>

- **Storage Permissions**: Adjusted permissions and storage handling for tab lock states.

</details>

<details>
<summary><b>Version 1.0.0 (June 20, 2020) - Initial Release</b></summary>

- **Core Functionality**: Integrates with Tree Style Tab to replace the close button with a non-interactive lock graphic via Ctrl+Shift+Click.
- **Session Persistence**: Stores lock states per tab to prevent accidental closures.
- **CI/CD Automation**: Established automated build and testing pipelines.

</details>

