/*
 * Inteligent.li.v2-node.js Copyright Percepscion Pty. Ltd.
 *
 * Provides a class for connecting to the Intelligent.li service  via
 * web sockets.
 * 
 * This is a port of the original Inteligent.li.v2.js to work under node.js
 * however, it is not complete. Eventually this port will be merged back into
 * Inteligent.li.v2.js. 
 */
ili_timeNow = function(interval) {
    var v = Math.floor(Date.now() / (1000 * interval)) * interval;
    if (isNaN(v)) {
        v = Math.floor(Date.now() / (1000 * 5)) * 5;
    }
    return v;
}

ili_Observer = function() {
    this.feeds = {}
    this.subscribed = function(guid) {
        return guid in this.feeds;
    }

    this.update = function(feed) { 
        console.log('no update function for this observer'); 
    }
    this.respondNoData = function() {}
}

var ili_loadJSON = function(url, map, notify) {
    $.getJSON(url, function(data, result) {
        if (result == "success") {
            for (var property in data) {
                if (data.hasOwnProperty(property)) {
                    map[property] = data[property];
                }
            }
        }
        notify();
    });
}

ili_Feed = function(guid, seconds) {
    this.observerCount = 0;
    this.id = guid;
    this.start = ((new Date() / 1000) | 0) - seconds; 
    this.values = {};
    this.attributes = {};
    this.tags = {};
    this.mostRecentValue = Number.NaN;    
    this.mostRecentTime = 0;    

    this.loadAttributes = function(notify)
    {
        this.attributes = {}
        ili_loadJSON("/api/v1/feeds/" + this.id, this.attributes, notify);
    }
    
    this.loadTags = function(notify)
    {
        this.tags = {}
        ili_loadJSON("/api/v1/feeds/" + this.id + "/tags", this.tags, notify);
    }
}

ili_FeedSocket = function(observers, webSocket) { 
    var that = this;
    var heartBeatTimer;
    this.observers = observers;
    this.ws = webSocket;

    this.feeds = {};
    observers.forEach(function(observer) {
        Object.keys(observer.feeds).forEach(function(key) {
            if (!key in feeds) feeds[key] = observer.feeds[feed]
            feeds[key].observerCount++;
        });
    });

    this.open = function()
    {
        console.log("Opening remote websocket");
        this.ws.parent = this;
        var that = this;

        heartBeatTimer = setInterval(function() {
            if (that.ws) {
                var message = JSON.stringify({
                    'action' : 'heartbeat'
                })
                console.log("sending heartbeat " + message);
                that.ws.send(message);
            }
            else {
                console.log('not currently connected');
            }
        }, 10000);

        this.ws.onmessage = function (msg)
        {
            console.log('got message ' + msg.data);
            var message = JSON.parse(msg.data);
            if (!message.guid in this.parent.feeds) {
              console.log("onMessage: Incoming feed data for id "+message.id+" does not have an entry in config");
              return;
            }
            var feed = this.parent.feeds[message.guid];

            for (var val in message.values)
            {
                var time = parseFloat(val);
                if (feed.aggregated) {
                    // aggregated samples are for the previous period
                    time -= feed.step;
                    if (time < 0)
                        time = 0;
                }
                var value = message.values[val];
                if (value === "NaN") {
                    value = 0.0;
                } if (value) {
                    value = parseFloat(value);
                }

                feed.values[time] = value;
                if (time > feed.mostRecentTime) {
                    feed.mostRecentTime = time;
                    feed.mostRecentValue = value;
                }
            }

            if (Object.keys(feed.values).length === 0) { 
                console.log("feed contained no values");
                this.parent.observers.forEach(function(observer) {
                    if (observer.respondNoData && observer.subscribed(feed.id)) {
                        observer.respondNoData();
                    }
                });
            } else {
                this.parent.observers.forEach(function(observer) {
                    if (observer.subscribed(feed.id)) {
                        observer.update(feed);
                    }
                });
            }
        };

        this.ws.onopen = function()
        {
            console.log("web socket has opened")
            this.parent.subscribeMany(this.parent.feeds);
        };

        this.ws.onclose = function(evt)
        {
            console.log("socket close occurred", evt.reason);
            var that = this;
            clearInterval(heartBeatTimer);
            setTimeout(function(){ that.parent.open();}, 10000);
        };

        this.ws.onerror = function(err)
        {
            console.log("socket error occurred",err.data);
        }
    }

    this.subscribe = function (feed) {
        var that = this;
        if (feed.start == 0) {
            feed.start = (new Date() / 1000) | 0;
        }
        if (that.ws) { 
            var message = JSON.stringify({
                'action' : 'subscribe',
                'guid'   : feed.id,
                'start'  : feed.start
            });
            console.log('sending subscription ', message);
            that.ws.send(message);
        }
        else {
            console.log('not currently connected');
        }
    }
    
    this.removeObserver = function(observerToRemove) {
        var index = this.observers.indexOf(observerToRemove); 
        if (index == -1) {
            return;
        }
        var that = this;
        Object.keys(observerToRemove.feeds).forEach(function(key) {
            var feed = that.feeds[key];
            feed.observerCount--;
            console.log('feed has ' + feed.observerCount + ' observers');
            if (feed.observerCount <= 0) {
                console.log('feed has no more observers, unsubscribing');
                that.unsubscribe(feed);
                delete that.feeds[key];
            }
        });
        this.observers.splice(index, 1);
    }
    
    this.removeAllObservers = function() {
        var that = this;

        observers.forEach(function(observer) {
            that.removeObserver(observer);
        });
    }
    
    this.updateObserver = function(observer) {
        var that = this;
        Object.keys(observer.feeds).forEach(function(key) {
            var feed;
            if (key in that.feeds) {
                console.log("feed " + key + " is already subscribed to ");
                feed = that.feeds[key];
                //if ((observerToAdd.feeds[key].start != 0) && (observerToAdd.feeds[key].start < feed.start)) {
                //    feed.start = observer.feeds[key].start;
                //}
            }
            else {
                console.log("feed " + key + " is not currently subscribed to, adding subscription");
                feed = new ili_Feed(key);
                feed.start = observer.feeds[key].start;
                feed.attributes =observer.feeds[key].attributes;
                feed.tags = observer.feeds[key].tags;

                that.feeds[key] = feed;
                that.subscribe(feed);
            }
            //TODO: This is not correct, it will record observers multiple times.
            feed.observerCount++;
        });   
    }
    
    this.addObserver = function(observerToAdd) {
        var index = this.observers.indexOf(observerToAdd);
        if (index != -1) {
            return;
        }   
        this.observers.push(observerToAdd);
        this.updateObserver(observerToAdd);
    }

    this.subscribeMany = function(feeds) {
        var that = this;
        Object.keys(feeds).forEach(function(key) {
            that.subscribe(feeds[key]);
        });
    }

    this.unsubscribe = function(feed) {
        //todo: do not unsubscribe a feed if another observer is using it
        console.log('unsubscribing from feed: ' + feed.id)
        if (that.ws) {
            this.ws.send(JSON.stringify({'action' : 'unsubscribe', 'guid' : feed.id}));
        }
        else {
            console.log('not currently connected');
        }
    }

    this.unsubscribeMany = function(feeds) {
        var that = this;
        Object.keys(feeds).forEach(function(key) {
            that.unsubscribe(feeds[key]);
        });
    }

    this.unsubscribeAll = function()
    {
        this.unsubscribeMany(this.feeds);
    }

    this.close = function()
    {
        this.unsubscribeAll();
        this.ws.onclose = function () {};
        this.ws.onerror = function () {};
        this.ws.close();
    }
}
