/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// gameState.js
//
// this is a global variable to keep track of the internal "state" of
// our game -> loading, playing, paused, etc.
// this is important for keeping things in order, like loading audio
// files before they play, and handling the right input at the right
// times
//
// we instantiate a global state object and use it in setup.js
// these states are managed by setup.js and the plink engine, so
// you probably shouldn't mess with them. if you want to keep
// track of your own state, you should just create your own state object

const STATE_START = 0;

// we need the user to press a button
// and play a sound. in setup.js we
// request the input and then wait for it
// after RECEIVED_INPUT we should be able to
// play any sounds
const STATE_REQUEST_INPUT = 200;
const STATE_RECEIVED_INPUT = 250;

// game-specific setup: gameSetup() in gameLogic.js
const STATE_GAME_SETUP = 300;
const STATE_GAME_SETUP_COMPLETED = 350;

// read out an intro 
const STATE_GAME_INTRO_STARTED = 400;
const STATE_GAME_INTRO_COMPLETE = 450;

// generic gameplay state
const STATE_GAME_PLAYING = 500;
// currently we don't have built in support
// for 
const STATE_GAME_PAUSED = -1;

class GameState {
    constructor(state = STATE_START) {
        this.state = state;
    }
}