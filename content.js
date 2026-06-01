// Content script that runs on Banner pages
// Handles multiple Banner page layouts and strips leading "I" from document numbers

function cleanInvoiceNumber(raw) {
  if (!raw) return null;
  let num = raw.trim();
  // Strip leading "I" (e.g. I0591766 -> 0591766)
  if (num.match(/^I\d+$/i)) {
    num = num.substring(1);
  }
  // Must be at least 6 digits
  if (/^\d{6,}$/.test(num)) {
    return num;
  }
  return null;
}

function findInvoiceNumber() {
  const foundInvoices = new Set(); // Use Set to avoid duplicates

  // Helper function to check if element is inside test notice or hidden page
  function shouldSkipElement(element) {
    // Skip if in test notice
    if (element.closest('.test-notice')) return true;
    
    // Skip if in a page-view that's not active
    const pageView = element.closest('.page-view');
    if (pageView && !pageView.classList.contains('active')) return true;
    
    return false;
  }

  // -------------------------------------------------------
  // Strategy 0: Check URL for invoice number (PDF links)
  // Looks for patterns like:
  //   - docCode=I0591766
  //   - =I0591766
  //   - /I0591766
  // -------------------------------------------------------
  const url = window.location.href;
  
  // Try docCode parameter specifically
  let urlMatch = url.match(/docCode=I(\d{6,})/i);
  
  // Fallback to any =I pattern
  if (!urlMatch) {
    urlMatch = url.match(/[=\/]I(\d{6,})/i);
  }
  
  if (urlMatch) {
    const cleaned = cleanInvoiceNumber('I' + urlMatch[1]);
    if (cleaned) {
      console.log('Banner to DocStar: Found invoice in URL:', cleaned);
      foundInvoices.add(cleaned);
    }
  }

  // -------------------------------------------------------
  // Strategy 1: Approve Documents list page
  // Looks for ALL rows where Document Type = "INV"
  // and grabs ALL document numbers from those rows
  // e.g. financessb-test.ec.wou.edu/FinanceSelfService/ssb/approveDocuments
  // -------------------------------------------------------
  const rows = document.querySelectorAll('tr');
  for (let row of rows) {
    // Skip rows inside test notice
    if (shouldSkipElement(row)) continue;
    
    const cells = row.querySelectorAll('td');
    
    let docNumber = null;
    let hasINV = false;
    
    for (let i = 0; i < cells.length; i++) {
      const cellText = cells[i].textContent.trim();
      
      // Check for INV document type
      if (cellText === 'INV') {
        hasINV = true;
      }
      
      // Check for document number pattern
      if (cellText.match(/^I\d{6,}$/i) || cellText.match(/^\d{6,}$/)) {
        docNumber = cellText;
      }
      
      // Also check links inside cells (document numbers are often links)
      const link = cells[i].querySelector('a');
      if (link) {
        const linkText = link.textContent.trim();
        if (linkText.match(/^I\d{6,}$/i) || linkText.match(/^\d{6,}$/)) {
          docNumber = linkText;
        }
      }
    }
    
    if (hasINV && docNumber) {
      const cleaned = cleanInvoiceNumber(docNumber);
      if (cleaned) foundInvoices.add(cleaned);
    }
  }

  // -------------------------------------------------------
  // Strategy 2: Classic Banner invoice detail page
  // Looks for "Invoice Number" label and adjacent value
  // -------------------------------------------------------
  const labels = document.querySelectorAll('td, th, label, span, div');
  for (let label of labels) {
    // Skip labels inside test notice
    if (shouldSkipElement(label)) continue;
    
    const text = label.textContent.trim();
    
    if (text === 'Invoice Number' || text === 'Document Number') {
      const getValue = el => el.tagName === 'INPUT' ? el.value : el.textContent;
      if (label.nextElementSibling) {
        const cleaned = cleanInvoiceNumber(getValue(label.nextElementSibling));
        if (cleaned) foundInvoices.add(cleaned);
      }
      if (label.parentElement && label.parentElement.nextElementSibling) {
        const cleaned = cleanInvoiceNumber(
          getValue(label.parentElement.nextElementSibling)
        );
        if (cleaned) foundInvoices.add(cleaned);
      }
    }
  }

  // -------------------------------------------------------
  // Strategy 3: Text pattern scan
  // Handles "Invoice Number I0591766" with any whitespace between
  // Exclude test notices from search
  // -------------------------------------------------------
  // Clone body and remove test notices
  const bodyClone = document.body.cloneNode(true);
  const testNotices = bodyClone.querySelectorAll('.test-notice');
  testNotices.forEach(notice => notice.remove());
  
  const allText = bodyClone.innerText;
  const match = allText.match(/(?:Invoice|Document)\s+Number[\s:]+([I]?\d{6,})/i);
  if (match) {
    const cleaned = cleanInvoiceNumber(match[1]);
    if (cleaned) foundInvoices.add(cleaned);
  }

  // -------------------------------------------------------
  // Strategy 4: Document column header scan
  // -------------------------------------------------------
  const headers = document.querySelectorAll('th');
  for (let th of headers) {
    // Skip headers inside test notice
    if (shouldSkipElement(th)) continue;
    
    if (th.textContent.trim() === 'Document') {
      const colIndex = Array.from(th.parentElement.children).indexOf(th);
      const tableRows = th.closest('table')?.querySelectorAll('tr') || [];
      for (let row of tableRows) {
        // Skip rows inside test notice
        if (shouldSkipElement(row)) continue;
        
        const cells = row.querySelectorAll('td');
        if (cells.length > colIndex) {
          const rowText = row.textContent;
          if (rowText.includes('INV')) {
            const docCell = cells[colIndex];
            const link = docCell.querySelector('a');
            const value = link ? link.textContent.trim() : docCell.textContent.trim();
            const cleaned = cleanInvoiceNumber(value);
            if (cleaned) foundInvoices.add(cleaned);
          }
        }
      }
    }
  }

  // -------------------------------------------------------
  // Strategy 5: FOAUAPP User Approval page (Banner FOAUAPP)
  // Looks for a table with a "Document Number" column header
  // and collects all document numbers from rows where
  // Document Type = "INV".  Handles td.doc-link cells that
  // are not wrapped in <a> tags.
  // e.g. User Approval FOAUAPP 9.3.39.A (WOUPRD)
  // -------------------------------------------------------
  const docNumHeaders = document.querySelectorAll('th');
  for (let th of docNumHeaders) {
    if (shouldSkipElement(th)) continue;
    if (th.textContent.trim() !== 'Document Number') continue;

    const headerCells = Array.from(th.parentElement.children);
    const docNumIdx = headerCells.indexOf(th);
    const docTypeIdx = headerCells.findIndex(h => h.textContent.trim() === 'Document Type');

    const table = th.closest('table');
    if (!table) continue;

    const tbodyRows = table.querySelectorAll('tbody tr');
    for (let row of tbodyRows) {
      if (shouldSkipElement(row)) continue;
      const cells = row.querySelectorAll('td');

      let isINV = docTypeIdx >= 0 && cells.length > docTypeIdx
        ? cells[docTypeIdx].textContent.trim() === 'INV'
        : Array.from(cells).some(c => c.textContent.trim() === 'INV');

      if (isINV && cells.length > docNumIdx) {
        const docCell = cells[docNumIdx];
        const link = docCell.querySelector('a');
        const value = link ? link.textContent.trim() : docCell.textContent.trim();
        const cleaned = cleanInvoiceNumber(value);
        if (cleaned) foundInvoices.add(cleaned);
      }
    }
  }

  // -------------------------------------------------------
  // Strategy 6: Input fields with invoice-related names
  // -------------------------------------------------------
  const inputs = document.querySelectorAll('input[type="text"], input:not([type])');
  for (let input of inputs) {
    // Skip inputs inside test notice
    if (shouldSkipElement(input)) continue;
    
    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    if ((name.includes('invoice') || id.includes('invoice')) && input.value) {
      const cleaned = cleanInvoiceNumber(input.value);
      if (cleaned) foundInvoices.add(cleaned);
    }
  }

  // Convert Set to array and return
  const invoices = Array.from(foundInvoices);
  
  if (invoices.length === 0) {
    return null;
  } else if (invoices.length === 1) {
    return invoices[0];
  } else {
    // Multiple invoices - join with " OR "
    return invoices.join(' OR ');
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getInvoiceNumber') {
    const invoiceNumber = findInvoiceNumber();
    sendResponse({ invoiceNumber: invoiceNumber });
  }
  return true;
});

// Auto-detect when page loads
let currentInvoiceNumber = null;

function detectInvoice() {
  currentInvoiceNumber = findInvoiceNumber();
  if (currentInvoiceNumber) {
    console.log('Banner to DocStar: Detected invoice number:', currentInvoiceNumber);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', detectInvoice);
} else {
  detectInvoice();
}

// Re-run when content changes (Banner is a single-page app)
const observer = new MutationObserver(() => {
  detectInvoice();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
