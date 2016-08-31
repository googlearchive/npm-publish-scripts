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

#echo ""
#echo ""
#echo "Clone repo and get gh-pages branch"
#echo ""
#git clone $GITHUB_REPO ./gh-pages
#cd ./gh-pages
# {
#  git fetch origin
#  git checkout gh-pages
# } || {
#  echo ""
#  echo "WARNING: gh-pages doesn't exist so nothing we can do."
#  echo ""
#  cd ..
#  rm -rf ./gh-pages
#  exit 0;
#}
#cd ..

# If a path is passed in as an argument, it indicates a snapshot of docs
# is desired and should be stored in the passed in location
if [ ! -z "$1" ]; then
  DOC_LOCATION="./docs/$1"
  echo ""
  echo ""
  echo "Build the docs"
  echo ""
  npm run build-docs $DOC_LOCATION
fi

echo ""
echo ""
echo "Update Jekyll Template in gh-pages"
echo ""
# cd ./docs
echo "        Removing previous template files"
echo ""
rm -rf ./docs/jekyll-theme
# cd ..

echo "        Getting SCRIPTPATH value"
echo ""
# When publishing on THIS repo
if [ -d "${PWD}/node_modules/npm-publish-scripts" ]; then
  SCRIPTPATH="${PWD}/node_modules/npm-publish-scripts"
else
  SCRIPTPATH="${PWD}/src"
fi
echo "        Copying $SCRIPTPATH/jekyll-theme/ to ./docs/"
echo ""
cp -r "$SCRIPTPATH/jekyll-theme" ./docs/

echo ""
echo ""
echo "Configure Doc Directories in _data/releases.yml"
echo ""

mkdir -p _data
DOCS_RELEASE_OUTPUT="./docs/_data/releases.yml"
rm DOCS_RELEASE_OUTPUT

echo "# Auto-generated from the npm-publish-scripts module" >> $DOCS_RELEASE_OUTPUT

RELEASE_TYPES=("alpha" "beta" "stable")
for releaseType in "${RELEASE_TYPES[@]}"; do
  if [ ! -d "./docs/reference-docs/$releaseType/" ]; then
    echo "    No $releaseType docs."
    continue
  fi

  echo "    Found $releaseType docs."

  UNSORTED_RELEASE_DIRECTORIES=$(find ./docs/reference-docs/$releaseType/ -maxdepth 1 -mindepth 1 -type d | xargs -n 1 basename);
  RELEASE_DIRECTORIES=$(semver ${UNSORTED_RELEASE_DIRECTORIES} | sort --reverse)
  RELEASE_DIRECTORIES=($RELEASE_DIRECTORIES)

  echo "$releaseType:" >> $DOCS_RELEASE_OUTPUT
  echo "    latest: /docs/reference-docs/${releaseType}/v${RELEASE_DIRECTORIES[0]}" >> $DOCS_RELEASE_OUTPUT
  echo "    all:" >> $DOCS_RELEASE_OUTPUT

  for releaseDir in "${RELEASE_DIRECTORIES[@]}"; do
    releaseDir="v${releaseDir}"
    if [ -f "./docs/reference-docs/$releaseType/$releaseDir/index.html" ]; then
      echo "            - $releaseDir" >> $DOCS_RELEASE_OUTPUT
    else
      echo "Skipping reference-docs/$releaseType/$releasesDir due to no index.html file"
    fi
  done
done

if [ -d "./docs/reference-docs/" ]; then
  echo "other:" >> $DOCS_RELEASE_OUTPUT
  DOC_DIRECTORIES=$(find ./docs/reference-docs/ -maxdepth 1 -mindepth 1 -type d | xargs -n 1 basename);
  for docDir in $DOC_DIRECTORIES; do
    if [ "$docDir" = 'stable' || "$docDir" = 'alpha' || "$docDir" = 'beta' ]; then
      continue
    fi

    if [ -f ./docs/reference-docs/$docDir/index.html ]; then
      echo "  - /docs/reference-docs/$docDir" >> $DOCS_RELEASE_OUTPUT
    else
      echo "Skipping reference-docs/$docDir due to no index.html file"
    fi
  done
fi

echo ""
echo ""
echo "Commit New Docs Changes"
echo ""
# The curly braces act as a try / catch
{
  if [ "$TRAVIS" ]; then
    # inside this git repo we'll pretend to be a new user
    git config user.name "Travis CI"
    git config user.email "gauntface@google.com"
  fi

  git add ./docs/
  git commit -m "Deploy to GitHub Pages"

  if [ "$TRAVIS" ]; then
    # Force push from the current repo's master branch to the remote
    # repo's gh-pages branch. (All previous history on the gh-pages branch
    # will be lost, since we are overwriting it.) We redirect any output to
    # /dev/null to hide any sensitive credential data that might otherwise be exposed.
    git push "https://${GH_TOKEN}@${GH_REF}" master > /dev/null 2>&1
  else
    git push origin master
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
