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
const spawn = require('child_process').spawn;
const CLI = require('../src/cli/index.js');

require('chai').should();

describe('Test Command Line Interface', function() {
  const originalExit = process.exit;
  const originalLog = console.log;
  const originalError = console.error;

  let globalExitCode = -1;
  let globalServiceName = null;
  let globalLogs = [];

  const startLogCapture = () => {
    console.log = string => {
      globalLogs.push(string);
    };
    console.error = string => {
      globalLogs.push(string);
    };
  };

  const endLogCapture = () => {
    console.log = originalLog;
    console.error = originalError;
  };

  before(function() {
    process.exit = code => {
      globalExitCode = code;
    };
  });

  after(function() {
    process.exit = originalExit;
  });

  beforeEach(function() {
    globalLogs = [];
    globalExitCode = -1;
  });

  afterEach(function() {
    if (globalServiceName) {
      new CLI().argv(['stop', globalServiceName]);
      globalServiceName = null;
    }

    endLogCapture();
  });

  it('should be able to find the cli from package.json', function() {
    const binValues = require('../package.json').bin;
    const cliPath = binValues['npm-publish-scripts'];
    fs.accessSync(path.join(__dirname, '..', cliPath), fs.F_OK);
  });

  it('should show help text and exit with bad code', function() {
    startLogCapture();

    new CLI().argv([])

    globalExitCode.should.equal(1);

    endLogCapture();
  });

  it('should show help text', function() {
    startLogCapture();

    const inputs = ['-h', '--help'];
    inputs.forEach(input => {
      new CLI().argv([input]);
    });

    globalExitCode.should.equal(0);

    endLogCapture();

    const helpText = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'cli', 'cli-help.txt'), 'utf8');
    globalLogs.forEach(log => {
      log.should.equal(helpText);
    })
  });

  it('should show version number', function() {
    startLogCapture();

    const inputs = ['-v', '--version'];
    inputs.forEach(input => {
      new CLI().argv([input]);
    });
    globalExitCode.should.equal(0);

    const version = require('../package.json').version;
    globalLogs.length.should.equal(inputs.length);
    globalLogs.forEach(log => {
      log.should.equal(version);
    });

    endLogCapture();
  });

  it('should handle random commands', function() {
    startLogCapture();

    const invalidCommand = 'random-command-1234567890';
    new CLI().argv([invalidCommand]);

    endLogCapture();

    globalExitCode.should.equal(1);

    globalLogs[0].should.equal(`Invlaid command given '${invalidCommand}'`);
  });

  it('should serve the doc site', function() {
    return new Promise((resolve, reject) => {
      const serveDocProcess = spawn('node', [
        path.join(__dirname, 'helpers', 'serve-doc-site.js')
      ]);

      serveDocProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
      });

      serveDocProcess.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
      });

      serveDocProcess.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        resolve();
      });
    });
  })
});
