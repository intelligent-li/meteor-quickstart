//
// Sample Intelligent.li application that using Meteor
// 
// Currently this only provides the latest value for the 
// feed to the client, which means it doesn't support charts etc.
// this is something we'll improve in time. 
Feeds = new Meteor.Collection("feeds");
Samples = new Meteor.Collection("samples");
Connections = new Meteor.Collection("connections");

var feedSocket = null;
var observer = null;

//certificates for accessing ili
var clientPem = Assets.getText('client.pem');
var keyPem = Assets.getText('key.pem');
var caPem = Assets.getText('ca.crt');

//sends a list of all feeds to the client
function publishFeeds(feedJSON) {
    feeds = JSON.parse(feedJSON);
   
    Samples.remove({}); 
    Feeds.remove({});

    for (var i = 0; i < feeds.length; i++)
    { 
        Feeds.insert({ _id: feeds[i]});
    }
}

function publishLatestSample(feed) {
    Samples.update({ _id: feed.id }, { value: feed.mostRecentValue });
}

//load the list of feeds from the ili service, 
//TODO: this needs to be moved into the Intelligent.li.js 
//helper
function loadFeeds() {
    var https = Npm.require('https');
    console.log("loading feeds from Intelligent.li");
    var feedsJSON = "";

    try {        
        var options = {
            host: 'au.intelligent.li',
            port: 443,
            path: '/api/v1/feeds',
            key: keyPem,
            cert: clientPem,
            ca: caPem,
            agent: false
        };

       var responseHandler = Meteor.bindEnvironment(function(res) {
            console.log("statusCode: ", res.statusCode);
            
            res.on('data', function(d) {
                feedsJSON += d;
            });

            res.on('end', Meteor.bindEnvironment(function() {
                publishFeeds(feedsJSON);
                console.log("feeds loaded");
            }, function () { console.error('Failed to bind environment 2'); }));
            res.on('error', function(e) {
                console.error(e);
            }); 
        }, function () { console.error('Failed to bind environment'); }); 

        var req = https.get(options, responseHandler);

    } 
    catch (e) {
        console.log(e.toString());
    }
}

//called remotely by clients when they 
//want to scubscribe to the value for a 
//particular feed.
function subscribe(guid, clientId) {
    console.log("subscribing to: " + guid);
    
    removeAllSubscriptions(clientId);

    if (guid in observer.feeds) {
        console.log("already subscribed with ili");
        Samples.update({ _id: guid }, {$addToSet: { subscribers: clientId }});
    } else {
        console.log("new ili subscription");
        Samples.remove({ _id: guid });
        Samples.insert({ _id: guid, value: 0, subscribers : [ clientId ] });

        var feed = new ili_Feed(guid, 0);
        feed.start = ili_timeNow(5) - 20; 
        observer.feeds[guid] = feed;
        feedSocket.updateObserver(observer);
    }
}

// connect to the intelligent.lo websocket service
function openFeedSocket(){

    var WebSocket = Npm.require('ws');
    
    feedSocket = new ili_FeedSocket(
        [], 
        new WebSocket("wss://au.intelligent.li/api/v1/live/feeds", 
            { cert: clientPem, key: keyPem, ca: caPem }));

    console.log('connecting to ili');
    feedSocket.open();
    console.log('connected');
  
    observer = new ili_Observer();
    observer.update = Meteor.bindEnvironment(function(feed) {
        publishLatestSample(feed);
    }, function (e) { console.error('Failed to bind environment: ' + e.toString()); });

    feedSocket.addObserver(observer);
}

function keepalive(uuid) {
    if (!Connections.findOne(uuid))
        Connections.insert({uuid: uuid});
   
    console.log("got keepalive from " + uuid);

    Connections.update(uuid, {$set: {last_seen: (new Date()).getTime()}});
}

function removeAllSubscriptions(uuid) {
    Samples.update({ subscriptions: uuid }, { $pull: { subscriptions: uuid } } );
    //TODO: need to update the ili subscriptions as well
}

// clean up missing clients after 60 seconds
Meteor.setInterval(function () {
    var now = (new Date()).getTime();
    Connections.find({last_seen: {$lt: (now - 60 * 1000)}}).forEach(function (user) {
        console.log("client " + uuid + " has gone, removing subscriptions");
        removeAllSubscriptions(uuid);
        Connections.remove({uuid: uuid});
    });
});

function getSamplesForFeed(feedGuid) {
    return Samples.find({_id : feedGuid });
}

Meteor.startup(function () {

    openFeedSocket();

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
