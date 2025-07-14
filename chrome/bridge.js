/*
V3 Bridge Content Script - Handles communication between MAIN world and background
*/

// Listen for messages from the MAIN world content script
window.addEventListener('message', function(event) {
    // Only process our tracker messages from the same window
    if (event.source === window && 
        event.data && 
        event.data.type === 'POSTMESSAGE_TRACKER_DATA') {
        
        try {
            // Forward the data to background script (same format as V2)
            chrome.runtime.sendMessage(event.data.detail, function(response) {
                // Handle any errors
                if (chrome.runtime.lastError) {
                    console.error('PostMessage Tracker V3: Bridge error:', chrome.runtime.lastError.message);
                }
            });
        } catch (error) {
            console.error('PostMessage Tracker V3: Bridge exception:', error);
        }
    }
});

// Track page changes (same as V2)
window.addEventListener('beforeunload', function(event) {
    try {
        chrome.runtime.sendMessage({changePage: true}, function(response) {
            // Ignore response/errors on page unload
        });
    } catch (error) {
        // Ignore errors during page unload
    }
});

console.log('PostMessage Tracker V3: Bridge initialized');