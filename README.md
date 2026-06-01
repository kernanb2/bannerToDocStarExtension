# Banner to DocStar Extension

A Chrome/Edge browser extension for Western Oregon University that reads invoice numbers from Ellucian Banner web pages and opens the corresponding document(s) in DocStar with a single click.

---

## How to Install (Staff)

Visit the installer page and follow the on-screen steps:

**https://bannerextension.wou.education/BannerExtensions/web_installer.html**

The installer will download the extension files and walk you through loading them into Chrome or Edge.

---

## How to Use

1. Navigate to any Banner page that shows invoice numbers.
2. Click the **Banner to DocStar** icon in your browser toolbar.
3. The extension displays the invoice number(s) it found.
4. Click **Open in DocStar** — the document opens automatically.

If multiple invoices are on the page, all of them are searched at once in DocStar.

---

## Supported Banner Page Types

| Banner Page | Description |
|---|---|
| Approve Documents list | Rows with Document Type = INV |
| Classic invoice detail | Pages with an "Invoice Number" or "Document Number" label |
| FOAUAPP User Approval | `User Approval FOAUAPP` pages with a Document Number column |
| PDF / direct links | Invoice number embedded in the page URL |
| Any page | Fallback text scan for "Invoice Number IXXXXXXX" patterns |

---

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Extension manifest (Manifest V3) — permissions and URL patterns |
| `content.js` | Injected into Banner pages — detects invoice numbers |
| `popup.html` / `popup.js` | Toolbar popup UI and logic |
| `background.js` | Service worker — opens DocStar and automates the search |
| `icon*.png` | Toolbar icons |
| `web_installer.html` | Staff-facing download and installation page |
| `move_files.bat` / `move_files.sh` | Helper scripts that place extension files in the correct folder |
| `test-banner-page.html` | Local test page with sample Banner HTML |
| `TECHNICIAN_GUIDE.md` | Full developer/maintainer documentation |

---

## For Technicians

See **[TECHNICIAN_GUIDE.md](TECHNICIAN_GUIDE.md)** for:

- Architecture overview
- All invoice detection strategies explained
- How to add support for a new Banner page type
- Deployment and update instructions
- Known limitations

---

## Requirements

- Chrome or Edge (any Chromium-based browser)
- Developer Mode must be enabled in the browser's extensions settings (required for unpacked extensions)
- Access to `*.wou.edu` Banner pages and `pinky.wou.edu` DocStar
