---
layout: index
title: "Project Title"
navigation_weight: 0
---

This project is a set of template that kick-start a new Github Project.

With can be used with Github Pages
to show off your project. The idea is that it'll make it simple to customise
as much or as little as you want, test locally and git going as quickly as
possible.

# Image of Site on Desktop and Mobile

Right Here.

# Features

- Easily test locally
- Auto populates the site with Github Pages Meta Data but it's easy to
  customize / overwrite.
- Templates for:
  - Jekyll
  - JSDoc

You can see how very components of the template looks on the <a href="{{ project_root_url }}/styleguide">styleguide</a>.

# Get Started

There are two ways you can get going with this project.

You can use this template as is by following the quick start guide or you can
fork it on github and customize as much as you like.

<p class="u-center">
  <a class="button" href="{{ project_root_url }}/quick-start">
    Quick Start
  </a> <a class="button" href="">
    Fork Me on Github
  </a>
</p>

{% comment %}
# Releases

{% include release-list.html title="Stable" releaseData=site.data.gendoclist.releases.stable releaseType="stable" %}

{% include release-list.html title="Beta" releaseData=site.data.gendoclist.releases.beta releaseType="beta" %}

{% include release-list.html title="Alpha" releaseData=site.data.gendoclist.releases.alpha releaseType="alpha" %}

# Github Branches
{% for doc in site.data.gendoclist.docs %}
[View the docs for {{doc | capitalize}}]({{ doc | prepend: "/docs/" | prepend: site.github.url | replace: 'http://', 'https://' }})
{% endfor %}

{% endcomment %}
