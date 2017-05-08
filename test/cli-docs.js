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

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const spawn = require('child_process').spawn;
const fetch = require('node-fetch');
const sinon = require('sinon');

const CLI = require('../src/node/cli/index.js');

require('chai').should();

describe('Test CLI - publish-docs', function() {
  const originalExit = process.exit;
  const originalLog = console.log;
  const originalError = console.error;

  let globalDocProcess = null;
  let globalExitCode = -1;
  let globalServiceName = null;
  let globalLogs = [];
  let globalStubs = [];
  const testOutput = path.join(__dirname, 'test-output');

  const startLogCapture = () => {
    console.log = (string) => {
      globalLogs.push(string);
    };
    console.error = (string) => {
      globalLogs.push(string);
    };
  };

  const endLogCapture = () => {
    console.log = originalLog;
    console.error = originalError;
  };

  before(function() {
    process.exit = (code) => {
      globalExitCode = code;
    };
  });

  after(function() {
    process.exit = originalExit;
  });

  beforeEach(function() {
    globalLogs = [];
    globalExitCode = -1;

    fse.mkdirpSync(testOutput);
  });

  afterEach(function() {
    this.timeout(10000);

    if (globalServiceName) {
      new CLI().argv(['stop', globalServiceName]);
      globalServiceName = null;
    }

    endLogCapture();

    fse.removeSync(testOutput);

    process.chdir(path.join(__dirname, '..'));

    globalStubs.forEach((stub) => {
      stub.restore();
    });

    if (globalDocProcess) {
      return new Promise((resolve, reject) => {
        globalDocProcess.on('close', (code) => {
          globalDocProcess = null;
          resolve();
        });

        globalDocProcess.kill('SIGINT');
      })
      .then(() => {
        globalDocProcess = null;
      });
    }
  });

  it('should copy files on initialising a project', function() {
    process.chdir(testOutput);

    return new CLI().argv(['init'])
    .then(() => {
      // TODO: This should just check all files and directories from
      // src/defaults are here.
      fse.ensureDir(
        path.join(process.cwd(), 'docs')
      );
      fse.ensureFileSync(
        path.join(process.cwd(), 'docs', '_config.yml')
      );
      fse.ensureFileSync(
        path.join(process.cwd(), 'docs', 'index.md')
      );
      fse.ensureFileSync(
        path.join(process.cwd(), 'Gemfile')
      );
      fse.ensureFileSync(
        path.join(process.cwd(), '.ruby-version')
      );
      fse.ensureFileSync(
        path.join(process.cwd(), 'jsdoc.conf')
      );
    });
  });

  it('should serve the doc site', function() {
    // Building JSDoc + Jekyll may take some time.
    this.timeout(10000);

    const docPromise = new Promise((resolve, reject) => {
      globalDocProcess = spawn('node', [
        path.join(__dirname, 'helpers', 'serve.js'),
      ]);

      globalDocProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
      });

      globalDocProcess.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
      });

      globalDocProcess.stderr.on('error', (err) => {
        console.log(`Process Error: ${err.message}`);
        reject(err);
      });

      globalDocProcess.on('close', (code) => {
        globalDocProcess = null;
        resolve();
      });
    });

    const attemptToGetSite = () => {
      return fetch('http://localhost:4000')
      .then((response) => {
        if (response.status !== 200) {
          return false;
        }

        return true;
      }, () => {
        return false;
      });
    };

    const waitForValidResponse = (cb) => {
      return attemptToGetSite()
      .then((wasValid) => {
        if (wasValid) {
          cb();
        } else {
          setTimeout(() => {
            waitForValidResponse(cb);
          }, 1000);
        }
      });
    };

    return new Promise((resolve, reject) => {
      waitForValidResponse(resolve);
    })
    .then(() => {
      globalDocProcess.kill('SIGINT');

      return docPromise;
    });
  });

  it('should fail publishing if gh-pages exists', function() {
    process.chdir(testOutput);

    fse.ensureDirSync(path.join(testOutput, 'gh-pages'));

    startLogCapture();
    return new CLI().argv(['publish-docs'])
    .then(() => {
      endLogCapture();

      globalExitCode.should.equal(1);

      globalLogs[0].indexOf('The directory \'gh-pages\' already exists.')
        .should.not.equal(-1);
    });
  });

  it('should handle failing github pages checkout', function() {
    process.chdir(testOutput);

    const errMsg = 'Injected error from Mocha';

    const cli = new CLI();
    const checkoutStub = sinon.stub(cli, 'checkoutGithubPages');
    checkoutStub.returns(Promise.reject(errMsg));

    globalStubs.push(checkoutStub);

    startLogCapture();
    return cli.argv(['publish-docs'])
    .then(() => {
      endLogCapture();

      globalLogs[0].indexOf(errMsg);

      globalExitCode.should.equal(1);
    });
  });

  it('should handle failing clean up gh-pages directory', function() {
    process.chdir(testOutput);

    const errMsg = 'Injected error from Mocha';

    const cli = new CLI();

    const checkoutStub = sinon.stub(cli, 'checkoutGithubPages');
    checkoutStub.returns(Promise.resolve());
    const cleanupGHPages = sinon.stub(cli, 'cleanupGithubPages');
    cleanupGHPages.returns(Promise.reject(errMsg));

    globalStubs.push(checkoutStub);
    globalStubs.push(cleanupGHPages);

    startLogCapture();
    return cli.argv(['publish-docs'])
    .then(() => {
      endLogCapture();

      globalLogs[0].indexOf(errMsg);

      globalExitCode.should.equal(1);
    });
  });

  it('should handle failing git push', function() {
    process.chdir(testOutput);

    const errMsg = 'Injected error from Mocha';

    fse.ensureDirSync(path.join(testOutput, 'docs'));

    const cli = new CLI();

    const checkoutStub = sinon.stub(cli, 'checkoutGithubPages');
    checkoutStub.returns(Promise.resolve());
    const cleanupGHPages = sinon.stub(cli, 'cleanupGithubPages').callsFake(() => {
      fse.ensureDirSync(path.join(testOutput, 'gh-pages'));
      return Promise.resolve();
    });
    const pushChangesStub = sinon.stub(cli, 'pushChangesToGithub');
    pushChangesStub.returns(Promise.reject(errMsg));

    globalStubs.push(checkoutStub);
    globalStubs.push(cleanupGHPages);
    globalStubs.push(pushChangesStub);

    startLogCapture();
    return cli.argv(['publish-docs'])
    .then(() => {
      endLogCapture();

      globalLogs[0].indexOf(errMsg);

      globalExitCode.should.equal(1);

      let dirDeleted = false;
      try {
        fs.accessSync(path.join(testOutput, 'gh-pages'), fs.F_OK);
      } catch (err) {
        dirDeleted = true;
      }

      dirDeleted.should.equal(true);
    });
  });

  it('should delete gh-pages if all successful', function() {
    process.chdir(testOutput);

    fse.ensureDirSync(path.join(testOutput, 'docs'));

    const cli = new CLI();

    const checkoutStub = sinon.stub(cli, 'checkoutGithubPages');
    checkoutStub.returns(Promise.resolve());
    const cleanupGHPages = sinon.stub(cli, 'cleanupGithubPages').callsFake(() => {
      fse.ensureDirSync(path.join(testOutput, 'gh-pages'));
      return Promise.resolve();
    });
    const pushChangesStub = sinon.stub(cli, 'pushChangesToGithub');
    pushChangesStub.returns(Promise.resolve());

    globalStubs.push(checkoutStub);
    globalStubs.push(cleanupGHPages);
    globalStubs.push(pushChangesStub);

    startLogCapture();
    return cli.argv(['publish-docs'])
    .then(() => {
      endLogCapture();

      globalExitCode.should.equal(0);

      let dirDeleted = false;
      try {
        fs.accessSync(path.join(testOutput, 'gh-pages'), fs.F_OK);
      } catch (err) {
        dirDeleted = true;
      }

      dirDeleted.should.equal(true);
    });
  });
});
