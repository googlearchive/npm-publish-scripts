#!/bin/bash
set -e

#########################################################################
#
# GUIDE TO USE OF THIS SCRIPT
#
#########################################################################
#
# - This requires Jekyll to be set up and will copy files around and
#   attempt to build the site.
#
#########################################################################

if [ "$BASH_VERSION" = '' ]; then
 echo "    Please run this script via this command: './test/doc-template/test-template.sh'"
 exit 1;
fi

# CHANGE DIRECTORY TO EXAMPLE SITE
cd ./test/example-site/

# DELETE ANY OLD DOCS
rm -rf ./docs/jekyll-theme/
rm -rf ./docs/reference-docs/

# COPY JEKYLL THEME
cp -r ../../src/all-themes/jekyll-theme/. ./docs/jekyll-theme/
jsdoc ./src/* -c ./_jsdoc.conf -d ./docs/reference-docs/stable/v1.0.0/

# SERVER JEKYLL FROM INSIDE the example-sites docs directory
cd ./docs/
jekyll serve --config ../_config.yml
