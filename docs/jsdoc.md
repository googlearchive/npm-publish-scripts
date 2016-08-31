---
layout: index
title: Using with JSDoc
navigation_weight: 1
---

If you want to use JSDoc to create reference documentation for your project
all you need to do is define the template in your JSDoc's config file.

    node_modules/npm-publish-scripts/jsdoc-theme/

An example for a config file would like so:

```json
{
  "source": {
    "include": [
      "./src",
      "./docs/index.md"
    ]
  },
  "opts": {
    "template": "node_modules/npm-publish-scripts/jsdoc-theme/",
    "recurse": true
  }
}
```
