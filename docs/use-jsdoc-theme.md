---
layout: index
title: "Use the JSDoc Theme"
navigation_weight: 3
---

# Use the JSDoc Theme

If you want to use the JSDoc theme with your reference documentation,
all you need to do is tell JSDoc to use this directory for the template:

    node_modules/npm-publish-scripts/build/jsdoc-theme/

An example JSDoc config file to use this theme looks like this:

```json
{
  "source": {
    "include": [
      "./src",
      "./docs/index.md"
    ]
  },
  "opts": {
    "template": "./node_modules/npm-publish-scripts/build/jsdoc-theme/",
    "recurse": true
  },
  "markdown": {
    "idInHeadings": true
  }
}
```
