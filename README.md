# publish-scripts

A set of shell scripts to help with publishing to NPM (Helping deal with tagging, docs, Github Pages Publishing)

# Usage

1. Install module

```sh
npm install --save-dev npm-publish-scripts
```

1. Add NPM scripts for `npm-publish-scripts` to call when you publish

```json
"scripts": {
  "build": "gulp",
  "build-docs": "jsdoc",
  "test": "mocha",
  "bundle": "./project/create-release-bundle.sh"
}
```

### npm run build

This should build your project if you need it (i.e. minification or
transpilation).

### npm run build-docs

If you have docs this should generate call any scripts needed to generate
them.

### npm run test

This script will run your tests before releasing, this ensures the project
is healthy before the release is published.

### npm run bundle <Path>

When `npm run bundle` is called, it's given a directory as an argument.
This directory is where you should copy any and all files that you want to
be included in the final release. (i.e. docs, LICENSE, README, src/,
build/, etc). See
[project/create-release-bundle.sh](https://github.com/GoogleChrome/npm-publish-scripts/blob/master/project/create-release-bundle.sh)
to see what this project does in `bundle`.

1. To make this helper a little easier to use at publish time, you can add
   an npm script to use this.

```json
"scripts": {
 "publish-release": "publish-release.sh"
}
```

 Then to publish just call `npm run publish-release`.

 **NOTE:** Do NOT call this 'release', this conflicts with an NPM reserved
 command.

1. Finally, permform a release:

```sh
npm run publish-release minor stable
```

The options are:

 - `patch` | `minor` | `major`
 
This outlines the type of update, patch will bump 0.0.X value.
So for current version 0.0.1, a new patch release would be 0.0.2.

Minor goes from 0.0.1 to 0.1.1.

Major goes from 0.0.1 to 1.0.1

- `stable` | `alpha` | `beta`

This is the kind of release. Stable will publish on Github and NPM
as a normal release. Alpha or Beta will add a tag to NPM so users
must use `npm install project-name@alpha` or
`npm install project-name@beta`.
