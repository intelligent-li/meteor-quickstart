var clientId = uuid.v4();
var observer = null;
var previousValue = 0;

Meteor.autorun(function () {
  Meteor.subscribe("feeds");
});

var feeds = Session.set("feeds", []); 
var feeds = Session.set("tags", []); 

Template.ili_example.feeds = function(){
  return Session.get("feeds");
}  

Template.ili_example.tags = function(){
  return Session.get("tags");
}  

Meteor.startup(function() {
  ili.Api.instance.initialise(clientId);
  Meteor.call('keepalive', clientId);
  ili.feedCache.query("*", function(result) { 
    Session.set("feeds", result.values());
  });
});

Meteor.setInterval(function () {
  console.log("keepalive " + clientId);
  Meteor.call('keepalive', clientId);
}, 20000);

function updateSample(value) {
  if (value) {
    console.log("got new value: '" + value + "', previousValue: '" + previousValue + "'");
    d3.select(".samplev")
      .text(previousValue)
      .transition()
      .duration(1000)
      .ease('linear')
      .tween("text", function() {
        var i = d3.interpolate(this.textContent, value);
        return function(t) {
          this.textContent = Number(i(t)).toFixed(4);
        };
      });
    previousValue = value;
  }
}
var sampleSub = null;
var currentFeed = null;

Template.ili_example.events = {
  'click #subscribe' : function () {
    if (currentFeed) {
      currentFeed.feed.samples.removeChangedObserver(currentFeed.observer);
    }
    var guid = document.getElementById("guid").value;
    var feed = ili.feedCache.get(guid);
    feed.loadTags(function(){
      var tags = [];
      feed.tags.each(function(k,v){
        tags.push({name:k, value:v});
      });
      Session.set("tags", tags);
      console.log("Feed loaded: " + tags);
    });

    var observer = function(inserted, removed) {
      updateSample(feed.samples.lastValue);
    }

    currentFeed = { feed: feed, observer: observer };

    feed.samples.onchanged(observer);
  }
}
