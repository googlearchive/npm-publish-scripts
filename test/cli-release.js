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
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const strings = require('../src/node/cli/strings');

require('chai').should();

describe('Test CLI - publish-release', function() {
  this.timeout(5 * 1000);

  const originalExit = process.exit;
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  let globalExitCode = -1;
  let globalLogs = [];
  let globalStubs = [];
  const testOutput = path.join(__dirname, 'test-output');

  const startLogCapture = () => {
    console.log = (string) => {
      globalLogs.push(string);
    };
    console.warn = (string) => {
      globalLogs.push(string);
    };
    console.error = (string) => {
      globalLogs.push(string);
    };
  };

  const endLogCapture = () => {
    console.log = originalLog;
    console.warn = originalWarn;
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

    endLogCapture();

    fse.removeSync(testOutput);

    process.chdir(path.join(__dirname, '..'));

    globalStubs.forEach((stub) => {
      stub.restore();
    });
  });

  it('should handle error in retrieving the branch name', function() {
    const CLI = require('../src/node/cli/index.js');

    const errorMessage = 'Injected Git Branch Name Error.';
    const cli = new CLI();
    const branchNameStub = sinon.stub(cli, 'getCurrentBranchName');
    branchNameStub.returns(Promise.reject(new Error(errorMessage)));

    globalStubs.push(branchNameStub);

    startLogCapture();
    return cli.argv(['publish-release'])
    .then(() => {
      endLogCapture();

      globalLogs[0].indexOf(errorMessage);

      globalExitCode.should.equal(1);
    });
  });

  it('should handle git branch name inquire error', function() {
    const errorMessage = 'Inject Inquirer Error.';
    const CLI = proxyquire('../src/node/cli/index.js', {
      'inquirer': {
        prompt: () => {
          return Promise.reject(new Error(errorMessage));
        },
      },
    });

    const cli = new CLI();
    const branchNameStub = sinon.stub(cli, 'getCurrentBranchName');
    branchNameStub.returns(Promise.resolve('random-branch-1234567890'));

    globalStubs.push(branchNameStub);

    startLogCapture();
    return cli.argv(['publish-release'])
    .then(() => {
      endLogCapture();

      globalLogs[0].indexOf(errorMessage);

      globalExitCode.should.equal(1);
    });
  });

  it('should hanlde user rejection on non-master branch', function() {
    const CLI = proxyquire('../src/node/cli/index.js', {
      'inquirer': {
        prompt: () => {
          return Promise.resolve({
            publish: false,
          });
        },
      },
    });

    const cli = new CLI();
    const branchNameStub = sinon.stub(cli, 'getCurrentBranchName');
    branchNameStub.returns(Promise.resolve('random-branch-1234567890'));

    globalStubs.push(branchNameStub);

    startLogCapture();
    return cli.argv(['publish-release'])
    .then(() => {
      endLogCapture();

      globalExitCode.should.equal(1);

      globalLogs.length.should.equal(0);
    });
  });

  it('shouldn\'t ask user a Q if on master branch', function() {
    let askedInquirer = false;
    const CLI = proxyquire('../src/node/cli/index.js', {
      'inquirer': {
        prompt: () => {
          askedInquirer = true;
          return Promise.resolve({
            publish: true,
          });
        },
      },
    });

    const cli = new CLI();
    const branchNameStub = sinon.stub(cli, 'getCurrentBranchName');
    branchNameStub.returns(Promise.resolve('master'));

    globalStubs.push(branchNameStub);

    return cli.confirmExpectedGitBranch()
    .then(() => {
      askedInquirer.should.equal(false);
    });
  });

  it('should handle user allowing release on non-master branch', function() {
    const CLI = proxyquire('../src/node/cli/index.js', {
      'inquirer': {
        prompt: () => {
          return Promise.resolve({
            publish: true,
          });
        },
      },
    });

    const cli = new CLI();
    const branchNameStub = sinon.stub(cli, 'getCurrentBranchName');
    branchNameStub.returns(Promise.resolve('random-branch-1234567890'));

    globalStubs.push(branchNameStub);

    return cli.confirmExpectedGitBranch();
  });

  it('should have good defaults and handle error for getting release details', function() {
    const errorMessage = 'Injected Inquirer Error.';
    const CLI = proxyquire('../src/node/cli/index.js', {
      'inquirer': {
        prompt: (questions) => {
          questions.forEach((question) => {
            switch(question.name) {
              case 'version':
                question.default.should.equal('patch');
                break;
              case 'tag':
                question.default.should.equal('stable');
                break;
              default:
                return Promise.reject('Unexpected question in test suite.');
            }
          });
          return Promise.reject(new Error(errorMessage));
        },
      },
    });

    const cli = new CLI();
    const branchNameStub = sinon.stub(cli, 'confirmExpectedGitBranch');
    branchNameStub.returns(Promise.resolve());

    globalStubs.push(branchNameStub);

    startLogCapture();
    return cli.argv(['publish-release'])
    .then(() => {
      endLogCapture();

      globalExitCode.should.equal(1);
      globalLogs[0].indexOf(errorMessage).should.not.equal(-1);
    });
  });

  it('should be able to get the current package.json file', function() {
    process.chdir(testOutput);

    const packageDetails = {
      scripts: {
        build: 'gulp build:prod',
      },
    };

    fse.writeJsonSync(path.join(testOutput, 'package.json'), packageDetails);

    const CLI = require('../src/node/cli/index.js');
    const cli = new CLI();
    return cli.getProjectPackage()
    .then((pkg) => {
      pkg.should.deep.equal(packageDetails);
    });
  });

  it('should print no tests warning if no scripts are defined', function() {
    process.chdir(testOutput);

    const packageDetails = {
      name: 'example-name',
    };

    fse.writeJsonSync(path.join(testOutput, 'package.json'), packageDetails);

    const CLI = require('../src/node/cli/index.js');
    const cli = new CLI();

    const branchNameStub = sinon.stub(cli, 'confirmExpectedGitBranch');
    branchNameStub.returns(Promise.resolve());
    globalStubs.push(branchNameStub);
    const getDetailsStub = sinon.stub(cli, 'getPublishDetails');
    getDetailsStub.returns(Promise.resolve());
    globalStubs.push(getDetailsStub);

    startLogCapture();
    return cli.runNPMScripts()
    .then(() => {
      endLogCapture();

      globalLogs[0].indexOf(strings['no-test-script']).should.not.equal(-1);
    });
  });

  it('should print no test warning if only other scripts are defined', function() {
    process.chdir(testOutput);

    const packageDetails = {
      name: 'example-name',
      scripts: {
        rando: 'echo "This shouldn\'t run"',
        example: 'echo "This shouldn\'t run either"',
      },
    };

    fse.writeJsonSync(path.join(testOutput, 'package.json'), packageDetails);

    const CLI = require('../src/node/cli/index.js');
    const cli = new CLI();

    const branchNameStub = sinon.stub(cli, 'confirmExpectedGitBranch');
    branchNameStub.returns(Promise.resolve());
    globalStubs.push(branchNameStub);
    const getDetailsStub = sinon.stub(cli, 'getPublishDetails');
    getDetailsStub.returns(Promise.resolve());
    globalStubs.push(getDetailsStub);

    startLogCapture();
    return cli.runNPMScripts()
    .then(() => {
      endLogCapture();

      globalLogs[0].indexOf(strings['no-test-script']).should.not.equal(-1);
    });
  });

  it('should run the build step if defined.', function() {
    process.chdir(testOutput);
    const buildFilename = 'build.txt';
    const packageDetails = {
      name: 'example-name',
      scripts: {
        rando: 'echo "This shouldn\'t run"',
        example: 'echo "This shouldn\'t run either"',
        build: `touch ${buildFilename}`,
      },
    };

    fse.writeJsonSync(path.join(testOutput, 'package.json'), packageDetails);

    const CLI = require('../src/node/cli/index.js');
    const cli = new CLI();

    const branchNameStub = sinon.stub(cli, 'confirmExpectedGitBranch');
    branchNameStub.returns(Promise.resolve());
    globalStubs.push(branchNameStub);

    const getDetailsStub = sinon.stub(cli, 'getPublishDetails');
    getDetailsStub.returns(Promise.resolve());
    globalStubs.push(getDetailsStub);

    startLogCapture();
    return cli.runNPMScripts()
    .then(() => {
      endLogCapture();

      globalLogs[0].indexOf(strings['no-test-script']).should.not.equal(-1);
    })
    .then(() => {
      // Check the npm script ran - will throw if the file doesn't exist.
      fs.accessSync(path.join(testOutput, buildFilename), fs.F_OK);
    });
  });

  it('should run the build and test steps if defined.', function() {
    process.chdir(testOutput);
    const buildFilename = 'build.txt';
    const testFilename = 'test.txt';
    const packageDetails = {
      name: 'example-name',
      scripts: {
        rando: 'echo "This shouldn\'t run"',
        example: 'echo "This shouldn\'t run either"',
        build: `touch ${buildFilename}`,
        test: `touch ${testFilename}`,
      },
    };

    fse.writeJsonSync(path.join(testOutput, 'package.json'), packageDetails);

    const CLI = require('../src/node/cli/index.js');
    const cli = new CLI();

    const branchNameStub = sinon.stub(cli, 'confirmExpectedGitBranch');
    branchNameStub.returns(Promise.resolve());
    globalStubs.push(branchNameStub);

    const getDetailsStub = sinon.stub(cli, 'getPublishDetails');
    getDetailsStub.returns(Promise.resolve());
    globalStubs.push(getDetailsStub);

    startLogCapture();
    return cli.runNPMScripts()
    .then(() => {
      endLogCapture();

      globalLogs.length.should.equal(0);
    })
    .then(() => {
      // Check the npm script ran - will throw if the file doesn't exist.
      fs.accessSync(path.join(testOutput, buildFilename), fs.F_OK);
      fs.accessSync(path.join(testOutput, testFilename), fs.F_OK);
    });
  });

  it('should have correct error and exit code when log in to NPM fails', function() {
    process.chdir(testOutput);
    const packageDetails = {
      name: 'example-name',
      scripts: {
        test: `echo "Log from test npm script."`,
      },
    };

    fse.writeJsonSync(path.join(testOutput, 'package.json'), packageDetails);

    const errorMessage = 'Injected NPM Login Error.';
    const CLI = require('../src/node/cli/index.js');

    const cli = new CLI();
    const branchNameStub = sinon.stub(cli, 'confirmExpectedGitBranch', () => {
      return Promise.resolve();
    });
    globalStubs.push(branchNameStub);

    const publishDetailsStub = sinon.stub(cli, 'getPublishDetails', () => {
      return Promise.resolve({version: 'patch',
        tag: 'stable'});
    });
    globalStubs.push(publishDetailsStub);

    const loginToNPMStub = sinon.stub(cli, 'loginToNPM', () => {
      return Promise.reject(new Error(errorMessage));
    });
    globalStubs.push(loginToNPMStub);

    startLogCapture();
    return cli.argv(['publish-release'])
    .then(() => {
      endLogCapture();

      globalExitCode.should.equal(1);
      globalLogs[0].indexOf(errorMessage).should.not.equal(-1);
    });
  });

  it('should handle erroring Inquirer for publish confirmation', function() {
    process.chdir(testOutput);
    const packageDetails = {
      name: 'example-name',
      scripts: {
        test: `echo "Log from test npm script."`,
      },
    };

    fse.writeJsonSync(path.join(testOutput, 'package.json'), packageDetails);

    const errorMessage = 'Injected Inquirer Error.';
    const CLI = proxyquire('../src/node/cli/index.js', {
      'inquirer': {
        prompt: (questions) => {
          return Promise.reject(new Error(errorMessage));
        },
      },
    });

    const cli = new CLI();
    const branchNameStub = sinon.stub(cli, 'confirmExpectedGitBranch', () => {
      return Promise.resolve();
    });
    globalStubs.push(branchNameStub);

    const publishDetailsStub = sinon.stub(cli, 'getPublishDetails', () => {
      return Promise.resolve({version: 'patch',
        tag: 'stable'});
    });
    globalStubs.push(publishDetailsStub);

    const loginToNPMStub = sinon.stub(cli, 'loginToNPM', () => {
      return Promise.resolve();
    });
    globalStubs.push(loginToNPMStub);

    startLogCapture();
    return cli.argv(['publish-release'])
    .then(() => {
      endLogCapture();

      globalExitCode.should.equal(1);
      globalLogs[0].indexOf(errorMessage).should.not.equal(-1);
    });
  });

  it('should not publish if response at publish confirmation is false', function() {
    process.chdir(testOutput);
    const packageDetails = {
      name: 'example-name',
      scripts: {
        test: `echo "Log from test npm script."`,
      },
    };

    fse.writeJsonSync(path.join(testOutput, 'package.json'), packageDetails);

    const CLI = proxyquire('../src/node/cli/index.js', {
      'inquirer': {
        prompt: (questions) => {
          return Promise.resolve(false);
        },
      },
    });

    const cli = new CLI();
    const branchNameStub = sinon.stub(cli, 'confirmExpectedGitBranch', () => {
      return Promise.resolve();
    });
    globalStubs.push(branchNameStub);

    const publishDetailsStub = sinon.stub(cli, 'getPublishDetails', () => {
      return Promise.resolve({version: 'patch',
        tag: 'stable'});
    });
    globalStubs.push(publishDetailsStub);

    const loginToNPMStub = sinon.stub(cli, 'loginToNPM', () => {
      return Promise.resolve();
    });
    globalStubs.push(loginToNPMStub);

    startLogCapture();
    return cli.argv(['publish-release'])
    .then(() => {
      endLogCapture();

      globalExitCode.should.equal(1);
      globalLogs.length.should.equal(0);
    });
  });

  it('should bump the version correctly', function() {
    process.chdir(testOutput);
    const packageDetails = {
      name: 'example-name',
      version: '0.0.0',
      scripts: {
        test: `echo "Log from test npm script."`,
      },
    };

    fse.writeJsonSync(path.join(testOutput, 'package.json'), packageDetails);

    const CLI = require('../src/node/cli/index.js');
    const cli = new CLI();
    return cli.updatePackageVersion('patch')
    .then((newVersion) => {
      newVersion.should.equal('v0.0.1');

      const pkgDetails = fse.readJsonSync(path.join(testOutput, 'package.json'));
      pkgDetails.version.should.equal('0.0.1');

      return cli.updatePackageVersion('minor');
    })
    .then((newVersion) => {
      newVersion.should.equal('v0.1.0');

      const pkgDetails = fse.readJsonSync(path.join(testOutput, 'package.json'));
      pkgDetails.version.should.equal('0.1.0');

      return cli.updatePackageVersion('major');
    })
    .then((newVersion) => {
      newVersion.should.equal('v1.0.0');

      const pkgDetails = fse.readJsonSync(path.join(testOutput, 'package.json'));
      pkgDetails.version.should.equal('1.0.0');
    });
  });

  it('should handle failing npm version update', function() {
    process.chdir(testOutput);
    const packageDetails = {
      name: 'example-name',
      scripts: {
        test: `echo "Log from test npm script."`,
      },
    };

    fse.writeJsonSync(path.join(testOutput, 'package.json'), packageDetails);

    const errorMessage = 'Inject npm version update error.';
    const CLI = require('../src/node/cli/index.js');
    const cli = new CLI();

    const branchNameStub = sinon.stub(cli, 'confirmExpectedGitBranch', () => {
      return Promise.resolve();
    });
    globalStubs.push(branchNameStub);

    const publishDetailsStub = sinon.stub(cli, 'getPublishDetails', () => {
      return Promise.resolve({version: 'patch',
        tag: 'stable'});
    });
    globalStubs.push(publishDetailsStub);

    const loginToNPMStub = sinon.stub(cli, 'loginToNPM', () => {
      return Promise.resolve();
    });
    globalStubs.push(loginToNPMStub);


    const confirmPublishStub = sinon.stub(cli, 'confirmNewPackageVersion', () => {
      return Promise.resolve();
    });
    globalStubs.push(confirmPublishStub);

    const updateVersionStub = sinon.stub(cli, 'updatePackageVersion', () => {
      return Promise.reject(new Error(errorMessage));
    });
    globalStubs.push(updateVersionStub);

    startLogCapture();
    return cli.argv(['publish-release'])
    .then(() => {
      endLogCapture();

      globalExitCode.should.equal(1);
      globalLogs[0].indexOf(errorMessage).should.not.equal(-1);
    });
  });

  it('should handle failing npm publish', function() {
    process.chdir(testOutput);
    const packageDetails = {
      name: 'example-name',
      scripts: {
        test: `echo "Log from test npm script."`,
      },
    };

    fse.writeJsonSync(path.join(testOutput, 'package.json'), packageDetails);

    const errorMessage = 'Inject npm publish error.';
    const CLI = require('../src/node/cli/index.js');
    const cli = new CLI();

    const branchNameStub = sinon.stub(cli, 'confirmExpectedGitBranch', () => {
      return Promise.resolve();
    });
    globalStubs.push(branchNameStub);

    const publishDetailsStub = sinon.stub(cli, 'getPublishDetails', () => {
      return Promise.resolve({version: 'patch',
        tag: 'stable'});
    });
    globalStubs.push(publishDetailsStub);

    const loginToNPMStub = sinon.stub(cli, 'loginToNPM', () => {
      return Promise.resolve();
    });
    globalStubs.push(loginToNPMStub);


    const confirmPublishStub = sinon.stub(cli, 'confirmNewPackageVersion', () => {
      return Promise.resolve();
    });
    globalStubs.push(confirmPublishStub);

    const updateVersionStub = sinon.stub(cli, 'updatePackageVersion', () => {
      return Promise.resolve('v1.0.0');
    });
    globalStubs.push(updateVersionStub);

    const publishToNPMStub = sinon.stub(cli, 'publishToNPM', () => {
      return Promise.reject(new Error(errorMessage));
    });
    globalStubs.push(publishToNPMStub);

    startLogCapture();
    return cli.argv(['publish-release'])
    .then(() => {
      endLogCapture();

      globalExitCode.should.equal(1);
      globalLogs[0].indexOf(errorMessage).should.not.equal(-1);
    });
  });

  it('should handle failing git tag push', function() {
    process.chdir(testOutput);
    const packageDetails = {
      name: 'example-name',
      scripts: {
        test: `echo "Log from test npm script."`,
      },
    };

    fse.writeJsonSync(path.join(testOutput, 'package.json'), packageDetails);

    const errorMessage = 'Injected Git Tag Push Error.';
    const CLI = require('../src/node/cli/index.js');
    const cli = new CLI();

    const branchNameStub = sinon.stub(cli, 'confirmExpectedGitBranch', () => {
      return Promise.resolve();
    });
    globalStubs.push(branchNameStub);

    const publishDetailsStub = sinon.stub(cli, 'getPublishDetails', () => {
      return Promise.resolve({version: 'patch',
        tag: 'stable'});
    });
    globalStubs.push(publishDetailsStub);

    const loginToNPMStub = sinon.stub(cli, 'loginToNPM', () => {
      return Promise.resolve();
    });
    globalStubs.push(loginToNPMStub);


    const confirmPublishStub = sinon.stub(cli, 'confirmNewPackageVersion', () => {
      return Promise.resolve();
    });
    globalStubs.push(confirmPublishStub);

    const updateVersionStub = sinon.stub(cli, 'updatePackageVersion', () => {
      return Promise.resolve('v1.0.0');
    });
    globalStubs.push(updateVersionStub);

    const publishToNPMStub = sinon.stub(cli, 'publishToNPM', () => {
      return Promise.resolve();
    });
    globalStubs.push(publishToNPMStub);

    const gitTagPushStub = sinon.stub(cli, 'pushGithubTag', () => {
      return Promise.reject(new Error(errorMessage));
    });
    globalStubs.push(gitTagPushStub);

    startLogCapture();
    return cli.argv(['publish-release'])
    .then(() => {
      endLogCapture();

      globalExitCode.should.equal(1);
      globalLogs[0].indexOf(errorMessage).should.not.equal(-1);
    });
  });

  it('should handle failing git tag push', function() {
    process.chdir(testOutput);
    const packageDetails = {
      name: 'example-name',
      scripts: {
        test: `echo "Log from test npm script."`,
      },
    };

    fse.writeJsonSync(path.join(testOutput, 'package.json'), packageDetails);

    const CLI = require('../src/node/cli/index.js');
    const cli = new CLI();

    const branchNameStub = sinon.stub(cli, 'confirmExpectedGitBranch', () => {
      return Promise.resolve();
    });
    globalStubs.push(branchNameStub);

    const publishDetailsStub = sinon.stub(cli, 'getPublishDetails', () => {
      return Promise.resolve({version: 'patch',
        tag: 'stable'});
    });
    globalStubs.push(publishDetailsStub);

    const loginToNPMStub = sinon.stub(cli, 'loginToNPM', () => {
      return Promise.resolve();
    });
    globalStubs.push(loginToNPMStub);


    const confirmPublishStub = sinon.stub(cli, 'confirmNewPackageVersion', () => {
      return Promise.resolve();
    });
    globalStubs.push(confirmPublishStub);

    const updateVersionStub = sinon.stub(cli, 'updatePackageVersion', () => {
      return Promise.resolve('v1.0.0');
    });
    globalStubs.push(updateVersionStub);

    const publishToNPMStub = sinon.stub(cli, 'publishToNPM', () => {
      return Promise.resolve();
    });
    globalStubs.push(publishToNPMStub);

    const gitTagPushStub = sinon.stub(cli, 'pushGithubTag', () => {
      return Promise.resolve();
    });
    globalStubs.push(gitTagPushStub);

    startLogCapture();
    return cli.argv(['publish-release'])
    .then(() => {
      endLogCapture();

      globalExitCode.should.equal(0);
      globalLogs.length.should.equal(0);
    });
  });
});
