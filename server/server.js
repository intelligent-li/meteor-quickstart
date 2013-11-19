//
// Sample Intelligent.li application using Meteor
// 

//certificates for accessing ili
var clientPem = process.env.CERT || Assets.getText('client.pem');
var keyPem = process.env.KEY || Assets.getText('key.pem');
var caPem = Assets.getText('intelligent.li-ca.crt');
var WebSocket = Meteor.require('ws');

Meteor.startup(function () {
  ili_Api.certs = { cert: clientPem, key: keyPem, ca: caPem }; 
  ili_Api.start(function(uri) {
    return new WebSocket(uri, ili_Api.certs);
  });
});
