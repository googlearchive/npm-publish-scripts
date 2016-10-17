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

GH_PAGES_PATH="./gh-pages"
GITHUB_REPO=$(git config --get remote.origin.url)
REFERENCE_DOC_DIR="reference-docs"
REFERENCE_DOC_LOCATION="${GH_PAGES_PATH}/${REFERENCE_DOC_DIR}"
DATA_PATH="${GH_PAGES_PATH}/_data"
DOCS_RELEASE_OUTPUT="${DATA_PATH}/releases.yml"
PROJECT_DOCS="./docs"

echo ""
echo ""
echo "Deploying new docs"
echo ""

echo ""
echo ""
echo "Clone repo and get gh-pages branch"
echo ""
git clone $GITHUB_REPO $GH_PAGES_PATH
cd $GH_PAGES_PATH
{
  git fetch origin
  git checkout gh-pages
} || {
  echo ""
  echo "WARNING: gh-pages doesn't exist so nothing we can do."
  echo ""
  cd ..
  rm -rf $GH_PAGES_PATH
  exit 1;
}

echo ""
echo "        Removing previous files"
echo ""
find . -maxdepth 1 -type d ! -name .git ! -name . ! -name "${REFERENCE_DOC_DIR}" -exec rm -R {} \;

cd ..

# If a path is passed in as an argument, it indicates a snapshot of docs
# is desired and should be stored in the passed in location
if [ ! -z "$1" ]; then
  DOC_LOCATION="${REFERENCE_DOC_LOCATION}/$1"
  echo ""
  echo ""
  echo "Build the docs"
  echo ""
  npm run build-docs $DOC_LOCATION
fi

echo ""
echo ""
echo "Copy Files from ./docs/"
cp -r "${PROJECT_DOCS}/." "${GH_PAGES_PATH}/"

echo ""
echo ""
echo "Update Jekyll Template in gh-pages"

echo "        Getting SCRIPTPATH value"
echo ""
# When publishing on THIS repo
SCRIPT_EXECUTABLE=${BASH_SOURCE[0]}

# For published npm-release-scripts the script is in '.bin' as a link
{
  FOLLOW_LINK_PATH=$( readlink ${SCRIPT_EXECUTABLE} )
} || {
  FOLLOW_LINK_PATH='.'
}

SCRIPT_EXECUTABLE_PATH="$( dirname "${SCRIPT_EXECUTABLE}" )"
CURRENT_DIR="$( cd ${SCRIPT_EXECUTABLE_PATH} && cd $( dirname ${FOLLOW_LINK_PATH} ) &&  pwd )"
if [ -d "${CURRENT_DIR}" ]; then
  SCRIPTPATH="${CURRENT_DIR}"
else
  echo "Unable to find path of the 'publish-docs.sh' script."
  exit 1;
fi

echo "        Copying $SCRIPTPATH/jekyll-theme/ to ${GH_PAGES_PATH}/jekyll-theme/"
echo ""
cp -r "$SCRIPTPATH/jekyll-theme" "${GH_PAGES_PATH}/"

echo ""
echo ""
echo "Configure Doc Directories in ${DOCS_RELEASE_OUTPUT}"
echo ""

mkdir -p $DATA_PATH
# -f prevents error being thrown when the file doesn't exist
rm -f $DOCS_RELEASE_OUTPUT

echo "# Auto-generated from the npm-publish-scripts module" >> $DOCS_RELEASE_OUTPUT

RELEASE_TYPES=("alpha" "beta" "stable")
for releaseType in "${RELEASE_TYPES[@]}"; do
  if [ ! -d "${REFERENCE_DOC_LOCATION}/$releaseType/" ]; then
    echo "    No $releaseType docs."
    continue
  fi

  echo "    Found $releaseType docs."

  UNSORTED_RELEASE_DIRECTORIES=$(find ${REFERENCE_DOC_LOCATION}/$releaseType/ -maxdepth 1 -mindepth 1 -type d | xargs -n 1 basename);
  RELEASE_DIRECTORIES=$(semver ${UNSORTED_RELEASE_DIRECTORIES} | sort --reverse)
  RELEASE_DIRECTORIES=($RELEASE_DIRECTORIES)

  echo "$releaseType:" >> $DOCS_RELEASE_OUTPUT
  echo "    latest: /${REFERENCE_DOC_DIR}/${releaseType}/v${RELEASE_DIRECTORIES[0]}" >> $DOCS_RELEASE_OUTPUT
  echo "    all:" >> $DOCS_RELEASE_OUTPUT

  for releaseDir in "${RELEASE_DIRECTORIES[@]}"; do
    releaseDir="v${releaseDir}"
    if [ -f "${REFERENCE_DOC_LOCATION}/$releaseType/$releaseDir/index.html" ]; then
      echo "            - /${REFERENCE_DOC_DIR}/$releaseType/$releaseDir" >> $DOCS_RELEASE_OUTPUT
    else
      echo "Skipping ${REFERENCE_DOC_LOCATION}/$releaseType/$releasesDir due to no index.html file"
    fi
  done
done

if [ -d "${REFERENCE_DOC_LOCATION}/" ]; then
  echo "other:" >> $DOCS_RELEASE_OUTPUT
  DOC_DIRECTORIES=$(find ${REFERENCE_DOC_LOCATION}/ -maxdepth 1 -mindepth 1 -type d | xargs -n 1 basename);
  for docDir in $DOC_DIRECTORIES; do
    if [ "$docDir" = 'stable' ] || [ "$docDir" = 'alpha' ] || [ "$docDir" = 'beta' ]; then
      continue
    fi

    if [ -f $REFERENCE_DOC_LOCATION/$docDir/index.html ]; then
      # DO NOT include the ./docs/ piece as github pages serves from docs.
      echo "  - /${REFERENCE_DOC_DIR}/$docDir" >> $DOCS_RELEASE_OUTPUT
    else
      echo "Skipping ${REFERENCE_DOC_LOCATION}/$docDir due to no index.html file"
    fi
  done
fi

echo ""
echo ""
echo "Commit New Docs Changes"
echo ""

cd $GH_PAGES_PATH

# The curly braces act as a try / catch
{
  if [ "$TRAVIS" ]; then
    # inside this git repo we'll pretend to be a new user
    git config user.name "npm-publish-script"
    git config user.email "gauntface@google.com"
  fi

  git add .
  git commit -m "Deploy to GitHub Pages"

  if [ "$TRAVIS" ]; then
    # Force push from the current repo's master branch to the remote
    # repo's gh-pages branch. (All previous history on the gh-pages branch
    # will be lost, since we are overwriting it.) We redirect any output to
    # /dev/null to hide any sensitive credential data that might otherwise be exposed.
    git push "https://${GH_TOKEN}@${GH_REF}" gh-pages > /dev/null 2>&1
  else
    git push origin gh-pages
  fi
} || {
  echo ""
  echo "ERROR: Unable to deploy docs!"
  echo ""
}

cd ..

echo ""
echo ""
echo "Clean up gh-pages"
echo ""
rm -rf $GH_PAGES_PATH
