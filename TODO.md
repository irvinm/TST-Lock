# TODO

## Post-1.2.0 Cleanup: Decommission Update Announcement Page

Once users have migrated to v1.2.0+ (in a subsequent release such as v1.2.1 or v1.3.0), remove the one-time update announcement page and its associated code:

### Files to Delete
- [ ] `options/update.html`
- [ ] `options/update.js`

### Code to Remove
- [ ] **`background.js`**: Remove the `browser.runtime.onInstalled` listener block (the update check and `options/update.html` tab opener).
- [ ] **`options/options.css`**: Remove the `/* Update Announcement Page */` styles section (the `.update-view` container, cards, and access method grid styles).
- [ ] **`tests/background.test.js`**: Remove the `Version Update & Notification Handling` test suite.

### Verification
- [ ] Run `npm test` to ensure all core tests pass.
- [ ] Run `npm run build` to ensure the extension builds cleanly.
