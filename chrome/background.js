// V3 Background script using V2 logic with V3 APIs
var tab_listeners = {};
var tab_push = {}, tab_lasturl = {};
var selectedId = -1;

function refreshCount() {
    const txt = tab_listeners[selectedId] ? tab_listeners[selectedId].length : 0;
    
    if (selectedId > 0) {
        chrome.tabs.get(selectedId).then(() => {
            chrome.action.setBadgeText({"text": '' + txt, tabId: selectedId});
            if(txt > 0) {
                chrome.action.setBadgeBackgroundColor({ color: [255, 0, 0, 255], tabId: selectedId});
            } else {
                chrome.action.setBadgeBackgroundColor({ color: [0, 0, 255, 0], tabId: selectedId });
            }
        }).catch(() => {
            // Tab no longer exists, clean up
            delete tab_listeners[selectedId];
        });
    }
}

function logListener(data) {
    chrome.storage.sync.get({
        log_url: ''
    }, function(items) {
        const log_url = items.log_url;
        if(!log_url || !log_url.length) return;
        
        try {
            fetch(log_url, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json; charset=UTF-8"
                },
                body: JSON.stringify(data)
            }).catch(e => {
                console.error('PostMessage Tracker V3: Failed to log listener:', e);
            });
        } catch(e) {
            console.error('PostMessage Tracker V3: Failed to log listener:', e);
        }
    });
}

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    console.log('PostMessage Tracker V3: message from content script', msg);
    
    if (!sender || !sender.tab) {
        if (sendResponse) sendResponse({success: false});
        return;
    }
    
    const tabId = sender.tab.id;
    
    if(msg.listener) {
        if(msg.listener == 'function () { [native code] }') {
            if (sendResponse) sendResponse({success: true});
            return;
        }
        
        msg.parent_url = sender.tab.url;
        if(!tab_listeners[tabId]) tab_listeners[tabId] = [];
        tab_listeners[tabId][tab_listeners[tabId].length] = msg;
        logListener(msg);
    }
    
    if(msg.pushState) {
        tab_push[tabId] = true;
    }
    
    if(msg.changePage) {
        delete tab_lasturl[tabId];
    }
    
    if(msg.log) {
        console.log('PostMessage Tracker V3 Log:', msg.log);
    } else {
        refreshCount();
    }
    
    if (sendResponse) sendResponse({success: true});
    return true; // Keep message channel open
});

chrome.tabs.onUpdated.addListener(function(tabId, props) {
    console.log('PostMessage Tracker V3: tab updated', tabId, props);
    
    if (props.status == "complete") {
        if(tabId == selectedId) refreshCount();
    } else if(props.status == "loading") {
        if(tab_push[tabId]) {
            // This was a pushState, ignore
            delete tab_push[tabId];
        } else {
            if(!tab_lasturl[tabId]) {
                // Wipe on other statuses, but only if lastpage is not set
                tab_listeners[tabId] = [];
            }
        }
        tab_lasturl[tabId] = true;
    }
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
    selectedId = activeInfo.tabId;
    refreshCount();
});

chrome.tabs.onRemoved.addListener(function(tabId) {
    delete tab_listeners[tabId];
    delete tab_push[tabId];
    delete tab_lasturl[tabId];
});

// Initialize selected tab
chrome.tabs.query({active: true, currentWindow: true}).then(function(tabs) {
    if (tabs.length > 0) {
        selectedId = tabs[0].id;
        refreshCount();
    }
}).catch(error => {
    console.error('PostMessage Tracker V3: Failed to query active tab:', error);
});

chrome.runtime.onConnect.addListener(function(port) {
    port.onMessage.addListener(function(msg) {
        port.postMessage({listeners: tab_listeners});
    });
});

// Keep service worker alive
let keepAlive = setInterval(() => {
    chrome.tabs.query({active: true}).catch(() => {});
}, 20000);

console.log('PostMessage Tracker V3: Background script initialized');