// V3 Popup script (updated from V2)
var port = chrome.runtime.connect({
    name: "PostMessage Tracker V3 Communication"
});

function loaded() {
    try {
        port.postMessage("get-stuff");
        port.onMessage.addListener(function(msg) {
            console.log("PostMessage Tracker V3: message received:", msg);
            chrome.tabs.query({active: true, currentWindow: true}).then(function(tabs) {
                if (tabs.length > 0) {
                    const selectedId = tabs[0].id;
                    listListeners(msg.listeners[selectedId] || []);
                }
            }).catch(function(error) {
                console.error('PostMessage Tracker V3: Failed to query tabs:', error);
                listListeners([]);
            });
        });
    } catch (error) {
        console.error('PostMessage Tracker V3: Popup initialization error:', error);
        listListeners([]);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loaded);
} else {
    loaded();
}

function listListeners(listeners) {
    try {
        var x = document.getElementById('x');
        if (x) {
            x.parentElement.removeChild(x);
        }
        
        x = document.createElement('ol');
        x.id = 'x';
        
        // Set header
        const headerElement = document.getElementById('h');
        if (headerElement) {
            headerElement.innerText = (listeners && listeners.length) ? listeners[0].parent_url || '' : 'No listeners detected';
        }

        if (listeners && listeners.length > 0) {
            for(var i = 0; i < listeners.length; i++) {
                var listener = listeners[i];
                var el = document.createElement('li');

                // Domain and window info
                var bel = document.createElement('b');
                bel.innerText = (listener.domain || 'unknown') + ' ';
                var win = document.createElement('code');
                win.innerText = ' ' + (listener.window ? listener.window + ' ' : '') + 
                               (listener.hops && listener.hops.length ? listener.hops : '');
                el.appendChild(bel);
                el.appendChild(win);

                // Stack info
                var sel = document.createElement('span');
                if(listener.fullstack) {
                    sel.setAttribute('title', listener.fullstack.join("\n\n"));
                }
                var seltxt = document.createTextNode(listener.stack || 'Unknown stack');
                sel.appendChild(seltxt);
                el.appendChild(sel);

                // Listener code
                var pel = document.createElement('pre');
                pel.innerText = listener.listener || 'function() { /* code not available */ }';
                el.appendChild(pel);

                x.appendChild(el);
            }
        }
        
        const contentElement = document.getElementById('content');
        if (contentElement) {
            contentElement.appendChild(x);
        }
    } catch (error) {
        console.error('PostMessage Tracker V3: Error building listener list:', error);
    }
}