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

rm -rf ./test/doc-template/output/

mkdir -p ./test/doc-template/output/docs/
mkdir -p ./test/doc-template/output/_data/

cp -r ./src/docs-template/. ./test/doc-template/output/
cp -r ./test/doc-template/example-docs/. ./test/doc-template/output/docs/
cp    ./test/doc-template/example-data/gendoclist.yml ./test/doc-template/output/_data/gendoclist.yml

cd ./test/doc-template/output/

jekyll serve
