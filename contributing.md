---
layout: index
title: "Want to Contribute?"
navigation_weight: 4
---
# Developer Notes

Looking to make a change to the template or shell script in this project? If
so here are some notes that may be helpful:

## Developing the Jekyll Theme

There is a sample site include in this repo that you can use to see how
changes to the Jekyll template will affect the output.

To try it out you'll need to install the dependencies.

### Installing Dependencies.

- [Install RVM](https://rvm.io/rubies/default)
- Set RVM Default to 2.2.0
    - `rvm install ruby-2.2.0`
    - `rvm --default use 2.2.0`
- Install Bundler `gem install bundler`
- Install dependencies: `rvm . do bundle install`
- Install NPM Dependencies `npm install`
- Install Gulp `npm install gulp -g`

### Testing Changes

To make changes to the theme and see how they affect the content, simply
run the `dev` task in gulp.

    gulp dev

This should watch for changes and Jekyll should rebuild the site automatically.

You can set a Github Token to your `env` variables to increase the Github
API quota.

1. [Create a token here](https://github.com/settings/tokens).
1. Add `JEKYLL_GITHUB_TOKEN=<Your New Token>` to your .bashrc or .zshrc file.

## Developing the JSDoc Theme

Follow the same steps above and you should see changes are reflected in the
**stable** reference documentation.

## Developing the Shell Scripts

At the moment I have no convenient way to test the shell scripts.

The best advice is to try the your changes by publishing docs / release
for a project, releasing alpha / beta versions.

If you have any ideas on a better approach please raise an issue.
