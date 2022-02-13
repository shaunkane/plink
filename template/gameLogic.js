/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// gameLogic.js
//
// built-in functions that are called during a game's
// lifecycle

// these functions below are designed to make it easy to set up
// simple games quickly

// this is called after the system is loaded but before your game
// starts. you can use it to load sounds and other resources
// you can load your sounds with: window.AudioManager.addSound()
// this is an asynchronous function; if you write "await" before
// asynchronous functions, such as addSound, the game will not
// start until those actions have completed
// after this function completes, gameIntro is called
async function gameSetup() {
    // load sounds here

    // do any other game setup here

}

// generally your game needs some kind of intro or instruction
// you can include it here. once this begins, the system waits
// for the user to press a key. after that, we finally move to
// gamePlay
function gameIntroduction() {
    // describe the game, provide instructions

}

// called after gameSetup and gameIntroduction
function gamePlay() {

}

// key can be: a,b,Start,ArrowUp,ArrowDown,ArrowLeft,ArrowRight
function handleInput(key) {

}