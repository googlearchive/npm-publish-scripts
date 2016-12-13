---
layout: index
title: "Usage"
navigation_weight: 0
left_column: |
  # Why

  There are a few reasons why this project exists:

  1. To give a common way to release versions of projects on NPM.
  1. To offer a consistent look and feel for GitHub pages.
  1. Encourage a more structured way of documenting projects.

  If your project suffers from human errors when releasing, has build files
  in the master branch or you simply want reference docs, then use this.
right_column: |
  # Install

  This module is a CLI with themes for Jekyll and JSDoc.
  Install via NPM like so:

      npm install npm-publish-scripts -g
---

# Usage

1. # [Publishing a Release](./publish-release#main)

    The `publish-release` command will run the following steps
    when releasing a new version of a project to NPM:

    1. Perform any build steps.
    1. Run any tests the project has.
    1. Bump the version number and publish to NPM.

    Setting this up means releases are more consistent and anyone
    on the team can perform a release without needing to know
    or perform any manual steps.

1. # [Build a Github Pages Site](./build-github-pages#main)

    If you want to have stylised docs with versioning for reference
    documentation you can use the `publish-docs` command to create a doc
    site like this one.

    This module will manage a Jekyll theme and keep it up to date
    and if you have a `reference-docs` directory, it will generate
    a sorted version list for the theme to use.

1. # [Use the JSDoc Theme](./use-jsdoc-theme#main)

    To match the Jekyll theme, this project has a JSDoc theme. This
    is solely to give the Github Pages site a consistent look and feel.
