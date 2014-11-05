---
layout: post
title:  "Adaptor, responsive 3D content slider"
date:   2014-11-04 17:55:07
categories: JavaScript, jQuery
---

Adaptor (AKA jQuery Box Slider) has been about for a couple of years now and
in it's infancy was somewhat revolutionary utilising new browser capabilities.
Since then it had gathered dust and browser implementations have moved on but
despite this the project has seen a slow growth of stars and forks on Github
with most of [issues](github-issues) being around the fact that the plugin
was not responsive. I've recently been able to take the opportunity to spend
some time to make the existing slide effects responsive and in the process
have made some performance improvements to both the core and effect plugins.

You can see [a demo](demo-page) of the plugin with all of the currently
supported effects and find the documentation in the README file on the
[Github repository](github-repo).

## Using the plugin
I've aimed to create the plugin so that there is no specific styling required
but there is a required HTML structure for the three dimensional transitions.
Below is an example of the HTML for scrolling 3D transitions where it is
required that the box is wrapped in a viewport to which the correct perspective
can be applied.

Need to add gist here.

With the correct HTML structure in place all that is required is that the
plugin be applied to the rotatng box, not the parent viewport as below.

[demo-page]: '/demos/box-slider/'
[github-repo]: 'https://github.com/p-m-p/jquery-box-slider'
[github-issues]: 'https://github.com/p-m-p/jquery-box-slider/issues'
