// Background service worker for Chrome extension
let isExtensionActive = true;

// Initialize on installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Playwright Locators Ganesh installed');
  
  // Create context menu
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "extractLocators",
      title: "SemanticQA - Get Playwright Locators",
      contexts: ["all"]
    });
  });
  
  // Set default state
  chrome.storage.local.set({ isActive: true });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "extractLocators" && isExtensionActive) {
    console.log('Context menu clicked at:', info.x, info.y);
    // Send message to content script
    chrome.tabs.sendMessage(tab.id, { 
      action: "analyzePosition",
      coordinates: {
        x: info.x,
        y: info.y
      }
    }).catch(err => {
      console.log('Could not send message to tab:', err);
    });
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleExtension") {
    isExtensionActive = !isExtensionActive;
    chrome.storage.local.set({ isActive: isExtensionActive }, () => {
      sendResponse({ isActive: isExtensionActive });
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === "getState") {
    sendResponse({ isActive: isExtensionActive });
    return true;
  }
});

// Note: chrome.action.onClicked is not used because we have a popup defined in manifest.json
// The two are mutually exclusive - popup takes precedence