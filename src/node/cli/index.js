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

const exitLifeCycle = require('./exit-lifecycle');
const logHelper = require('./log-helper');
const packageInfo = require('../../../package.json');

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
      case 'init-project':
        logHelper.error('This command is not implemented yet');
        process.exit(1);
        break;
      case 'serve-doc-site': {
        this.serveDocSite();
        break;
      }
      case 'publish-release': {
        logHelper.error('This command is not implemented yet');
        process.exit(1);
        break;
      }
      case 'publish-docs': {
        logHelper.error('This command is not implemented yet');
        process.exit(1);
        break;
      }
      default:
        logHelper.error(`Invlaid command given '${command}'`);
        process.exit(1);
        break;
    }
  }

  /**
   * This method implements the 'serve-doc-site' command and started jekyll
   * serve and copies the appropriate files to demo the site.
   */
  serveDocSite() {
    logHelper.info('Serving doc site.');
    exitLifeCycle.addEventListener('exit', this.stopServingDocSite.bind(this));

    try {
      const docsPath = path.join(process.cwd(), 'docs');

      // Check for docs existance
      fs.accessSync(docsPath, fs.F_OK);


      // Create temporary directory
      this._servingDocInfo = {
        tmpObj: tmp.dirSync({
          dir: path.join(__dirname, '..', '..', '..'),
        }),
      };

      // Copy Jekyll gem
      fse.copySync(
        path.join(__dirname, '..', '..', '..', 'Gemfile'),
        path.join(this._servingDocInfo.tmpObj.name, 'Gemfile')
      );

      // 2.    Remove old files

      // 3   Copy files from /docs/
      fse.copySync(
        docsPath,
        this._servingDocInfo.tmpObj.name
      );

      // 4   Update Jekyll Template
      fse.copySync(
        path.join(__dirname, '..', '..', '..', 'build', 'themes', 'jekyll'),
        path.join(this._servingDocInfo.tmpObj.name, 'themes', 'jekyll')
      );

      // 5   Generate Jekyll docs list


      // 2.2   Build reference docs
      try {
        const jsdocConf = path.join(process.cwd(), 'jsdoc.conf');
        fs.accessSync(jsdocConf, fs.F_OK);

        logHelper.info('Building JSDocs');

        const jsDocParams = [
          '-c',
          jsdocConf,
          '-d',
          path.join(
            this._servingDocInfo.tmpObj.name, 'reference-docs', 'Example'
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
      } catch (err) {
        // NOOP
      }

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
    } catch (err) {
      logHelper.error(err);
    }
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

  /**
   * This method implements the 'publish-docs' command.
   */
  publishDocSite() {
    // 1.    Clone github pages
    // 2.    Remove old files
    // 2.2   Build reference docs
    // 3   Copy files from /docs/
    // 4   Update Jekyll Template
    // 5   Generate Jekyll docs list
    // 6   Commit doc changes
    // 7   Clean
  }
}

module.exports = NPMPublishScriptCLI;
