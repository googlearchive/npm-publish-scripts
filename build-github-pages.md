---
layout: index
title: "Building a Github Pages Site"
navigation_weight: 2
---

# Building a Github Pages Site

To publish markdown files to Github Pages using this theme, create a folder
called `docs` at the root of your projects **master** branch and create
a `docs/index.md` adding the following contents:

```markdown
---
layout: index
title: "My Project Title"
navigation_weight: 0
---

# Hello World
```

Then create a `docs/_config.yml` file and paste in the following:

```
source:       .
layouts_dir: ./themes/jekyll/_layouts/
includes_dir: ./themes/jekyll/_includes/
```

Then add a new NPM run script:

```json
"publish-docs": "publish-docs.sh"
```

## Updating the Theme

Run `npm run publish-docs` when you wish to update the docs theme,
update versioned docs.

Try running it now and you should see `docs/jekyll-theme` appear.

You can add the following to your `travis.yml` to make sure that
any changes to the project result in the docs being up to date.

    script:
      - if [[ "$TRAVIS_BRANCH" = "master" && "$TRAVIS_OS_NAME" = "linux" && "$TRAVIS_PULL_REQUEST" = "false" ]]; then
          npm run publish-docs;
        fi

## Configuring Github Pages

The final stpe is to enable Github Pages.

Go to `Settings > Github Pages > Source` and select
'Master Branch /docs Folder'.

Then you should have the docs live on your Github Pages URL.

# Publishing Versioned Reference Docs

If you have reference docs that you'd like to publish on a new release
and publish on your Github Pages start by adding an NPM run script
`build-docs` that takes the path to build into as the final option.

```json
"build-docs": "jsdoc -c ./jsdoc.conf -d "
```

In this example we are using JSDoc and using `-d` as the final option so
when it's run out docs are build into the correct directory.

Test it out like so:

    npm run build-docs ./test-docs

You should have a directory `test-docs` with your reference docs.

Once this is working, `publish-release.sh` will call `publish-docs.sh`
whenever a new version is published to npm and `publish-docs.sh` will
call your `build-docs` script and make sure the reference docs are
added to the available doc versions.

To use the JSDoc theme, see [Using the JSDoc Theme](./use-jsdoc-theme).
