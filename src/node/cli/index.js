/**
 * Copyright 2016 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
**/
'use strict';

const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const tmp = require('tmp');
const fse = require('fs-extra');
const spawn = require('child_process').spawn;
const spawnSync = require('child_process').spawnSync;
const semver = require('semver');

const exitLifeCycle = require('./exit-lifecycle');
const logHelper = require('./log-helper');
const packageInfo = require('../../../package.json');

const REFERENCE_DOCS_DIR = 'reference-docs';

/**
 * The module that performs the logic of the CLI.
 */
class NPMPublishScriptCLI {
  /**
   * This method is the entry method that kicks of logic and expects the
   * output of minimist module.
   * @param {object} argv This is the output minimist which parses the command
   * line arguments.
   */
  argv(argv) {
    const cliArgs = minimist(argv);
    if (cliArgs._.length > 0) {
      // We have a command
      this.handleCommand(cliArgs._[0], cliArgs._.splice(1), cliArgs);
    } else {
      // we have a flag only request
      this.handleFlag(cliArgs);
    }
  }

  /**
   * Prints the help text to the terminal.
   */
  printHelpText() {
    const helpText = fs.readFileSync(
      path.join(__dirname, 'cli-help.txt'), 'utf8');
    logHelper.info(helpText);
  }

  /**
   * If there is no command given to the CLI then the flags will be passed
   * to this function in case a relevant action can be taken.
   * @param {object} args The available flags from the command line.
   */
  handleFlag(args) {
    let handled = false;
    if (args.h || args.help) {
      this.printHelpText();
      handled = true;
    }

    if (args.v || args.version) {
      logHelper.info(packageInfo.version);
      handled = true;
    }

    if (handled) {
      process.exit(0);
      return;
    }

    // This is a fallback
    this.printHelpText();
    process.exit(1);
    return;
  }

  /**
   * If a command is given in the command line args, this method will handle
   * the appropriate action.
   * @param {string} command The command name.
   * @param {object} args The arguments given to this command.
   * @param {object} flags The flags supplied with the command line.
   */
  handleCommand(command, args, flags) {
    switch (command) {
      case 'init':
        this.initProject();
        break;
      case 'serve': {
        this.serveSite();
        break;
      }
      case 'publish-release': {
        logHelper.error('This command is not implemented yet');
        process.exit(1);
        break;
      }
      case 'publish-docs': {
        this.publishDocs();
        break;
      }
      default:
        logHelper.error(`Invlaid command given '${command}'`);
        process.exit(1);
        break;
    }
  }

  /**
   * This method will create the appropriate directories and files
   * to initialise the project.
   */
  initProject() {
    const files = [
      {
        input: path.join(__dirname, '..', '..', 'defaults', 'docs'),
        output: path.join(process.cwd(), 'docs'),
      },
      {
        input: path.join(__dirname, '..', '..', 'defaults', 'Gemfile'),
        output: path.join(process.cwd(), 'Gemfile'),
      },
      {
        input: path.join(__dirname, '..', '..', 'defaults', '.ruby-version'),
        output: path.join(process.cwd(), '.ruby-version'),
      },
      {
        input: path.join(__dirname, '..', '..', 'defaults', 'jsdoc.conf'),
        output: path.join(process.cwd(), 'jsdoc.conf'),
      },
    ];

    files.forEach((fileOptions) => {
      try {
        fs.accessSync(fileOptions.output, fs.F_OK);
      } catch (err) {
        fse.copySync(
          fileOptions.input,
          fileOptions.output
        );
      }
    });
  }

  /**
   * This method implements the 'serve' command and started jekyll
   * serve and copies the appropriate files to demo the site.
   */
  serveSite() {
    const docsPath = path.join(process.cwd(), 'docs');

    try {
      fs.accessSync(docsPath, fs.F_OK);
    } catch (err) {
      logHelper.info('Can\'t build and serve the site since there is ' +
        'no docs directory.');
      return;
    }

    exitLifeCycle.addEventListener('exit', this.stopServingDocSite.bind(this));

    try {
      // Create temporary directory
      this._servingDocInfo = {
        tmpObj: tmp.dirSync({
          dir: process.cwd(),
        }),
      };
    } catch (err) {
      logHelper.error(err);
      process.exit(1);
    }

    const tmpPath = this._servingDocInfo.tmpObj.name;
    this.checkoutGithubPages(tmpPath)
    .then(() => {
      return this.cleanupGithubPages(tmpPath);
    })
    .then(() => {
      this.copyDocs(tmpPath);
      this.updateJekyllTemplate(tmpPath);
      this.buildJSDocs(tmpPath);
      this.buildReferenceDocsList(tmpPath);

      // Copy Jekyll gem - only needed for local build
      fse.copySync(
        path.join(__dirname, '..', '..', '..', 'Gemfile'),
        path.join(this._servingDocInfo.tmpObj.name, 'Gemfile')
      );
    })
    .then(() => {
      logHelper.info('Starting Jekyll serve.');

      const jekyllCommand =
        process.platform === 'win32' ? 'jekyll.bat' : 'jekyll';
      const params = [
        'exec',
        jekyllCommand,
        'serve',
        '--trace',
        '--config',
        '_config.yml',
      ];

      this._servingDocInfo.jekyllProcess = spawn('bundle', params, {
        cwd: this._servingDocInfo.tmpObj.name,
        stdio: 'inherit',
      });
      this._servingDocInfo.jekyllProcess.on('error', function(err) {
        logHelper.error('Unable to run Jekyll. Please ensure that you ' +
          'run the followings commands:');
        logHelper.error('');
        logHelper.error('    gem install bundler');
        logHelper.error('    rvm . do bundle install');
        logHelper.error('');
        logHelper.error(err);
        process.exit(1);
      });
    });
  }

  /**
   * Should get the latest docs from git-pages branch, update the entries
   * build any reference docs and commit changes accordingly.
   */
  publishDocs() {
    const githubPagesRoot = path.join(process.cwd(), 'gh-pages');

    let ghPageDirExists = false;
    try {
      fs.accessSync(githubPagesRoot, fs.F_OK);
      ghPageDirExists = true;
    } catch (err) {
      // NOOP
    }

    if (ghPageDirExists) {
      logHelper.error('The directory \'gh-pages\' already exists.');
      logHelper.error('Please delete it to publish docs.');
      process.exit(1);
    }

    this.checkoutGithubPages(githubPagesRoot)
    .then(() => {
      return this.cleanupGithubPages(githubPagesRoot);
    })
    .then(() => {
      this.copyDocs(githubPagesRoot);
      this.updateJekyllTemplate(githubPagesRoot);
      this.buildJSDocs(githubPagesRoot);
      this.buildReferenceDocsList(githubPagesRoot);
    })
    .then(() => {
      return this.pushChangesToGithub(githubPagesRoot);
    })
    .catch((err) => {
      logHelper.error(err);

      fse.removeSync(githubPagesRoot);
      process.exit(1);
    })
    .then(() => {
      fse.removeSync(githubPagesRoot);
      process.exit(0);
    });
  }

  /**
   * Checkout the current projects github pages branch
   * @param {string} newPath This should be the path to the root of
   * the docs output (i.e. github pages or temp build directory).
   * @return {Promise} Returns a promise that resolves once the github
   * repo has been checked out.
   */
  checkoutGithubPages(newPath) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, 'shell-scripts',
        'checkout-gh-pages.sh');
      const gitCheckoutProcess = spawn(scriptPath, [newPath], {
        stdio: 'inherit',
      });

      gitCheckoutProcess.on('close', function(code) {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Unexpected status code. [${code}]`));
        }
      });

      gitCheckoutProcess.on('error', function(err) {
        reject(err);
      });
    });
  }

  /**
   * This method deletes any files that can be updated by
   * npm-publish-scripts are documents that may be out of date with the
   * master branch.
   * @param {string} newPath This should be the path to the root of
   * the docs output (i.e. github pages or temp build directory).
   * @return {Promise} Returns a promise that resolves once the github
   * repo has been checked out.
   */
  cleanupGithubPages(newPath) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, 'shell-scripts',
        'remove-old-files.sh');
      const cleanupProcess = spawn(scriptPath, [REFERENCE_DOCS_DIR], {
        cwd: newPath,
        stdio: 'inherit',
      });

      cleanupProcess.on('close', function(code) {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Unexpected status code. [${code}]`));
        }
      });

      cleanupProcess.on('error', function(err) {
        reject(err);
      });
    });
  }

  /**
   * This method will push everything to Github on the gh-pages branch.
   * @param {string} newPath This should be the path to the root of
   * the docs output (i.e. github pages or temp build directory).
   * @return {Promise} Returns a promise that resolves once the github
   * repo has been pushed to.
   */
  pushChangesToGithub(newPath) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, 'shell-scripts',
        'push-to-github.sh');
      const pushProcess = spawn(scriptPath, [], {
        cwd: newPath,
        stdio: 'inherit',
      });

      pushProcess.on('close', function(code) {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Unexpected status code. [${code}]`));
        }
      });

      pushProcess.on('error', function(err) {
        reject(err);
      });
    });
  }

  /**
   * Copyies over contents of /docs in a project to Github pages.
   * @param {string} newPath This should be the path to the root of
   * the docs output (i.e. github pages or temp build directory).
   */
  copyDocs(newPath) {
    fse.copySync(
      path.join(process.cwd(), 'docs'),
      newPath
    );
  }

  /**
   * This method will remove any current jekyll files and copy over the
   * new files.
   * @param {string} newPath This should be the path to the root of
   * the docs output (i.e. github pages or temp build directory).
   */
  updateJekyllTemplate(newPath) {
    fse.copySync(
      path.join(__dirname, '..', '..', '..', 'build', 'themes', 'jekyll'),
      path.join(newPath, 'themes', 'jekyll')
    );
  }

  /**
   * Building the JSDocs for the current project
   * @param {string} newPath This should be the path to the root of
   * the docs output (i.e. github pages or temp build directory).
   */
  buildJSDocs(newPath) {
    const jsdocConf = path.join(process.cwd(), 'jsdoc.conf');

    try {
      fs.accessSync(jsdocConf, fs.F_OK);
    } catch (err) {
      logHelper.info('Skipping JSDocs due to no jsdoc.conf');
      return;
    }

    logHelper.info('Building JSDocs');

    const jsDocParams = [
      '-c',
      jsdocConf,
      '-d',
      path.join(
        newPath, REFERENCE_DOCS_DIR, 'Example'
      ),
    ];

    const jsdocProcess = spawnSync(
      path.join(__dirname, '..', '..', '..',
        'node_modules', '.bin', 'jsdoc'),
      jsDocParams,
      {
        cwd: process.cwd(),
        stdio: 'inherit',
      }
    );

    if (jsdocProcess.error) {
      logHelper.error(jsdocProcess.error);
    }
  }

  /**
   * The way reference docs are surfaced to Jekyll are through a
   * _data/ list that defines all the stable, beta and alpha reference
   * docs.
   *
   * This method will build that list and make it available to the Jekyll
   * theme.
   *
   * @param {string} newPath This should be the path to the root of
   * the docs output (i.e. github pages or temp build directory).
   */
  buildReferenceDocsList(newPath) {
    const referenceDocsPath = path.join(newPath, REFERENCE_DOCS_DIR);
    try {
      // Check if it exists
      fs.accessSync(referenceDocsPath, fs.F_OK);
    } catch (err) {
      logHelper.info('Skipping reference-docs list as none exist.');
      return;
    }

    const lines = [
      '# Auto-generated by the npm-publish-scripts module.',
    ];

    const otherReleases = [];
    const versionedRelease = {
      stable: [],
      beta: [],
      alpha: [],
    };

    const knownReleaseGroups = Object.keys(versionedRelease);
    const directories = fs.readdirSync(referenceDocsPath);
    directories.forEach((refDocsDir) => {
      if (knownReleaseGroups.indexOf(refDocsDir) !== -1) {
        // Version release
        const releaseGroup = fs.readdirSync(
          path.join(referenceDocsPath, refDocsDir)
        );
        releaseGroup.forEach((releaseDir) => {
          versionedRelease[refDocsDir].push(releaseDir);
        });
      } else {
        // Just a raw docs type
        try {
          // Check if it exists
          fs.accessSync(
            path.join(referenceDocsPath, refDocsDir, 'index.html'), fs.F_OK);
        } catch (err) {
          // No Index page
          return;
        }

        otherReleases.push(refDocsDir);
      }
    });

    knownReleaseGroups.forEach((releaseGroup) => {
      if (versionedRelease[releaseGroup].length === 0) {
        return;
      }

      versionedRelease[releaseGroup].sort(semver.rcompare);
      lines.push(`${releaseGroup}:`);
      lines.push(`    latest: /${REFERENCE_DOCS_DIR}/${releaseGroup}/` +
        `${versionedRelease[releaseGroup][0]}`);
      lines.push(`    all:`);
      versionedRelease[releaseGroup].forEach((version) => {
        lines.push(`        - /${REFERENCE_DOCS_DIR}/${releaseGroup}/` +
          `${version}`);
      });
    });

    if (otherReleases.length > 0) {
      lines.push('other:');
      otherReleases.forEach((release) => {
        lines.push(`    - ${release}: /${REFERENCE_DOCS_DIR}/${release}`);
      });
    }

    fse.ensureDirSync(
      path.join(newPath, '_data')
    );

    const file = fs.createWriteStream(
      path.join(newPath, '_data', 'releases.yml'));
    file.on('error', (err) => {
      logHelper.error(err);
    });
    lines.forEach((line) => {
      file.write(line + '\n');
    });
    file.end();
  }

  /**
   * This method stops any currently running processes.
   */
  stopServingDocSite() {
    logHelper.info('Stopping Jekyll serve.');
    if (!this._servingDocInfo) {
      return;
    }

    if (this._servingDocInfo.jekyllProcess) {
      this._servingDocInfo.jekyllProcess.kill('SIGHUP');
    }

    if (this._servingDocInfo.tmpObj) {
      fse.removeSync(this._servingDocInfo.tmpObj.name);
    }
  }
}

module.exports = NPMPublishScriptCLI;
