---
layout: index
title: "Travis to Github Pages"
navigation_weight: 4
---

# Travis to Github Pages

It's not uncommon to publish docs once it
lands in the master branch.

To do this, add the following to your ``.travis.yml` file.

```
  - if [[ "$TRAVIS_BRANCH" = "master" && "$TRAVIS_PULL_REQUEST" = "false" ]]; then npm install -g npm-publish-scripts && npm-publish-scripts publish-docs --non-interactive; fi
```

This will only run on the master branch and it'll install `npm-publish-scripts` and publish the docs.

Then add a `GH_TOKEN` and `GH_REF` environment variable to travis to where the token is a [Github Personal Access Token](https://github.com/settings/tokens/new) and the `GH_REF` should be the end of the SSH section, so if your Github Repo is:

```
git@github.com:GoogleChrome/npm-publish-scripts.git
```

Then `GH_REF` would be:

```
github.com:GoogleChrome/npm-publish-scripts.git
```
