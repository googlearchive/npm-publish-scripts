---
layout: index
title: "Publishing JSDocs"
navigation_weight: 3
---

# Publishing JSDocs

If you want to publish API docs you can use the JSDoc theme.

Create a `jsdoc.conf` file at the root of your project and add the following
content:

    {
      "source": {
        "include": [
          "./src/node"
        ]
      },
      "templates": {
        "default": {
          "outputSourceFiles": false
        }
      },
      "opts": {
        "template": "./build/themes/jsdoc",
        "recurse": true
      },
      "markdown": {
        "idInHeadings": true
      },
      "plugins": ["plugins/markdown"]
    }

After this, the next time run the `publish-docs` command, you'll be asked
if you want to build JSDocs as well, select yes and follow the instructions.

    npm-publish-scripts publish-docs
