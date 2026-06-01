// Background service worker
// Handles opening DocStar with the invoice number and automating the search

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openDocStar') {
    const invoiceNumber = request.invoiceNumber;
    
    if (!invoiceNumber) {
      sendResponse({ success: false, error: 'No invoice number provided' });
      return;
    }
    
    // Check if multiple invoices (contains " OR ")
    const isMultiple = invoiceNumber.includes(' OR ');
    
    // DocStar URL - different for single vs multiple invoices
    let docstarUrl;
    if (isMultiple) {
      // Multiple invoices - use search interface
      docstarUrl = 'https://pinky.wou.edu/EclipseWeb#Retrieve/';
    } else {
      // Single invoice - open directly with autoOpen
      docstarUrl = `https://pinky.wou.edu/eclipseweb/#Retrieve/search/qs/${invoiceNumber}/autoOpen`;
    }
    
    // Open DocStar
    chrome.tabs.create({ url: docstarUrl }, (tab) => {
      // If single invoice with autoOpen, document opens directly - no search needed
      if (!isMultiple) {
        sendResponse({ success: true, tabId: tab.id });
        return;
      }
      
      // Multiple invoices - need to wait for page and fill in search
      let attemptsMade = 0;
      
      // Wait for the page to load, then fill in the search
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          attemptsMade++;
          
          // Give up after 3 attempts (handles login redirect + 1 retry)
          if (attemptsMade > 3) {
            chrome.tabs.onUpdated.removeListener(listener);
            return;
          }
          
          // Inject script to fill search and click button
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (invoiceNum) => {
              // Check immediately if search field exists
              const searchInput = document.querySelector('input[type="text"]') ||
                                document.querySelector('input[type="search"]') ||
                                document.querySelector('input[placeholder*="search" i]');
              
              if (!searchInput) {
                // No search field found - probably login page or popup blocking
                return false;
              }
              
              // Search field found - execute search after delay
              setTimeout(() => {
                searchInput.value = invoiceNum;
                searchInput.focus();
                
                // Trigger input event in case the form is watching for it
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                searchInput.dispatchEvent(new Event('change', { bubbles: true }));
                
                // Try to find and click the search button
                // DocStar uses a span with ui-icon-search class
                const searchButton = document.querySelector('span.ui-icon-search') ||
                                   document.querySelector('.ui-icon-search');
                
                if (searchButton) {
                  searchButton.click();
                } else {
                  // Try pressing Enter on the input
                  searchInput.dispatchEvent(new KeyboardEvent('keydown', {
                    key: 'Enter',
                    keyCode: 13,
                    bubbles: true
                  }));
                }
              }, 1500); // Wait 1.5 seconds for page to fully load
              
              // Return true immediately to signal we found the field
              return true;
            },
            args: [invoiceNumber]
          }).then((results) => {
            // If search field was found, remove listener immediately
            if (results && results[0] && results[0].result === true) {
              chrome.tabs.onUpdated.removeListener(listener);
            }
            // Otherwise keep listener active for next page load
          });
        }
      });
      
      sendResponse({ success: true, tabId: tab.id });
    });
    
    return true; // Required for async sendResponse
  }
});
