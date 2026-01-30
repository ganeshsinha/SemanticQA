// Popup script for extension
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggleExtension');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  
  // Get current state from storage
  chrome.storage.local.get(['isActive'], (result) => {
    const isActive = result.isActive !== false; // Default to true
    toggle.checked = isActive;
    updateStatus(isActive);
  });
  
  // Toggle extension state
  toggle.addEventListener('change', () => {
    const newState = toggle.checked;
    
    chrome.runtime.sendMessage({ 
      action: 'toggleExtension' 
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        return;
      }
      
      if (response && response.isActive !== undefined) {
        updateStatus(response.isActive);
        toggle.checked = response.isActive;
      } else {
        updateStatus(newState);
        chrome.storage.local.set({ isActive: newState });
      }
    });
  });
  
  function updateStatus(isActive) {
    if (isActive) {
      statusIndicator.className = 'status-indicator active';
      statusText.textContent = 'Extension is active';
      statusText.style.color = '#2e7d32';
    } else {
      statusIndicator.className = 'status-indicator inactive';
      statusText.textContent = 'Extension is inactive';
      statusText.style.color = '#666';
    }
  }
  
  // Update status when storage changes (if user toggles via icon)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.isActive) {
      toggle.checked = changes.isActive.newValue;
      updateStatus(changes.isActive.newValue);
    }
  });
});