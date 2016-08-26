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

rm -rf ./test/output/

cp -r ./src/docs-template/. ./test/output/
cp -r ./test/docs-template/. ./test/output/

cd test/output/

jekyll serve
