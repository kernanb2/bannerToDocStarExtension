// Popup script
document.addEventListener('DOMContentLoaded', async () => {
  const contentDiv = document.getElementById('content');
  
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      showError('No active tab found');
      return;
    }
    
    // Check if we're on a Banner page or test page
    const isFileUrl = tab.url && tab.url.startsWith('file://');
    const isBannerUrl = tab.url && tab.url.includes('wou.edu');
    
    if (!tab.url || (!isBannerUrl && !isFileUrl)) {
      showWarning('Please navigate to an Ellucian Banner page first');
      return;
    }
    
    // For file:// URLs, we need to inject the content script manually
    if (isFileUrl) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        // Wait a moment for the script to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        showError('Could not inject script. Make sure "Allow access to file URLs" is enabled in chrome://extensions/');
        return;
      }
    }
    
    // Request invoice number from content script
    chrome.tabs.sendMessage(tab.id, { action: 'getInvoiceNumber' }, (response) => {
      if (chrome.runtime.lastError) {
        showError('Could not read page content. Please refresh the Banner page and try again.');
        return;
      }
      
      if (response && response.invoiceNumber) {
        showInvoiceFound(response.invoiceNumber);
      } else {
        showWarning('No invoice number detected on this page');
      }
    });
    
  } catch (error) {
    showError('Error: ' + error.message);
  }
});

function showInvoiceFound(invoiceNumber) {
  const contentDiv = document.getElementById('content');
  
  // Count how many invoices (split by " OR ")
  const invoices = invoiceNumber.split(' OR ');
  const count = invoices.length;
  
  let statusMessage = '✓ Invoice number detected';
  let displayText = invoiceNumber;
  let buttonText = 'Open in DocStar';
  
  if (count > 1) {
    statusMessage = `✓ Found ${count} invoices`;
    buttonText = `Search All in DocStar`;
    // Show just the count in the display, not all the numbers
    displayText = `${count} invoices: ${invoices.join(', ')}`;
  }
  
  contentDiv.innerHTML = `
    <div class="status success">
      ${statusMessage}
    </div>
    
    <div class="invoice-display">
      ${displayText}
    </div>
    
    <button id="openDocStar">${buttonText}</button>
  `;
  
  document.getElementById('openDocStar').addEventListener('click', () => {
    openInDocStar(invoiceNumber);
  });
}

function showWarning(message) {
  const contentDiv = document.getElementById('content');
  contentDiv.innerHTML = `
    <div class="status info">
      ℹ️ ${message}
    </div>
  `;
}

function showError(message) {
  const contentDiv = document.getElementById('content');
  contentDiv.innerHTML = `
    <div class="status error">
      ⚠️ ${message}
    </div>
  `;
}

function openInDocStar(invoiceNumber) {
  const contentDiv = document.getElementById('content');
  
  // Disable button and show loading
  const button = document.getElementById('openDocStar');
  if (button) {
    button.disabled = true;
    button.textContent = 'Opening...';
  }
  
  // Send message to background script to open DocStar
  chrome.runtime.sendMessage(
    { action: 'openDocStar', invoiceNumber: invoiceNumber },
    (response) => {
      if (response && response.success) {
        contentDiv.innerHTML = `
          <div class="status success">
            ✓ DocStar opened successfully!
          </div>
          
          <div class="invoice-display">
            ${invoiceNumber}
          </div>
          
          <button id="openDocStar">Open Again</button>
        `;
        
        document.getElementById('openDocStar').addEventListener('click', () => {
          openInDocStar(invoiceNumber);
        });
      } else {
        showError('Failed to open DocStar: ' + (response?.error || 'Unknown error'));
      }
    }
  );
}
