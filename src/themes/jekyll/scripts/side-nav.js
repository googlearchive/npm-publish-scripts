/**
 *
 * Copyright 2016 Google Inc. All rights reserved.
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
 */

/* eslint-env browser */

'use strict';

/**
 * Implements a sliding side navigation.
 */
class SideNav {
  /**
   * Create a new side nav.
   */
  constructor() {
    this.showButtonEl = document.querySelector('.js-menu-show');
    this.hideButtonEl = document.querySelector('.js-menu-hide');
    this.sideNavEl = document.querySelector('.js-side-nav');
    this.sideNavContainerEl = document.querySelector('.js-side-nav-container');
    // Control whether the container's children can be focused
    // Set initial state to inert since the drawer is offscreen
    this.detabinator = new window.Detabinator(this.sideNavContainerEl);
    this.detabinator.inert = true;

    this.showSideNav = this.showSideNav.bind(this);
    this.hideSideNav = this.hideSideNav.bind(this);
    this.blockClicks = this.blockClicks.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onTransitionEnd = this.onTransitionEnd.bind(this);
    this.update = this.update.bind(this);

    this.startX = 0;
    this.currentX = 0;
    this.touchingSideNav = false;

    this.supportsPassive = undefined;
    this.addEventListeners();
  }

  /**
   * apply passive event listening if it's supported
   * @return {Boolean} Returns whether passive events are supported.
   */
  applyPassive() {
    if (this.supportsPassive !== undefined) {
      return this.supportsPassive ? {passive: true} : false;
    }
    // feature detect
    let isSupported = false;
    try {
      document.addEventListener('test', null, {get passive() {
        isSupported = true;
      }});
    } catch (e) {
      // NOOP
    }
    this.supportsPassive = isSupported;
    return this.applyPassive();
  }

  /**
   * Add event listeners that perform the slide of the nav drawer
   */
  addEventListeners() {
    this.showButtonEl.addEventListener('click', this.showSideNav);
    this.hideButtonEl.addEventListener('click', this.hideSideNav);
    this.sideNavEl.addEventListener('click', this.hideSideNav);
    this.sideNavContainerEl.addEventListener('click', this.blockClicks);

    this.sideNavEl.addEventListener('touchstart', this.onTouchStart,
      this.applyPassive());
    this.sideNavEl.addEventListener('touchmove', this.onTouchMove,
      this.applyPassive());
    this.sideNavEl.addEventListener('touchend', this.onTouchEnd);
  }

  /**
   * Events to open / close the side nav.
   * @param {Event} evt The start touch event.
   */
  onTouchStart(evt) {
    if (!this.sideNavEl.classList.contains('side-nav--visible'))
      return;

    this.startX = evt.touches[0].pageX;
    this.currentX = this.startX;

    this.touchingSideNav = true;
    requestAnimationFrame(this.update);
  }

  /**
   * Events to open / close the side nav.
   * @param {Event} evt The move touch event.
   */
  onTouchMove(evt) {
    if (!this.touchingSideNav)
      return;

    this.currentX = evt.touches[0].pageX;
    const translateX = Math.min(0, this.currentX - this.startX);

    if (translateX < 0) {
      evt.preventDefault();
    }
  }

  /**
   * The touch event listener
   * @param {Event} evt The touch end event.
   */
  onTouchEnd(evt) {
    if (!this.touchingSideNav)
      return;

    this.touchingSideNav = false;

    const translateX = Math.min(0, this.currentX - this.startX);
    this.sideNavContainerEl.style.transform = '';

    if (translateX < 0) {
      this.hideSideNav();
    }
  }

  /**
   * Update the side nav animation.
   */
  update() {
    if (!this.touchingSideNav)
      return;

    requestAnimationFrame(this.update);

    const translateX = Math.min(0, this.currentX - this.startX);
    this.sideNavContainerEl.style.transform = `translateX(${translateX}px)`;
  }

  /**
   * Block clicks
   * @param {Event} evt Event to block.
   */
  blockClicks(evt) {
    evt.stopPropagation();
  }

  /**
   * @param {Event} evt The end of transition event.
   */
  onTransitionEnd(evt) {
    this.sideNavEl.classList.remove('side-nav--animatable');
    this.sideNavEl.removeEventListener('transitionend', this.onTransitionEnd);
  }

  /**
   * Opens the side nav.
   */
  showSideNav() {
    this.sideNavEl.classList.add('side-nav--animatable');
    this.sideNavEl.classList.add('side-nav--visible');
    this.detabinator.inert = false;
    this.sideNavEl.addEventListener('transitionend', this.onTransitionEnd);
  }

  /**
   * Hide the side nav.
   */
  hideSideNav() {
    this.sideNavEl.classList.add('side-nav--animatable');
    this.sideNavEl.classList.remove('side-nav--visible');
    this.detabinator.inert = true;
    this.sideNavEl.addEventListener('transitionend', this.onTransitionEnd);
  }
}

new SideNav();
