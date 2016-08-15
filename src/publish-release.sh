#!/bin/bash
set -e

#########################################################################
#
# GUIDE TO USE OF THIS SCRIPT
#
#########################################################################
#
# - Set up npm scripts to perform the following acctions:
#     - npm run build
#     - npm run build-docs
#     - npm run test
#     - npm run bundle
#
# - Install this node module:
#     - npm install --save-dev npm-publish-scripts
#
# - Set up an npm script with:
#     - "publish-release": "./node_modules/npm-publish-scripts/publish-release.sh"
#
# - NOTE: if you need to alter your testing for this script, you can check for
#   process.env.RELEASE_SCRIPT in your tests
#
#########################################################################

if [ "$BASH_VERSION" = '' ]; then
 echo "    Please run this script via this command: './project/publish-release.sh'"
 exit 1;
fi

GITHUB_REPO=$(git config --get remote.origin.url)

# NOTES:
#     To delete a tag use: git push origin :v1.0.0

if [[ $1 != "patch" && $1 != "minor" && $1 != "major" ]] ; then
  echo "    Bad input: Expected an update type of \"patch\", \"minor\" or \"major\"";
  exit 1;
fi

if [[ $2 != "stable" && $2 != "alpha" && $2 != "beta" ]] ; then
  echo "    Bad input: Expected a release type of \"stable\", \"alpha\" or \"beta\"";
  exit 1;
fi

# Get the current branch from git. Outputs something similar to: refs/heads/master
currentBranch="$(git symbolic-ref HEAD)"
# Helpful info on string manipulation: http://tldp.org/LDP/abs/html/string-manipulation.html
# Double hash deletes the substring after the double hash.
currentBranch=${currentBranch##refs/heads/}

if [[ $currentBranch != "master" ]]; then
  echo "    This script must be run from the master branch.";
  exit 1;
fi

export RELEASE_SCRIPT=true

echo ""
echo "Building Library"
echo ""
npm run build

echo ""
echo ""
echo "Building Docs"
echo ""
npm run build-docs

echo ""
echo "Perform Tests"
echo ""
npm run test

echo ""
echo "Sign into npm"
echo ""
npm whoami &>/dev/null || npm login

echo ""
echo ""
echo "Update NPM Version"
echo ""
# We don't want to create a git tag against master branch. We want to tag
# against the new directory 'tagged-release', but we do want package.json
# in master to have the new version
PACKAGE_VERSION=$(npm --no-git-tag-version version $1)

if [[ $2 != "stable" ]]; then
  PACKAGE_VERSION="${PACKAGE_VERSION}-${2}"
fi

echo ""
echo ""
echo "Are you sure you want to publish a version [$PACKAGE_VERSION] y/N?"
echo ""
read answer
if [[ $answer != "y" && $answer != "Y" ]]; then
  # Revert the change to package.json
  git checkout package.json
  echo "    Not publishing the new release.";
  exit 1;
fi

echo ""
echo ""
echo "Create and Copy Files for Release"
echo ""
# Remove any remaining artifacts from previous builds
rm -rf ./tagged-release
mkdir tagged-release

# Copy over files that we want in the release
npm run bundle -- ./tagged-release

cd ./tagged-release/

echo ""
echo ""
echo "Git push to release branch"
echo ""
git init
git remote add origin $GITHUB_REPO
git checkout -b release
git add .
git commit -m "New tagged release - $PACKAGE_VERSION"
git tag -f $PACKAGE_VERSION
git push -f origin release $PACKAGE_VERSION

echo ""
echo ""
echo "Publish update to NPM"
echo ""
if [[ $2 == "stable" ]]; then
  npm publish
else
  npm publish --tag $2
fi

echo ""
echo ""
echo "Removing Tagged Release"
echo ""
cd ..
rm -rf ./tagged-release

echo ""
echo ""
echo "Commiting package.json updates to master"
echo ""
git add package.json
git commit -m "Auto-generated PR to update package.json with new version - $PACKAGE_VERSION"
git push origin $currentBranch

echo ""
echo ""
echo "Build and Publish Docs"
echo ""
npm run publish-docs releases/$2/$PACKAGE_VERSION
