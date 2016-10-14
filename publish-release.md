---
layout: index
title: "Publishing a Release"
navigation_weight: 1
---

# Publishing a Release

When you want to publish to NPM there are a few steps that should be taken
before anything is published.

1. *Build* the project if needed final release. An example would be minifying
   code for use in browsers.
1. *Test* the project to make sure what is released actually works.
1. *Bundle* the source code, build files, documentation and other files
   you want to be shipped in the NPM Module.

The `publish-release.sh` will look for **NPM Run Scripts** that perform each
of the above steps. Initially add the following to your `package.json` file.

```json
"scripts": {
  "build": "echo 'No Build Step.'",
  "test": "echo 'No Tests Defined.'",
  "bundle": "No 'Bundle Step Defined.'"
}
```

If you have a build process (i.e. running `gulp` to minify / alter your
code before a release) configure it in the `build` NPM script.

The `test` script should run any tests you have for you project.

Lastly, the `bundle` script will be given a directory as an argument
that should be used to copy the final set of files into.

Here's an example set of NPM scripts:

```json
"scripts": {
  "build": "echo 'Skip Build Step.'",
  "test": "npm run lint && mocha",
  "bundle": "./project/create-release-bundle.sh",
  "lint": "eslint ./**/*.js",
}
```

An example shell script for the `bundle` step (in this example called
`create-release-bundle.sh`) could look like this:

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
cp -r ./src $1
cp LICENSE $1
cp package.json $1
cp README.md $1
```

Once you have the NPM Scripts set up, the next step is to kick off a release.

# Performing a Release

The easiest way to do this is to add a `publish-release` NPM script to your
`package.json` like so:

```json
"scripts": {
  "build": "echo 'Skip Build Step.'",
  "test": "npm run lint && mocha",
  "bundle": "./project/create-release-bundle.sh",
  "lint": "eslint ./**/*.js",
  "publish-release": "publish-release.sh"
}
```

NPM will find `publish-release.sh` in `node_modules/npm-publish-scripts/`.

To perform a release you can run the script like so:

    npm run publish-release < patch | minor | major > < alpha | beta | stable>

You **must** define `patch`, `minor` or `major` when performing a
release. The script will bump the version in `package.json` for you.

The `alpha`, `beta` or `stable` tag is optional, by default a release is
treated as stable.

> When you first start using this module you probably want to
> perform releases using the `alpha` or `beta` label in case there are
> any issues.

## Testing During a Release

There may be tests that you don't want to run before a release (i.e.
particularly flakey tests or browsers that are known to fail).

In this scenario you can look for the **RELEASE_SCRIPT** environment variable
which will set to true if `npm run test` was called from `publish-release.sh`.

An example of skipping tests would be:

    if (process.env.TRAVIS || process.env.RELEASE_SCRIPT) {
      // Selenium Tests are Flakey
      this.retries(3);
    }
