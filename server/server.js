//
// Sample Intelligent.li application that using Meteor
// 
// Currently this only provides the latest value for the 
// feed to the client, which means it doesn't support charts etc.
// this is something we'll improve in time. 
Feeds = new Meteor.Collection("feeds");
Samples = new Meteor.Collection("samples");
Connections = new Meteor.Collection("connections");

//maintains the feed that each client is currently subscribed to.
var clientObservers = {};

var WebSocket = Meteor.require('ws');

//certificates for accessing ili
var clientPem = process.env.CERT || Assets.getText('client.pem');
var keyPem = process.env.KEY || Assets.getText('key.pem');
var caPem = Assets.getText('intelligent.li-ca.crt');

function publishLatestSample(feed) {
    Samples.update({ _id: feed.id }, { value: feed.samples.lastValue });
}

//load the list of feeds from the ili service, 
//TODO: this needs to be moved into the Intelligent.li.js 
//helper
function loadFeeds() {

    ili_feedCache.query("*", Meteor.bindEnvironment(function(result) {
        Samples.remove({}); 
        Feeds.remove({});
        
        result.each(function(k, v) {
            Feeds.insert({ _id: v });
            var feed = ili_feedCache.get(v);
            feed.load(function() { console.log(feed.tags.items); });
        });
    }, function () { 
        console.error('Failed to bind environment in loadFeeds()'); 
    }));
}

//called remotely by clients when they want to subscribe to the value for a 
//particular feed.
function subscribe(guid, clientId) {
    console.log("subscribing to: " + guid);
    
    var feed = ili_feedCache.get(guid);

    if (clientObservers[clientId]) {
        if (clientObservers[clientId].feed.id == guid) {
            console.log("this client is already subscribed to this feed");
            return;
        } else {
            removeClientSubscriptions(clientId);
        }
    }
    
    if (feed.samples.hasChangedObserver()) {
        console.log("there's already someone watching this feed");
        Samples.update({ _id: guid }, {$addToSet: { subscribers: clientId }});
    } else {
        console.log("we're the first to watch this feed");
        Samples.remove({ _id: guid });
        Samples.insert({ _id: guid, value: 0, subscribers : [ clientId ] });
    }
    
    var observer = Meteor.bindEnvironment(function() {
        console.log("got samples for feed " + feed.id);
        publishLatestSample(feed);
    }, function (e) { console.error('Failed to bind environment: ' + e.toString()); });

    clientObservers[clientId] = { feed: feed, onchanged: observer };
    console.log("feed.attributes.items: " + feed.attributes.items);
    console.log("feed.attributes.lastsample: " + feed.attributes.get('lastSample'));
    var ls = feed.attributes.get('lastSample');
    var interval = feed.attributes.get('interval');
    if (ls && interval) feed.start = ls - interval;
    feed.samples.onchanged(observer);
}

function removeClientSubscriptions(clientId) {
    console.log("removing subscription for client " + clientId);
    Samples.update({ subscriptions: clientId }, { $pull: { subscriptions: clientId } } );
    if (clientObservers[clientId] && clientObservers[clientId].feed) {
        clientObservers[clientId].feed.samples.removeChangedObserver(clientObservers[clientId].onchanged);
        clientObservers[clientId] = {}
    }
}

function keepalive(clientId) {
    if (!Connections.findOne(clientId)) {
        Connections.insert({ _id: clientId});
    }    
    console.log("got keepalive from " + clientId);
    Connections.update(clientId, {$set: {last_seen: (new Date()).getTime()}});
}

// clean up missing clients after 60 seconds
Meteor.setInterval(function () {
    var now = (new Date()).getTime();
    Connections.find({last_seen: {$lt: (now - 60 * 1000)}}).forEach(function (connection) {
        console.log("client " + connection._id + " has gone away");
        removeClientSubscriptions(connection._id);
        Connections.remove({ _id: connection._id });
    });
}, 10000);

function getSamplesForFeed(feedGuid) {
    return Samples.find({ _id : feedGuid });
}

Meteor.startup(function () {
    
    Connections.remove({});
    ili_api.certs = { cert: clientPem, key: keyPem, ca: caPem }; 
    ili_api.start(function(uri) {
        return new WebSocket(uri, ili_api.certs);
    });

    Meteor.methods({
        subscribe: subscribe, 
        keepalive: keepalive
    });

    loadFeeds();

    Meteor.publish("feeds", function() {
        return Feeds.find();
    });

    Meteor.publish("samples", getSamplesForFeed);

});
