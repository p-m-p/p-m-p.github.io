---
layout: post
title: A contractors development environment
categories: vim contracting
---

I wrote about the road to becoming a contractor last week where I discussed
the decision making process and some of the day to day differences from being a
permanent employee. One thing I failed to discuss was the logistics involved
with moving around and how I manage my development environment. In this post I
want to share my setup and how I have tuned this so that I am able to get
installed quickly and be productive on the different machines I have to work on.

##The development environment
I've been a full time Vim coder for a few years now. The terminal is where
I spend about 90% of my productive time and I use Tmux for splitting my
workflow across mulitiple windows, panes and sessions. I use Git on nearly
every project I work on and of course I have a [customised PS1][custom-prompt]
to show which branch I'm working on etc, etc. I have a select few plugins
installed in my Chrome browser some of which require additional programs to
be installed locally and a few little extra helper scripts I've accumulated.
The question then is how do I take this setup with me as I go from company to
company?

##Use a Google business account
I use a Google business account on which I have a profile for Chrome which only
installs the bookmarks, plugins and settings that are relevant, and
appropriate, to be installed on a client's computer. I also use this account
for my company email and this all costs me just &pound;3.30 a month. There are
many other benefits to having this account such as the cloud storage and many
other apps I don't personally use very often.

##Package your config files
Git is my choice for storing and maintaining my configuration files and other
bits I require to setup my development environment. I have my small
[configs repository on Github][configs-repo] in which I store all of my config
files along with a [little bash script][install-script] to move them to the
home directory. This script also sets up my editor and installs the plugins I
use. What this does is enable me to get setup into my natural feeling
environment on a new machine within minutes. The only overhead being to
generate an SSH key to use for Github on the clients machine.

##Separate environments on a single machine
When working on your own computer it's a good idea to have each clients
environemtn separated. You'll often need different versions of software
installed and having to manage these on a single environment can be a pain. For
this I use Vagrant with some real simple Chef recipes to get my base
environment setup and me working. It installs my config files, the software I
use on near every project like Node.js with Grunt and Ruby with Bundler and is
up and ready to get setting up the clients environment in minutes. If I'm
real lucky the client has their own Vagrant setup and all I need do is install
my configs.

[custom-prompt]: http://
[configs-repo]: http://github.com/p-m-p/configs
[install-script]: http://
[vagrant]: http://
