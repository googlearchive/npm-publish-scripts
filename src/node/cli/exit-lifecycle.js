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

/* eslint-disable no-console */

/**
 * The ExitLifeCycle class will detect when the CLI is about to exit
 * the process and givens the CLI an opporunity to do clean up before
 * the exit has been performed.
 */
class ExitLifeCycle {
  /**
   * This class is instantiated when it's required in.
   */
  constructor() {
    this._eventListeners = {
      exit: [],
    };
    this._eventsInitialised = false;
  }

  /**
   * This method sets up the listened for the current process.
   * This is called when the first event listener is added.
   */
  _initialiseListeners() {
    if (this._eventsInitialised) {
      return;
    }

    this._eventsInitialised = true;

    // do app specific cleaning before exiting
    process.on('exit', () => {
      return this._dispatchEvent('exit')
      .then(() => {
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('');
      console.log('');
      console.log('Ctrl-C intercepted.');
      console.log('');
      console.log('');

      process.exit(2);
    });

    process.on('uncaughtException', (err) => {
      console.log('');
      console.log('');
      console.error('Uncaught Exception intercepted.');
      console.error(err.stack);
      console.log('');
      console.log('');

      process.exit(99);
    });
  }

  /**
   * To listen for the process exit event add a callback here with
   * event name 'exit'.
   * @param {string} eventName The name of the event to listen for.
   * @param {function} cb The function to call when the event is dispatched.
   */
  addEventListener(eventName, cb) {
    if (!this._eventListeners[eventName]) {
      throw new Error(`Unsupported event name '${eventName}'`);
    }

    this._eventListeners[eventName].push(cb);

    this._initialiseListeners();
  }

  /**
   * Dispatch an event to the listeners of an event.
   * @param {string} eventName The name of the event to dispatch.
   * @return {Promise} Returns a promise that resolves after all the
   * callbacks have completed there tasks.
   */
  _dispatchEvent(eventName) {
    return Promise.all(
      this._eventListeners[eventName].map((callback) => {
        return callback();
      })
    );
  }
}

module.exports = new ExitLifeCycle();
