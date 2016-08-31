---
layout: index
title: "Home"
navigation_weight: 0
---

# Why

There are two primary reasons this project exists:

1. To give a common way to release versions of projects on NPM.
1. To offer a consistent look and feel for GitHub pages and to encourage
a more structured way of documenting projects.

A lot of this work was born out of build files living in the master branch
of Github, a release resulting in multiple releases due to human error or
releases being blocked of only one person knowing the process.

# Install

This module contains shell scripts and themes for Jekyll and JSDoc. To use
any of this you first need to install the module via NPM.

    npm install npm-publish-scripts --save-dev

# Usage

In the project you wish to add the release script to perform the following
steps.

## Setup NPM Run Scripts

When you want to publish to NPM there are a few steps that should be taken
before anything is published.

1. *Build* the project if needed final release. An example would be minifying
   code for use in browsers.
1. *Test* the project to make sure what is released actually works.
1. *Build documentation* so it can be shared with the release.
1. *Bundle* the source code, build files, documentation and other files
   you want to be shipped in the NPM Module.

The `publish-release.sh` will look for **NPM Run Scripts** that perform each
of the above steps. Initially add the following to your `package.json` file.

```json
  "scripts": {
    "build": "echo 'No Build Step.'",
    "test": "echo 'No Tests Defined.'",
    "build-docs": "echo 'No Build Docs Step.'",
    "bundle": "No 'Bundle Step Defined.'"
  }
```

If you have a build process (i.e. running `gulp`) configure it in the `build`
NPM script. Any test configuration you have should be defined in `test`.
`build-docs` should output any reference docs you have into './reference-docs/'.
Lastly, the `bundle` script will be given a directory as an argument that should
be used to copy files you wish to publish into.

Here's an example set of NPM scripts for each of these steps:

```json
"scripts": {
    "build": "echo 'Skip Build Step.'",
    "test": "npm run lint && mocha",
    "build-docs": "jsdoc -c ./jsdoc.conf",
    "bundle": "./project/create-release-bundle.sh",
    "lint": "eslint ./**/*.js",
  },
```

The shell script for the `bundle` script looks like this:

```bash
#!/bin/bash
set -e

if [ "$BASH_VERSION" = '' ]; then
 echo "    Please run this script via this command: './<Script Location>/<Script Name>.sh'"
 exit 1;
fi

if [ -z "$1" ]; then
  echo "    Bad input: Expected a directory as the first argument for the path to put the final bundle files into (i.e. ./tagged-release)";
  exit 1;
fi

# Copy over files that we want in the release
cp -r ./reference-docs $1
cp -r ./src $1
cp LICENSE $1
cp package.json $1
cp README.md $1
```

## Setup `publish-release.sh`

Once you have the NPM Scripts set up, the next step is to kick off a release.
The easiest way to do this is to add a `publish-release` NPM script to your
package.json.

```json
"scripts": {
  "publish-release": "publish-release.sh"
}
```

To perform a release you can run the script like so:

    npm run publish-release < patch | minor | major > < alpha | beta | stable>

You *must* define `patch`, `minor` or `major` when performing a release, this
will let the script bump the version for you.

The `alpha`, `beta` or `stable` tag is optional, by default a release is
treated as stable.

When you first start using this module you probably want to perform releases
using the `alpha or `beta` label in case there are any issues.

# Want to Publish Docs?

This should include any reference docs or relevant information / guides.
