Feeds = new Meteor.Collection("feeds");
Samples = new Meteor.Collection("samples");

var clientId = uuid.v4();
var observer = null;
var previousValue = 0;

Meteor.autorun(function () {
    Meteor.subscribe("feeds");
});

Meteor.startup(function() {
    Meteor.call('keepalive', clientId);
});

Meteor.setInterval(function () {
    console.log("keepalive " + clientId);
    Meteor.call('keepalive', clientId);
}, 20000);

Template.ili_example.feeds = function () {
    return Feeds.find({}).fetch();
};

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

Template.ili_example.events = {
    'click #subscribe' : function () {
        var guid = document.getElementById("guid").value;
        Meteor.call("subscribe", guid, clientId, function(error) {
            
            if (sampleSub) sampleSub.stop();

            sampleSub = Meteor.subscribe("samples", guid);
            
            if (observer) observer.stop();

            observer = Samples.find().observeChanges({
                changed: function(id, fields) {
                    updateSample(fields.value);
                }
            });
        });
    }
}
