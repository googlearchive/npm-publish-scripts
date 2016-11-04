#!/bin/bash
set -e

GITHUB_REPO=$(git config --get remote.origin.url)
GH_PAGES_PATH=$1

git clone $GITHUB_REPO $GH_PAGES_PATH
cd $GH_PAGES_PATH
{
  git fetch origin
  git checkout gh-pages
} || {
  exit 1;
}
