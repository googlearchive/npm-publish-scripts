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
const inquirer = require('inquirer');
const gitBranch = require('git-branch');
const updateNotifier = require('update-notifier');

const exitLifeCycle = require('./exit-lifecycle');
const logHelper = require('./log-helper');
const strings = require('./strings');
const packageInfo = require('../../../package.json');

const REFERENCE_DOCS_DIR = 'reference-docs';

/**
 * The module that performs the logic of the CLI.
 */
class NPMPublishScriptCLI {
  /**
   * Initialises the class.
   */
  constructor() {
    this._spawnedProcesses = [];
    const notifier = updateNotifier({pkg: packageInfo});
    notifier.notify();
  }

  /**
   * This method is the entry method that kicks of logic and expects the
   * output of minimist module.
   * @param {object} argv This is the output minimist which parses the command
   * line arguments.
   * @return {Promise} Returns a promise for the given task.
   */
  argv(argv) {
    const cliArgs = minimist(argv);
    if (cliArgs._.length > 0) {
      // We have a command
      return this.handleCommand(cliArgs._[0], cliArgs._.splice(1), cliArgs)
      .then(() => {
        process.exit(0);
      })
      .catch(() => {
        process.exit(1);
      });
    } else {
      // we have a flag only request
      return this.handleFlag(cliArgs)
      .then(() => {
        process.exit(0);
      })
      .catch(() => {
        process.exit(1);
      });
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
   * @return {Promise} returns a promise once handled.
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
      return Promise.resolve();
    }

    // This is a fallback
    this.printHelpText();
    return Promise.reject();
  }

  /**
   * If a command is given in the command line args, this method will handle
   * the appropriate action.
   * @param {string} command The command name.
   * @param {object} args The arguments given to this command.
   * @param {object} flags The flags supplied with the command line.
   * @return {Promise} A promise for the provided task.
   */
  handleCommand(command, args, flags) {
    switch (command) {
      case 'init':
        return this.initProject();
      case 'serve': {
        return this.serveSite();
      }
      case 'publish-release': {
        return this.pushRelease();
      }
      case 'publish-docs': {
        return this.publishDocs();
      }
      default:
        logHelper.error(`Invlaid command given '${command}'`);
        return Promise.reject();
    }
  }

  /**
   * This method will create the appropriate directories and files
   * to initialise the project.
   * @return {Promise} Returns a promise once initialising is done.
   */
  initProject() {
    try {
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

      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * This method implements the 'serve' command and started jekyll
   * serve and copies the appropriate files to demo the site.
   * @return {Promise} Returns a promise that resolves once serving has
   * finished.
   */
  serveSite() {
    const docsPath = path.join(process.cwd(), 'docs');

    try {
      fs.accessSync(docsPath, fs.F_OK);
    } catch (err) {
      logHelper.error('Can\'t build and serve the site since there is ' +
        'no docs directory.');
      return Promise.reject();
    }

    const filesRemove = [];

    return new Promise((resolve, reject) => {
      exitLifeCycle.addEventListener('exit', () => {
        try {
          this.stopServingDocSite(filesRemove);
        } catch (err) {
          return reject(err);
        }
        resolve();
      });

      const docsPath = path.join(process.cwd(), 'docs');
      try {
        // Check ./docs exists
        const stats = fs.statSync(docsPath);
        if (!stats.isDirectory()) {
          throw new Error('./docs is a file, not a directory.');
        }
      } catch (err) {
        logHelper.error('Please ensure the docs directory exists in your ' +
          'current directory.');
        logHelper.error(err);
        return Promise.reject(err);
      }

      return Promise.resolve()
      .then(() => {
        filesRemove.push(path.join(docsPath, 'themes'));
        this.updateJekyllTemplate(docsPath);
      })
      .then(() => {
        filesRemove.push(path.join(docsPath, 'reference-docs'));
        return this.buildJSDocs(docsPath, 'stable', 'v0.0.0');
      })
      .then(() => {
        filesRemove.push(path.join(docsPath, '_data'));
        this.buildReferenceDocsList(docsPath);

        // Copy Jekyll gem - only needed for local build
        fse.copySync(
          path.join(__dirname, '..', '..', '..', 'Gemfile'),
          path.join(docsPath, 'Gemfile')
        );

        filesRemove.push(path.join(docsPath, 'Gemfile'));
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

        const jekyllProcess = spawn('bundle', params, {
          cwd: docsPath,
          stdio: 'inherit',
        });

        jekyllProcess.on('error', (err) => {
          logHelper.error('Unable to run Jekyll. Please ensure that you ' +
            'run the followings commands:');
          logHelper.error('');
          logHelper.error('    gem install bundler');
          logHelper.error('    rvm . do bundle install');
          logHelper.error('');
          logHelper.error(err);
        });

        filesRemove.push(path.join(docsPath, '_site'));

        this._spawnedProcesses.push(jekyllProcess);
      });
    });
  }

  /**
   * Should get the latest docs from git-pages branch, update the entries
   * build any reference docs and commit changes accordingly.
   * @param {String} [tag] Tag for JSDocs.
   * @param {String} [newVersion] Version name for JSDocs.
   * @return {Promise} Returns a promise which resolves the publish is complete.
   */
  publishDocs(tag, newVersion) {
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
      return Promise.reject();
    }

    return this.checkoutGithubPages(githubPagesRoot)
    .then(() => {
      return this.cleanupGithubPages(githubPagesRoot);
    })
    .then(() => {
      this.copyDocs(githubPagesRoot);
      this.updateJekyllTemplate(githubPagesRoot);
    })
    .then(() => {
      return this.buildJSDocs(githubPagesRoot, tag, newVersion);
    })
    .then(() => {
      this.buildReferenceDocsList(githubPagesRoot);
    })
    .then(() => {
      return this.pushChangesToGithub(githubPagesRoot);
    })
    .catch((err) => {
      logHelper.error(err);

      fse.removeSync(githubPagesRoot);
      throw err;
    })
    .then(() => {
      fse.removeSync(githubPagesRoot);
    })
    .catch((err) => {
      logHelper.warn(`Unable to publish docs. '${err.message}'`);
      throw err;
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
   * @param {string} tag The tag stable, beta or alpha for docs.
   * @param {string} version The version string for the directories.
   * @return {Promise} that resolves once the docs have been built if requested
   * by the developer.
   */
  buildJSDocs(newPath, tag, version) {
    const jsdocConf = path.join(process.cwd(), 'jsdoc.conf');

    try {
      fs.accessSync(jsdocConf, fs.F_OK);
    } catch (err) {
      logHelper.info('Skipping JSDocs due to no jsdoc.conf');
      return;
    }

    logHelper.info('Building JSDocs');

    let detailsPromise;
    if (tag && version) {
      detailsPromise = Promise.resolve({
        tag,
        version,
      });
    } else {
      detailsPromise = inquirer.prompt(
        [
          {
            type: 'confirm',
            name: 'buildNewDocs',
            message: 'Would you like to build new JSDocs? (Otherwise we\'ll ' +
              'just update the theme for Github Pages.)',
          },
          {
            type: 'list',
            name: 'tag',
            message: 'Is this release of docs a stable, beta or alpha release?',
            choices: ['stable', 'beta', 'alpha'],
            when: (results) => {
              return results.buildNewDocs;
            },
          },
          {
            name: 'version',
            message: 'What is the tag for this set of docs? (i.e. v1.0.0)',
            when: (results) => {
              return results.buildNewDocs;
            },
          },
        ]
      );
    }

    return detailsPromise.then((results) => {
      if (results.buildNewDocs === false) {
        return;
      }

      const jsDocParams = [
        '-c', jsdocConf,
        '--template', path.join(__dirname, '..', '..', 'themes', 'jsdoc'),
        '-d',
        path.join(
          newPath, REFERENCE_DOCS_DIR, results.tag, results.version
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
    });
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
  stopServingDocSite(filesToRemove) {
    logHelper.info('Stopping Jekyll serve.');

    this._spawnedProcesses.forEach((spawnedProcess) => {
      spawnedProcess.kill('SIGHUP');
    });

    logHelper.error('Perform tidy up');
    if (filesToRemove && filesToRemove.length > 0) {
      filesToRemove.forEach((file) => {
        fse.removeSync(file);
      });
    }
  }

  /**
   * A method that publishes a release to NPM.
   * @return {Promise} Promise that resolves once finished publishing release.
   */
  pushRelease() {
    return this.confirmExpectedGitBranch()
    .then(() => this.getPublishDetails())
    .then((publishDetails) => {
      return this.runNPMScripts()
      .then(() => {
        return this.loginToNPM()
        .catch((err) => {
          logHelper.error(`An error occured when logging into NPM. ` +
            `'${err.message}'`);
          throw err;
        });
      })
      .then(() => this.confirmNewPackageVersion(publishDetails))
      .then(() => {
        return this.updatePackageVersion(publishDetails.version)
        .catch((err) => {
          logHelper.error(`An error occured when bumping the version with ` +
            `'npm version ${publishDetails.version}'. '${err.message}'`);
          throw err;
        });
      })
      .then((newVersion) => {
        let githubTag = newVersion;
        if (publishDetails.tag !== 'stable') {
          githubTag += `-${publishDetails.tag}`;
        }
        return this.publishToNPM(publishDetails.tag)
        .catch((err) => {
          logHelper.error(`An error occured when publish to NPM with ` +
            `'npm publish'. '${err.message}'`);
          throw err;
        })
        .then(() => {
          return this.pushGithubTag(githubTag)
          .catch((err) => {
            logHelper.warn(`Unable to push the new Github Tags to remote ` +
              `repo. '${err.message}'`);
            throw err;
          });
        })
        .then(() => {
          return this.publishDocs(publishDetails.tag, newVersion);
        });
      });
    });
  }

  /**
   * This method resolves if the user is on the master branch, otherwise
   * the CLI confirms with the user if they really want to publish a release
   * from the current branch.
   * @return {Promise} Resolves if the branch is ok to use.
   */
  confirmExpectedGitBranch() {
    return this.getCurrentBranchName()
    .catch((err) => {
      logHelper.error(`Unable to retrieve the current Git branch. ` +
        `'${err.message}'`);
      throw err;
    })
    .then((branchName) => {
      if (branchName !== 'master') {
        return inquirer.prompt([
          {
            type: 'confirm',
            name: 'publish',
            message: 'You are not currently on the master branch of this ' +
              'project. Are you sure you want to publish a release from the ' +
              `'${branchName}' branch?`,
            default: false,
          },
        ])
        .then((answers) => {
          const shouldPublish = answers['publish'];
          if (!shouldPublish) {
            throw new Error('User declined to publish on non-master branch.');
          }
        }, (err) => {
          logHelper.error(`Unable to confirm the use of a seperate branch. ` +
            `'${err.message}'`);
          throw err;
        });
      }
    });
  }

  /**
   * @return {Promise<String>} Returns a promise that resolves with the current
   * branch name
   */
  getCurrentBranchName() {
    return new Promise((resolve, reject) => {
      gitBranch((err, branchName) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(branchName);
      });
    });
  }

  /**
   * This gets what the release should be, patch, minor or major release with
   * a tag of either stable, beta or alpha.
   * @return {Promise<Object>} Resolves with the relevant details.
   */
  getPublishDetails() {
    return inquirer.prompt([
      {
        type: 'list',
        name: 'version',
        message: 'Is this a major, minor or patch release?',
        choices: ['patch', 'minor', 'major'],
        default: 'patch',
      },
      {
        type: 'list',
        name: 'tag',
        message: 'Is this a stable, beta or alpha release?',
        choices: ['stable', 'beta', 'alpha'],
        default: 'stable',
      },
    ])
    .catch((err) => {
      logHelper.error(`Unable to get the required details for the ` +
        `release. '${err.message}'`);
      throw err;
    });
  }

  /**
   * This should run the build and test scripts
   * @return {Promise} Resolves once build and test scripts have run.
   */
  runNPMScripts() {
    return this.getProjectPackage()
    .then((packageDetails) => {
      if (!packageDetails.scripts || !packageDetails.scripts.test) {
        logHelper.warn(strings['no-test-script']);
      }

      if (!packageDetails.scripts) {
        return;
      }

      let promiseChain = Promise.resolve();
      if (packageDetails.scripts.build) {
        promiseChain = promiseChain.then(() => this._runNPMScript('build'));
      }
      if (packageDetails.scripts.test) {
        promiseChain = promiseChain.then(() => this._runNPMScript('test'));
      }

      return promiseChain;
    });
  }

  /**
   * Gets the current package.json file in the current working directory.
   * @return {Promise<Object>} Returns the parsed JSON file.
   */
  getProjectPackage() {
    const packageFile = path.join(process.cwd(), 'package.json');
    return new Promise((resolve, reject) => {
      fse.readJSON(packageFile, (err, pkg) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(pkg);
      });
    });
  }

  /**
   * A helper method that will execute npm run scripts.
   * @param {string} scriptName The name of the script to run.
   * @return {Promise} Resolves once the script has finished executing.
   */
  _runNPMScript(scriptName) {
    return new Promise((resolve, reject) => {
      const buildProcess = spawn('npm', ['run', scriptName], {
        cwd: process.cwd(),
        stdio: 'inherit',
      });

      buildProcess.on('error', (err) => {
        logHelper.error(`Unable to run 'npm run ${scriptName}'. ` +
          `'${err.message}'`);
        reject(err);
      });

      buildProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        logHelper.error(`Unexpected status code from ` +
          `'npm run ${scriptName}'. '${code}'`);
        reject(new Error(`Unexpected status code from ` +
          `'npm run ${scriptName}'`));
      });

      this._spawnedProcesses.push(buildProcess);
    });
  }

  /**
   * Logs the user into NPM if they aren't currently logged in.
   * @return {Promise} Returns a promise that resolves once the user is logged
   * in to npm.
   */
  loginToNPM() {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, 'shell-scripts',
        'login-to-npm.sh');
      const npmloginProcess = spawn(scriptPath, [], {
        cwd: process.cwd(),
        stdio: 'inherit',
      });

      npmloginProcess.on('close', function(code) {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Unexpected status code. [${code}]`));
        }
      });

      npmloginProcess.on('error', (err) => {
        reject(err);
      });

      this._spawnedProcesses.push(npmloginProcess);
    });
  }

  /**
   * Confirms with the user the entered details are correct before finally
   * publishing the changes.
   * @param {Object} publishDetails This is the details for the release.
   * @return {Promise} Promsie that resolves if the user wishes to continue.
   */
  confirmNewPackageVersion(publishDetails) {
    return inquirer.prompt([
      {
        type: 'confirm',
        name: 'publish-confirm',
        message: `You're about to publish a new ${publishDetails.tag} - ` +
          `${publishDetails.version} release. Are you sure you want to ` +
          `continue?`,
        default: false,
      },
    ])
    .then((answer) => {
      if (answer['publish-confirm'] !== true) {
        throw new Error('User did not confirm publishing.');
      }
    }, (err) => {
      logHelper.error(`An error occured requesting publish confirmation. ` +
        `'${err.message}'`);
      throw err;
    });
  }

  /**
   * Bumps the current version with npm bump.
   * @param {string} versionBump This should be 'patch', 'minor' or 'major'
   * @return {Promise<String>} Resolves once the new version has been bumped.
   */
  updatePackageVersion(versionBump) {
    return new Promise((resolve, reject) => {
      let newVersion = '';
      const cliArgs = [
        '--no-git-tag-version',
        'version',
        versionBump,
      ];
      const npmloginProcess = spawn('npm', cliArgs, {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'inherit'],
      });

      npmloginProcess.stdout.on('data', (data) => {
        newVersion += data;
      });

      npmloginProcess.on('close', function(code) {
        if (code === 0) {
          resolve(newVersion.trim());
        } else {
          reject(new Error(`Unexpected status code. [${code}]`));
        }
      });

      npmloginProcess.on('error', (err) => {
        reject(err);
      });

      this._spawnedProcesses.push(npmloginProcess);
    });
  }

  /**
   * Publishes the project to NPM and will create a tag in Git.
   * @param {string} tag A tag of 'stable', 'beta' or 'alpha'
   * @return {Promise} Resolves once the npm publish call has finished.
   */
  publishToNPM(tag) {
    return new Promise((resolve, reject) => {
      const cliArgs = [
        'publish',
      ];

      if (tag !== 'stable') {
        cliArgs.push('--tag');
        cliArgs.push(tag);
      }

      const npmPublishProcess = spawn('npm', cliArgs, {
        cwd: process.cwd(),
        stdio: 'inherit',
      });

      npmPublishProcess.on('close', function(code) {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Unexpected status code. [${code}]`));
        }
      });

      npmPublishProcess.on('error', (err) => {
        reject(err);
      });

      this._spawnedProcesses.push(npmPublishProcess);
    });
  }

  /**
   * Push the Github tag to the remote repo.
   * @param {string} tag The tag to assign to the git.
   * @return {Promise} Resolves once tags have been pushed.
   */
  pushGithubTag(tag) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, 'shell-scripts',
        'push-git-tags.sh');
      const pushGitTags = spawn(scriptPath, [tag], {
        cwd: process.cwd(),
        stdio: 'inherit',
      });

      pushGitTags.on('close', function(code) {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Unexpected status code. [${code}]`));
        }
      });

      pushGitTags.on('error', (err) => {
        reject(err);
      });

      this._spawnedProcesses.push(pushGitTags);
    });
  }
}

module.exports = NPMPublishScriptCLI;
