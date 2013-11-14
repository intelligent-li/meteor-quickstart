meteor-quickstart
=================

This is an example Intelligent.li application using the Meteor. It serves as both an example Intelligent.li application and a template for you to quickly get started building your own Intelligent.li application. [Meteor](http://meteor/) is an open-source platform for building top-quality web apps in a fraction of the time, whether you're an expert developer or just getting started.

These instructions assume you are familiar with, git and *NIX type systems, I'll be using OSX but the instructions should work for other systems such as Ubuntu and even Cygwin.

We'll be using meteorite to manage node package dependencies, so first we'll need to install the node package manager `nom` and then meteorite:
    
    $ curl https://npmjs.org/install.sh | sh
    $ sudo -H npm install -g meteorite
    
now, clone the meteor-quickstart git repository:

    $ git clone git@github.com:intelligent-li/meteor-quickstart.git
    
and then install the dependant packages:
    
    $ cd meteor-quickstart
    $ mrt update        

We need to give your application credentials to talk to Intelligent.li. To do this create a new key using the Intelligent.li management console, associate it with your scope, and download it locally. Copy (or link) the key into the `private` directory of your new repository as `client.pem` and as `key.pem` (two files) so that your application can connect to Intelligent.li. This key determines which scope your Intelligent.li application has access to. You're ready to start up your application:

    $ mrt
    
Now point your browser to `http://localhost:3000/` and see the front page of your new application up and running locally. 

## Deploy to meteor.com

So let's get it onto the internet via meteor.com, I'm using the name `intelligent-li-quickstart`, you'll want to choose something different:

    $ mrt deploy intelligent-li-quickstart.meteor.com

    Stand back while Meteorite does its thing

    Done installing smart packages

    Ok, everything's ready. Here comes Meteor!

    Deploying to intelligent-li-quickstart.meteor.com.  Bundling...
    Uploading...
    Now serving at intelligent-li-quickstart.meteor.com

now if you go to `intelligent-li-quickstart.meteor.com` you'll see your application up and running on the internet!

## Deploy to Heroku

Signup for an heroku account if you haven't got one already, but don't create an app just yet, well do it later via the command line. The Heroku build pack we are going to use uses the mongohq:sandbox add-on, this requires your Heroku account to be verified, i.e. you need to supply your credit card details to Heroku [here](https://heroku.com/verify). Nothing should be charged to your card.

You'll need to install the heroku tool belt, by following the instructions [here](https://devcenter.heroku.com/articles/quickstart#step-2-install-the-heroku-toolbelt). 

first thing to do it setup heroku

     $ heroku login     

     Enter your Heroku credentials.
     Email: adam@example.com
     Password:
     Could not find an existing public key.
     Would you like to generate one? [Yn]
     Generating new SSH public key.
     Uploading ssh public key /Users/adam/.ssh/id_rsa.pub

then, create the heroku app using the meteorite builpack, I'm using the name `intelligent-li-quickstart`, you'll want to choose something different:
    
    $ heroku create intelligent-li-quickstart --buildpack https://github.com/oortcloud/heroku-buildpack-meteorite.git
 
We need to setup the intelligent.li certificates. The way Heroku deals with private data is to use environment variables, so we need to add our certificate, key and the intelligent.li ca certificate as Heroku configuration items. This is a little messy so bear with me.

cat you certificate pem file:

    $ cat ~/certs/5cd3aab5-56e4-43sa-8271-70f094d80781.pem 
    
and copy everything from `-----BEGIN CERTIFICATE-----` to `-----END CERTIFICATE-----` and then paste it between quotes in the heroku config command:

    $ heroku config:add CERT="-----BEGIN CERTIFICATE----- <data > -----END CERTIFICATE-----"
    
you need to repeat this for the key, which is everything between the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`

    $ heroku config:add KEY="-----BEGIN PRIVATE KEY----- <data> -----END PRIVATE KEY-----"
    
now go back to your `meteor-quickstart` folder

    $ cd meteor-quickstart
    
and then we add a remote for the heroku repository    

    $ heroku git:remote -a intelligent-li-quickstart
    
and deploy the app to heroku 

    $ git push heroku master   
