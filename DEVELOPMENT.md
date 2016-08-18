# Developer Notes

## For Docs Template

### Installing

- Install RVM: https://rvm.io/rubies/default
- Set RVM Default to 2.2.0
    - `rvm install ruby-2.2.0`
    - `rvm --default use 2.2.0`
- Install Bundler `gem install bundler`
- Install dependencies: `rvm . do bundle install`
- Install NPM Dependencies `npm install`

Then to test, run ./test/doc-template/test-template.sh

You can set a Github Token to in your environment variables to get the Github
API quote lifted.
1. Create a token here [https://github.com/settings/tokens](https://github.com/settings/tokens)
1. Add `JEKYLL_GITHUB_TOKEN=<Your New Token>` to your .bashrc or .zshrc file
