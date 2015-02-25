---
layout: post
title: A contractors development environment
categories: contracting
---

I wrote about the road to becoming a contractor last week where I discussed
the decision making process and some of the day to day differences from being a
permanent employee. One thing I failed to discuss was the logistics involved
with moving around and how I manage my development environment. In this post I
want to share my setup and how I have tuned this so that I am able to get
installed quickly and be productive on the different machines I have to work on.

##The development environment
I've been a full time [Vim][vim] coder for a few years now. The terminal is
where I spend about 90% of my productive time and I use Tmux for splitting my
workflow across multiple windows, panes and sessions. I use Git on nearly
every project I work on and of course I have a [customised PS1][custom-prompt]
to show which branch I'm working on etc, etc. I have a select few plugins
installed in my Chrome browser some of which require additional programs to
be installed locally and a few little extra helper scripts I've accumulated.
The question then is how do I take this setup with me as I go from company to
company?

##Use a Google business account
I use a [Google business account][google-business] on which I have a profile
for Chrome that only installs the bookmarks, plugins and settings that are
relevant and appropriate for the work I will be doing on the client's computer.
I also use this account for my company email and it only costs me &pound;3.30
a month. There are other benefits to having this account such as the cloud
storage which ties into Google's suite of cloud applications.

##Package your config files
Git is where I store and maintain my configuration files. I have a
[repository on Github][configs-repo] that contains these files along with a
[bash script][install-script] that moves them to the right location on the new
machine and carries out some other setup including the install of the
vim plugins I use. This enables me to get setup and into my natural feeling
environment within just a few minutes. The only manual overhead with this being
to generate an SSH key to use for Github.

##Separate environments on a single machine
When working on your own computer it's a good idea to have each client
environment separated. You'll often need different versions of software
installed and having to manage this in a single environment is a pain. For this
I use [Vagrant][vagrant] with [Chef][chef] to quickly install and configure
virtual machine environments with all of the tools and software I require to
get working quickly. I have a very simple [cookbook][chef-repo] which installs
my config files from the package I described above and configures the software
I use on near every project such as Node.js with Grunt and Ruby with Rake and
Bundler. This cookbook installs an Nginx server and configures a working web
root ready to setup the clients project. If I'm lucky the client has their own
Vagrant setup and all I need do is install my configs in that environment. My
SSH configuration is forwarded to the virtual machine so that I don't have to
set up any additional keys for Github. As I work in the terminal I simply jump
into the new environment using `vagrant ssh` but for those of you who have a
different workflow you can choose to sync local folders with the virtual
machine. In my case the `sites` directory that is the web root on the virtual
machine is bridged to a local directory so I that can easily drop files
between my local machine and the virtual machine but you could also use this to
edit the files with your editor of choice and the local installations of your
favourite development tools.

There is some up-front work to figure out the tools I've mentioned here but its
not beyond anybody. You don't need to be a DevOps hero or work with Vim (but
you should, everyone should use Vim!). The key thing to take away from this is
to empower yourself to be productive. I know that if I spill coffee over my
laptop tomorrow I can get back to where I was within minutes of acquiring a new
one. There is some additional workflow to this such as making regular pushes to
a remote repository on the projects you work but this is all just good practice
that should be followed regardless of your setup. I've only touched lightly on
the concepts here so please feel free to ask any additional questions
[on twitter][twitter].

[vim]: http://www.vim.org/
[custom-prompt]:http://www.cyberciti.biz/tips/howto-linux-unix-bash-shell-setup-prompt.html
[google-business]: https://www.google.co.uk/business
[configs-repo]: https://github.com/p-m-p/configs
[install-script]: https://github.com/p-m-p/configs/blob/master/install.sh
[vagrant]: https://www.vagrantup.com/
[chef]: https://www.chef.io/
[chef-repo]: https://github.com/p-m-p/development-env
[twitter]: https://twitter.com/phil_parsons
