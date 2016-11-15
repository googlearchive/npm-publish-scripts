#!/bin/bash
set -e

npm whoami &>/dev/null || npm login
