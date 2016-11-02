#!/bin/bash
set -e

find . -maxdepth 1 ! -name .git ! -name . ! -name "$1" -exec rm -R {} \;
