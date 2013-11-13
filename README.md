meteor-quickstart
=================

This is an example Intelligent.li application using the Meteor. It serves as both an example Intelligent.li application and a template for you to quickly get started building your own Intelligent.li application. [Meteor](http://meteor/) is an open-source platform for building top-quality web apps in a fraction of the time, whether you're an expert developer or just getting started.

These instructions assume you are familiar with, git and *NIX type systems, I'll be using OSX but the instructions should work for other systems such as Ubuntu and even Cygwin.

We'll be using meteorite to manage node package dependencies, so first we'll need to install the node package manager `nom` and then meteorite:
    
    $ curl http://npmjs.org/install.sh | sh
    $ sudo -H npm install -g meteorite
    
now, clone the meteor-quickstart git repository:

    $ git clone git@github.com:intelligent-li/meteor-quickstart.git
    
and then install the dependant packages:
    
    $ cd meteor-quickstart
    $ mrt update        

We need to give your application credentials to talk to Intelligent.li. To do this create a new key using the Intelligent.li management console, associate it with your scope, and download it locally. Copy the key into the `private` directory of your new repository as `client.pem` so that your application can connect to Intelligent.li. This key determines which scope your Intelligent.li application has access to. However, you'll need to pull the private key out of the `client.pem` file (everything between `-----BEGIN PRIVATE KEY-----` and `-----BEGIN PRIVATE KEY-----` and put it into `key.pem` in the `private` directory. 

You're ready to start up your application:

    $ mrt
    
Now point your browser to `http://localhost:3000/` and see the front page of your new application up and running locally. So let's get it onto the internet:

    $ meteor deploy intelligent-li-quickstart
    Deploying to intelligent-li-quickstart.meteor.com.  Bundling...
    Uploading...
    Now serving at intelligent-li-quickstart.meteor.com

now if you go to `intelligent-li-quickstart.meteor.com` you'll see your application up and running on the internet. 

***TODO: The deploy doesn't work at the moment, I'll be looking into it***

