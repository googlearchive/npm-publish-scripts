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

The `publish-release.sh` will look for **NPM Run Scripts** that perform each
of the above steps. Initially add the following to your `package.json` file.

```json
"scripts": {
  "build": "echo 'No Build Step.'",
  "test": "echo 'No Tests Defined.'"
}
```

If you have a build process (i.e. running `gulp` to minify / alter your
code before a release) configure it in the `build` NPM script.

The `test` script should run any tests you have for you project.

Here's an example set of NPM scripts:

```json
"scripts": {
  "build": "echo 'Skip Build Step.'",
  "test": "npm run lint && mocha",
  "lint": "eslint ./**/*.js",
}
```

Once you have the NPM Scripts set up, the next step is to kick off a release.

# Performing a Release

The easiest way to do this is to add a `publish-release` NPM script to your
`package.json` like so:

```json
"scripts": {
  "build": "echo 'Skip Build Step.'",
  "test": "npm run lint && mocha",
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

# Controlling Files Being Shipped

When publishing a module to NPM you should be considerate of what files you
publish. Save bytes for developers and users of your modules.

Make use of`.npmignore` to ensure files that aren't required are
[excluded from the final release](https://docs.npmjs.com/misc/developers#keeping-files-out-of-your-package).

If you have particular files and directories you wish to include you can
use the `files` parameter in [package.json](https://docs.npmjs.com/files/package.json#files).

This project has the following in `files` configuration in package.json.

    "files": [
      "build/"
    ]

With this NPM will publish generic files like README and LICENSE, but will also
move the contents of the 'build/' directory into the root of the NPM modules.

If you want to test what will be published run `npm link`, go to an empty
directory and `npm install <name of your module>`. This will install your
local module as if it was retrieved from the npm repository.

# Testing During a Release

There may be tests that you don't want to run before a release (i.e.
particularly flakey tests or browsers that are known to fail).

In this scenario you can look for the **RELEASE_SCRIPT** environment variable
which will set to true if `npm run test` was called from `publish-release.sh`.

An example of skipping tests would be:

    if (process.env.TRAVIS || process.env.RELEASE_SCRIPT) {
      // Selenium Tests are Flakey
      this.retries(3);
    }
