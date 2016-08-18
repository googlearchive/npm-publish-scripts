#!/bin/bash
set -e

#########################################################################
#
# GUIDE TO USE OF THIS SCRIPT
#
#########################################################################
#
# - Set up npm scripts to perform the following acctions:
#     - npm run build-docs
#
# - Setup environment for GH_TOKEN and GH_REF if this is to be run on Travis
#     - Create a new personal token on github here: https://github.com/settings/tokens/new
#     - Run these two commands:
#         - gem install travis
#         - travis encrypt GH_TOKEN=<Github Token Here>
#     - Copy the secure string into your .travis.yml file (as shown below)
#     - Add GH_REF to /travis.yml as well:
#     env:
#         global:
#         - secure: <Output from travis encrypt command>
#         - GH_REF: github.com/<username>/<repo>.git
#
#########################################################################

if [ "$BASH_VERSION" = '' ]; then
 echo "    Please run this script via this command: './project/publish-docs.sh'"
 exit 1;
fi

GITHUB_REPO=$(git config --get remote.origin.url)

echo ""
echo ""
echo "Deploying new docs"
echo ""

echo ""
echo ""
echo "Clone repo and get gh-pages branch"
echo ""
git clone $GITHUB_REPO ./gh-pages
cd ./gh-pages
{
  git fetch origin
  git checkout gh-pages
} || {
  echo ""
  echo "WARNING: gh-pages doesn't exist so nothing we can do."
  echo ""
  cd ..
  rm -rf ./gh-pages
  exit 0;
}
cd ..

if [ ! -z "$1" ]; then
  echo ""
  echo ""
  echo "Build the docs"
  echo ""
  npm run build-docs


  echo ""
  echo ""
  echo "Copy docs to gh-pages"
  echo ""
  docLocation="./gh-pages/docs/$1"
  rm -rf $docLocation
  mkdir -p $docLocation
  cp -r ./docs/. $docLocation
fi

echo ""
echo ""
echo "Update Jekyll Template in gh-pages"
echo ""
cd ./gh-pages
echo "        Removing previous template files"
echo ""
find . -maxdepth 1 ! -name 'docs' ! -name '.*' | xargs rm -rf
cd ..

echo "        Getting SCRIPTPATH value"
echo ""
SCRIPTPATH="${PWD}/node_modules/npm-publish-scripts"
echo "        Copying $SCRIPTPATH/docs-template/. to gh-pages"
echo ""
cp -r "$SCRIPTPATH/docs-template/." ./gh-pages/

echo ""
echo ""
echo "Configure Doc Directories in _data/gendoclist.yml"
echo ""

cd ./gh-pages
mkdir -p _data
DOCS_INFO_OUTPUT="./_data/gendoclist.yml"

echo "# Auto-generated from the npm-publish-scripts module" >> $DOCS_INFO_OUTPUT

RELEASE_TYPES=("alpha" "beta" "stable")
for releaseType in "${RELEASE_TYPES[@]}"; do
  if [ ! -d "./docs/releases/$releaseType/" ]; then
    echo "    No $releaseType docs."
    continue
  fi

  echo "    Found $releaseType docs."

  UNSORTED_RELEASE_DIRECTORIES=$(find ./docs/releases/$releaseType/ -maxdepth 1 -mindepth 1 -type d | xargs -n 1 basename);
  RELEASE_DIRECTORIES=$(semver ${UNSORTED_RELEASE_DIRECTORIES} | sort --reverse)
  RELEASE_DIRECTORIES=($RELEASE_DIRECTORIES)

  echo "$releaseType:" >> $DOCS_INFO_OUTPUT
  echo "    latest: /docs/releases/${releaseType}/v${RELEASE_DIRECTORIES[0]}" >> $DOCS_INFO_OUTPUT
  echo "    all:" >> $DOCS_INFO_OUTPUT

  for releaseDir in "${RELEASE_DIRECTORIES[@]}"; do
    releaseDir="v${releaseDir}"
    if [ -f "./docs/releases/$releaseType/$releaseDir/index.html" ]; then
      echo "            - $releaseDir" >> $DOCS_INFO_OUTPUT
    else
      echo "Skipping releases/$releaseType/$releasesDir due to no index.html file"
    fi
  done
done

echo "other:" >> $DOCS_INFO_OUTPUT
DOC_DIRECTORIES=$(find ./docs/ -maxdepth 1 -mindepth 1 -type d | xargs -n 1 basename);
for docDir in $DOC_DIRECTORIES; do
  if [ "$docDir" = 'releases' ]; then
    continue
  fi

  if [ -f ./docs/$docDir/index.html ]; then
    echo "  - /docs/$docDir" >> $DOCS_INFO_OUTPUT
  else
    echo "Skipping $docDir due to no index.html file"
  fi
done
cd ..

echo ""
echo ""
echo "Commit to gh-pages"
echo ""
# The curly braces act as a try / catch

cd ./gh-pages

{
  if [ "$TRAVIS" ]; then
    # inside this git repo we'll pretend to be a new user
    git config user.name "Travis CI"
    git config user.email "gauntface@google.com"
  fi

  git add ./
  git commit -m "Deploy to GitHub Pages"

  if [ "$TRAVIS" ]; then
    # Force push from the current repo's master branch to the remote
    # repo's gh-pages branch. (All previous history on the gh-pages branch
    # will be lost, since we are overwriting it.) We redirect any output to
    # /dev/null to hide any sensitive credential data that might otherwise be exposed.
    git push --force --quiet "https://${GH_TOKEN}@${GH_REF}" gh-pages > /dev/null 2>&1
  else
    git push --force origin gh-pages
  fi
} || {
  echo ""
  echo "ERROR: Unable to deploy docs!"
  echo ""
}

echo ""
echo ""
echo "Clean up gh-pages"
echo ""
cd ..
rm -rf ./gh-pages
