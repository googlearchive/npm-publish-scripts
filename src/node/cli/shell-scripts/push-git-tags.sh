#!/bin/bash
set -e

git tag -f $1
git push origin --tags
