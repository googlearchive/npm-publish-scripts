---
layout: index
title: "Want to Contribute?"
navigation_weight: 4
---
# Developer Notes

Looking to make a change to the template or logic? Here are some notes
that may be helpful:

## Installing Dependencies.

Make sure you have RVM + Jekyll set up to build the site.

- [Install RVM](https://rvm.io/rubies/default)
- Set RVM Default to 2.2.0
    - `rvm install ruby-2.2.0`
    - `rvm --default use 2.2.0`
- Install Bundler `gem install bundler`
- Install dependencies: `rvm . do bundle install`

You'll also need the NPM dependencies install + the Gulp CLI installed.

- Install NPM Dependencies `npm install`
- Install Gulp `npm install gulp -g`

## Testing Changes

The easiest way to make changes and see their effect is to remove any global
install you currently have of this module:

    npm-publish-scripts remove -g npm-publish-scripts

Then build the local module:

    gulp

Finally link your local version of the module so NPM uses it from this point
onward:

    npm link

Now when you make changes, run the `serve` command after building your changes:

    gulp && npm-publish-scripts serve

You can set a Github Token to your `env` variables to increase the Github
API quota (if you need to).

1. [Create a token here](https://github.com/settings/tokens).
1. Add `JEKYLL_GITHUB_TOKEN=<Your New Token>` to your .bashrc or .zshrc file.

Finally, you can run the lint and unit tests locally with:

    npm run test
