# Banner to DocStar Extension — Technician Guide

**Organization:** Western Oregon University  
**Purpose:** Reads invoice numbers from Ellucian Banner web pages and opens the corresponding document(s) in DocStar with a single click.  
**Browsers supported:** Chrome, Edge (any Chromium-based browser)  
**Extension type:** Unpacked / developer-loaded (not published to the Chrome Web Store)

---

## How It Works — Big Picture

1. A staff member is on a Banner page that shows one or more invoice numbers.
2. They click the extension icon in the browser toolbar.
3. The popup asks the active tab's content script to find invoice numbers on the page.
4. The content script scans the DOM using several detection strategies and returns the number(s).
5. The popup shows what was found and presents an "Open in DocStar" button.
6. Clicking that button sends a message to the background service worker.
7. The background worker opens DocStar in a new tab:
   - **Single invoice** — opens directly via `autoOpen` URL parameter.
   - **Multiple invoices** — opens the DocStar Retrieve page, then injects a script to fill in the search field with all invoice numbers joined by ` OR `.

---

## File Structure

```
/var/www/html/BannerExtensions/   ← source / web server root
│
├── manifest.json       ← Extension manifest (Manifest V3). Defines permissions and URL patterns.
├── content.js          ← Injected into every wou.edu page. Detects invoice numbers.
├── popup.html          ← The small UI shown when the toolbar icon is clicked.
├── popup.js            ← Logic for the popup (queries tab, calls content.js, calls background).
├── background.js       ← Service worker. Opens DocStar and automates the search field.
│
├── icon16.png          ← Toolbar icon (small)
├── icon48.png          ← Toolbar icon (medium)
├── icon128.png         ← Toolbar icon (large / store listing)
│
├── web_installer.html  ← Web page staff visit to download and install the extension.
├── move_files.bat      ← Windows script: moves downloaded files to C:\BannerExtension
├── move_files.sh       ← Mac script:     moves downloaded files to ~/BannerExtension
│
├── test-banner-page.html         ← Local test page with sample invoice HTML
├── test-banner-page.html.works   ← Backup of a known-working test page version
├── invoice.html                  ← Additional test/reference HTML
├── debug_docstar.js              ← Scratch/debug script (not loaded by extension)
└── TECHNICIAN_GUIDE.md           ← This file
```

The web server at `https://bannerextension.wou.education/BannerExtensions/` serves this directory so users can download the extension files without needing a file share.

---

## URL Patterns (manifest.json)

The extension is permitted to run on:

```
https://*.wou.edu/*
https://*.ec.wou.edu/*
https://*.ec.wou.edu:*/*
https://*.wou.education/*
```

If Banner is ever hosted on a new subdomain not covered by these patterns, add it to both `host_permissions` and the `content_scripts.matches` array in `manifest.json`. Every user will need to reload the extension after that change is pushed to the web server.

---

## DocStar URLs (background.js)

| Scenario | URL used |
|---|---|
| Single invoice | `https://pinky.wou.edu/eclipseweb/#Retrieve/search/qs/{invoiceNumber}/autoOpen` |
| Multiple invoices | `https://pinky.wou.edu/EclipseWeb#Retrieve/` then script fills search box |

If the DocStar server hostname changes (e.g. `pinky` is renamed), update both URLs in `background.js`.

---

## Invoice Number Format

Banner invoice numbers look like `I0598786`. The leading `I` is stripped before sending to DocStar, so DocStar receives `0598786`. The `cleanInvoiceNumber()` function in `content.js` handles this. It also enforces a minimum of 6 digits so it does not accidentally pick up short numeric strings.

---

## Detection Strategies (content.js)

The `findInvoiceNumber()` function runs all strategies and collects results in a `Set` to avoid duplicates. When multiple invoices are found they are joined with ` OR `.

### Strategy 0 — URL parameter scan
Looks for `docCode=I0XXXXXX` (or `=I0XXXXXX` / `/I0XXXXXX`) in the current page URL. Catches PDF viewer and direct-link pages.

### Strategy 1 — Approve Documents list (generic INV row scan)
Scans every `<tr>` on the page. If a row contains a cell with text `INV` **and** a cell matching `I\d{6,}` or `\d{6,}`, it captures the document number. Handles both plain `<td>` cells and cells that wrap the number in an `<a>` tag.

### Strategy 2 — Classic Banner invoice detail page
Looks for a `<td>`, `<th>`, `<label>`, `<span>`, or `<div>` whose text is exactly `Invoice Number` or `Document Number`, then reads the adjacent sibling element's value (or `input.value` for form fields).

### Strategy 3 — Text pattern scan
Clones the body (excluding `.test-notice` elements), extracts `innerText`, and runs a regex: `(?:Invoice|Document)\s+Number[\s:]+([I]?\d{6,})`.

### Strategy 4 — "Document" column header scan
Finds `<th>` cells whose text is exactly `Document`, determines that column's index, and reads the value from that column in every row that also contains `INV` elsewhere.

### Strategy 5 — FOAUAPP User Approval page
Finds `<th>` cells whose text is exactly `Document Number` (the FOAUAPP table uses this header name instead of just `Document`). Resolves both the `Document Number` and `Document Type` column indices, then collects document numbers from rows where `Document Type` = `INV`. Handles `td.doc-link` cells that are **not** wrapped in `<a>` tags. Example page: `User Approval FOAUAPP 9.3.39.A (WOUPRD)`.

### Strategy 6 — Input fields
Checks all text `<input>` elements whose `name` or `id` attribute contains the word `invoice`.

---

## Adding Support for a New Page Type

When a new Banner page layout is reported, follow these steps:

1. **Get the HTML.** Ask the reporter to use "View Page Source" or the browser DevTools to copy the relevant section of the page showing the invoice number(s).

2. **Identify the pattern.** Look for:
   - What column header or label appears near the invoice number?
   - Is the invoice number in a `<td>`, `<input>`, a link, or plain text?
   - Is Document Type `INV` present in the same row?

3. **Check whether an existing strategy already covers it.** Open `test-banner-page.html` in a browser with the extension loaded, paste the new HTML into the page body, and click the extension icon. If it detects correctly, no code change is needed.

4. **If a new strategy is required**, add it to `content.js` inside `findInvoiceNumber()`, after the last existing strategy block. Follow the same pattern:
   - Always call `shouldSkipElement(el)` to skip `.test-notice` and inactive `.page-view` elements.
   - Use `cleanInvoiceNumber(value)` before adding to `foundInvoices`.
   - Use `foundInvoices.add(cleaned)` (it's a `Set`, so duplicates are automatically ignored).
   - Add a comment block explaining the page type and an example URL.
   - Update the strategy number in the comment.

5. **Test** using the local test page (see Testing section below), then push the updated `content.js` to the web server. Users do **not** need to reinstall the extension — Chrome/Edge automatically reloads unpacked extensions when the source files change (they may need to click the reload icon on `chrome://extensions/`).

---

## Testing

### Local test page
Open `test-banner-page.html` directly in the browser (file:// URL). The extension must have "Allow access to file URLs" enabled (see installation instructions). The page contains sample HTML representing several Banner page types. Click the extension icon — it should detect the invoice numbers from the visible section.

### Live test page
`https://bannerextension.wou.education/BannerExtensions/test-banner-page.html` — same page served over HTTPS, useful when "Allow access to file URLs" is not enabled.

### Console logging
`content.js` logs detections to the browser console:
```
Banner to DocStar: Detected invoice number: 0598786
Banner to DocStar: Found invoice in URL: 0598786
```
Open DevTools (F12) → Console tab on any Banner page to see these messages.

---

## Deployment — Updating the Extension

The extension files are served from this Linux web server at `/var/www/html/BannerExtensions/`. To push an update:

1. Edit the relevant file(s) on the server (typically `content.js`).
2. No web server restart is required — the files are served statically.
3. Notify users to reload the extension: go to `chrome://extensions/` (or `edge://extensions/`), find "Banner to DocStar", and click the reload icon (circular arrow).

---

## User Installation

Users visit `https://bannerextension.wou.education/BannerExtensions/web_installer.html`, choose their OS, and follow the on-screen steps. The page downloads all extension files plus a helper script that moves them to the correct folder (`C:\BannerExtension` on Windows, `~/BannerExtension` on Mac). They then load the folder as an unpacked extension in Developer Mode.

**First-time DocStar login note:** On the very first use, DocStar may show a welcome popup after login. The user should close it within about 2 seconds; after that, the extension works without interruption on subsequent uses.

---

## Known Limitations / Gotchas

- **Developer Mode required.** Because the extension is not published to the Chrome Web Store, users must keep Developer Mode enabled. Enterprise environments that disable Developer Mode cannot use this extension without a different distribution method (e.g., group policy sideloading).
- **Multiple-invoice search delay.** When opening DocStar for multiple invoices, the background script waits 1.5 seconds for the page to load before filling the search field. If DocStar loads slowly, the search may not trigger and the user will have to search manually.
- **DocStar login redirect.** The background script retries up to 3 times to handle a login redirect before giving up. If DocStar's login flow changes this may need adjustment in `background.js`.
- **Banner is a single-page app.** A `MutationObserver` in `content.js` re-runs detection whenever the DOM changes, so navigating within Banner without a full page reload still updates the detected invoice.
