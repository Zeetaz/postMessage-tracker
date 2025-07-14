/*
V3 Main World Content Script - Based on working V2 patterns
*/

(function() {
    'use strict';
    
    var loaded = false;
    var originalFunctionToString = Function.prototype.toString;
    
    // Store original APIs
    var originalAddEventListener = Window.prototype.addEventListener;
    var originalPushState = History.prototype.pushState;
    var originalMessagePortAddEventListener = MessagePort.prototype.addEventListener;
    
    var m = function(detail) {
        // Send to isolated world via postMessage
        window.postMessage({
            type: 'POSTMESSAGE_TRACKER_DATA',
            detail: detail
        }, '*');
    };
    
    var h = function(p) {
        var hops = "";
        try {
            if(!p) p = window;
            if(p.top != p && p.top == window.top) {
                var w = p;
                while(top != w) { 
                    var x = 0; 
                    for(var i = 0; i < w.parent.frames.length; i++) { 
                        if(w == w.parent.frames[i]) x = i; 
                    }
                    hops = "frames[" + x + "]" + (hops.length ? '.' : '') + hops; 
                    w = w.parent; 
                }
                hops = "top" + (hops.length ? '.' + hops : '');
            } else {
                hops = p.top == window.top ? "top" : "diffwin";
            }
        } catch(e) {
            hops = "unknown";
        }
        return hops;
    };
    
    var jq = function(instance) {
        if(!instance || !instance.message || !instance.message.length) return;
        var j = 0; 
        var e;
        while(e = instance.message[j++]) {
            var listener = e.handler; 
            if(!listener) continue;
            m({
                window: window.top == window ? 'top' : window.name,
                hops: h(),
                domain: document.domain,
                stack: 'jQuery',
                listener: listener.toString()
            });
        }
    };
    
    var l = function(listener, pattern_before, additional_offset) {
        var offset = 3 + (additional_offset || 0);
        var stack, fullstack;
        try { 
            throw new Error(''); 
        } catch (error) { 
            stack = error.stack || ''; 
        }
        stack = stack.split('\n').map(function (line) { return line.trim(); });
        fullstack = stack.slice();
        
        if(pattern_before) {
            var nextitem = false;
            stack = stack.filter(function(e) {
                if(nextitem) { 
                    nextitem = false; 
                    return true; 
                }
                if(e.match && e.match(pattern_before)) {
                    nextitem = true;
                }
                return false;
            });
            stack = stack[0];
        } else {
            stack = stack[offset];
        }
        
        var listener_str = listener.__postmessagetrackername__ || listener.toString();
        m({
            window: window.top == window ? 'top' : window.name,
            hops: h(),
            domain: document.domain,
            stack: stack,
            fullstack: fullstack,
            listener: listener_str
        });
    };
    
    var jqc = function(key) {
        if(typeof window[key] == 'function' && typeof window[key]._data == 'function') {
            var ev = window[key]._data(window, 'events');
            if(ev) jq(ev);
        } else if(window[key] && window[key].expando) {
            var expando = window[key].expando;
            var i = 1;
            var instance;
            while(instance = window[expando + i++]) {
                if(instance.events) jq(instance.events);
            }
        } else if(window[key] && window[key].events) {
            jq(window[key].events);
        }
    };
    
    var j = function() {
        var all = Object.getOwnPropertyNames(window);
        var len = all.length;
        for(var i = 0; i < len; i++) {
            var key = all[i];
            if(key.indexOf('jQuery') !== -1) {
                jqc(key);
            }
        }
        loaded = true;
    };
    
    // Hook History.pushState (same as V2)
    History.prototype.pushState = function(state, title, url) {
        m({pushState: true});
        return originalPushState.apply(this, arguments);
    };
    
    // Hook onmessage setter (same as V2)
    try {
        var original_setter = window.__lookupSetter__('onmessage');
        if(original_setter) {
            window.__defineSetter__('onmessage', function(listener) {
                if(listener) {
                    l(listener, null, 0);
                }
                original_setter(listener);
            });
        }
    } catch(e) {
        // Ignore if can't hook onmessage setter
    }
    
    var c = function(listener) {
        try {
            var listener_str = originalFunctionToString.apply(listener);
            if(listener_str.match(/\.deep.*apply.*captureException/s)) return 'raven';
            else if(listener_str.match(/arguments.*(start|typeof).*err.*finally.*end/s) && listener["nr@original"] && typeof listener["nr@original"] == "function") return 'newrelic';
            else if(listener_str.match(/rollbarContext.*rollbarWrappedError/s) && listener._isWrap && 
                        (typeof listener._wrapped == "function" || typeof listener._rollbar_wrapped == "function")) return 'rollbar';
            else if(listener_str.match(/autoNotify.*(unhandledException|notifyException)/s) && typeof listener.bugsnag == "function") return 'bugsnag';
            else if(listener_str.match(/call.*arguments.*typeof.*apply/s) && typeof listener.__sentry_original__ == "function") return 'sentry';
            else if(listener_str.match(/function.*function.*\.apply.*arguments/s) && typeof listener.__trace__ == "function") return 'bugsnag2';
            return false;
        } catch(error) {
            return false;
        }
    };

    var onmsgport = function(e) {
        try {
            var p = (e.ports && e.ports.length ? '%cport' + e.ports.length + '%c ' : '');
            var msg = '%cport%c→%c' + h(e.source) + '%c ' + p + (typeof e.data == 'string' ? e.data : 'j ' + JSON.stringify(e.data));
            if (p.length) {
                console.log(msg, "color: blue", '', "color: red", '', "color: blue", '');
            } else {
                console.log(msg, "color: blue", '', "color: red", '');
            }
        } catch(error) {
            // Ignore console errors
        }
    };
    
    var onmsg = function(e) {
        try {
            // Skip our own tracking messages
            if(e.data && e.data.type === 'POSTMESSAGE_TRACKER_DATA') {
                return;
            }
            
            var p = (e.ports && e.ports.length ? '%cport' + e.ports.length + '%c ' : '');
            var msg = '%c' + h(e.source) + '%c→%c' + h() + '%c ' + p + (typeof e.data == 'string' ? e.data : 'j ' + JSON.stringify(e.data));
            if (p.length) {
                console.log(msg, "color: red", '', "color: green", '', "color: blue", '');
            } else {
                console.log(msg, "color: red", '', "color: green", '');
            }
        } catch(error) {
            // Ignore console errors
        }
    };
    
    // Add message logger
    window.addEventListener('message', onmsg);
    
    // Hook MessagePort (same as V2)
    MessagePort.prototype.addEventListener = function(type, listener, useCapture) {
        if (!this.__postmessagetrackername__) {
            this.__postmessagetrackername__ = true;
            this.addEventListener('message', onmsgport);
        }
        return originalMessagePortAddEventListener.apply(this, arguments);
    };

    // Main hook - Window.addEventListener (same logic as V2)
    Window.prototype.addEventListener = function(type, listener, useCapture) {
        if(type == 'message') {
            var pattern_before = false, offset = 0;
            if(listener && listener.toString().indexOf('event.dispatch.apply') !== -1) {
                pattern_before = /init\.on|init\..*on\]/;
                if(loaded) { 
                    setTimeout(j, 100); 
                }
            }

            var unwrap = function(listener) {
                var found = c(listener);
                if(found == 'raven') {
                    var fb = false, ff = false, f = null;
                    for(var key in listener) {
                        var v = listener[key];
                        if(typeof v == "function") { 
                            ff++; 
                            f = v; 
                        }
                        if(typeof v == "boolean") fb++;
                    }
                    if(ff == 1 && fb == 1) {
                        offset++;
                        listener = unwrap(f);
                    }
                } else if(found == 'newrelic') {
                    offset++;
                    listener = unwrap(listener["nr@original"]);
                } else if(found == 'sentry') {
                    offset++;
                    listener = unwrap(listener["__sentry_original__"]);
                } else if(found == 'rollbar') {
                    offset += 2;
                } else if(found == 'bugsnag') {
                    offset++;
                    var clr = null;
                    try { 
                        clr = arguments.callee.caller.caller.caller; 
                    } catch(e) { 
                        // Ignore callee errors
                    }
                    if(clr && !c(clr)) {
                        listener.__postmessagetrackername__ = clr.toString();
                    } else if(clr) { 
                        offset++; 
                    }
                } else if(found == 'bugsnag2') {
                    offset++;
                    var clr = null;
                    try { 
                        clr = arguments.callee.caller.caller.arguments[1]; 
                    } catch(e) { 
                        // Ignore callee errors
                    }
                    if(clr && !c(clr)) {
                        listener = unwrap(clr);
                        listener.__postmessagetrackername__ = clr.toString();
                    } else if(clr) { 
                        offset++; 
                    }
                }
                if(listener && listener.name && listener.name.indexOf('bound ') === 0) {
                    listener.__postmessagetrackername__ = listener.name;
                }
                return listener;
            };

            if(typeof listener == "function") {
                listener = unwrap(listener);
                l(listener, pattern_before, offset);
            }
        }
        return originalAddEventListener.apply(this, arguments);
    };
    
    // Event listeners (same as V2)
    window.addEventListener('load', j);
    window.addEventListener('postMessageTrackerUpdate', j);
    
    // Debug logging for this frame
    console.log('PostMessage Tracker V3: Initialized in', h());
    
})();