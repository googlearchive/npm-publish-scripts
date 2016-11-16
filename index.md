---
layout: index
title: "Local Development"
navigation_weight: 0
---
{% capture why_text %}
# Why

This is an example why sections

1. List item 1.
1. List item 2.
1. List item 3.

If your project suffers from human errors when releasing, has build files in the
master branch or you simply want reference docs, then this module may be useful.
{% endcapture %}

{% capture install_text %}
# Install

This module contains shell scripts and themes for Jekyll and JSDoc.
Simple install via NPM like so:

    npm install npm-publish-scripts --save-dev
{% endcapture %}

{% include components/two-column.html left=why_text right=install_text %}
