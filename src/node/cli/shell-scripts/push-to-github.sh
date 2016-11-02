# The curly braces act as a try / catch
echo ""
echo ""
echo $PWD
echo ""
echo ""
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
  exit 1;
}
