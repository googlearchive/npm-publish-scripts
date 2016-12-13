---
layout: index
title: "Building a Github Pages Site"
navigation_weight: 2
---

# Building a Github Pages Site

To get started with a Github Pages site you can use the `init` command to
add the required fields to build the site and configure it to use the correct
theme.

    npm-publish-scripts init

With this you should be set to use Jekyll. To test your site locally you'll
need the appropriate dependencies configured.

    rvm install 2.2.0
    rvm use 2.2.0
    gem install bundler
    rvm . do bundle install

The above commands install the correct version of Ruby and use it for this
project using [RVM](https://rvm.io/). Bundler is used to then manage
dependencies.

With this done, you should be able to serve your site as if it were on Github
pages like so:

    npm-publish-scripts serve

At this point, unless you have anything in a docs directory, your site will
be empty, so let's look at adding an index page.

## Writing Content

To add pages to your Github Pages site, create a directory `docs` at the root
of your project and add markdown files here, to start with make a file
`docs/index.md` and add the following:

```markdown
---
layout: index
title: "Usage"
navigation_weight: 0
left_column: |
  # Why

  Why should someone care about your module?

  1. Is it awesome?
  1. Is it useful?

  Any closing comments or remarks?
right_column: |
  # Install

  To install my module, do the following:

      npm install my-module -g
---

# Hello World
```

Now you can run the `serve` command again and view your new page.

    npm-publish-scripts serve

## Publish to Github

When you are ready to push your changes to Github, we need to first enable
Github Pages on your repo.

On `github.com`, Go to `Settings > Github Pages > Source` and select
'gh-pages branch'.

Then run the following command to push the latest changes:

    npm-publish-scripts publish-docs
