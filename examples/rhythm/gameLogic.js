/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

async function gameSetup() {
    // load sounds here
    // for this game we use brief sound names
    // so we can represent loops as strings
    // we also use prerendered voice samples to avoid any
    // latency around the speech synthesizer
    await window.AudioManager.addSound("U", "sounds/up.mp3");
    await window.AudioManager.addSound("u", "sounds/up2.mp3");
    await window.AudioManager.addSound("D", "sounds/down.mp3");
    await window.AudioManager.addSound("d", "sounds/down2.mp3");
    await window.AudioManager.addSound("L", "sounds/left.mp3");
    await window.AudioManager.addSound("l", "sounds/left2.mp3");
    await window.AudioManager.addSound("R", "sounds/right.mp3");
    await window.AudioManager.addSound("r", "sounds/right2.mp3");
    // for the backing track
    await window.AudioManager.addSound("b", "sounds/bassDrum.wav");
    await window.AudioManager.addSound("s", "sounds/snareDrum.wav");
    // when we pick the wrong note
    await window.AudioManager.addSound("miss", "sounds/buzzer.mp3");
}

function gameIntroduction() {
    window.AudioManager.speak("Now it's time to be a DJ. I'll call out directions to the beat. Then, you copy them. Press the A button when you're ready.", {
        voicePreference: 'Fred'
    });
}

// How the rhythm game works
//
// our song is hardcoded for now. it plays at 
// 60bpm. we have a loop of 16, 16th notes from an
// online drum machine (https://drumbit.app/)
// as long as the game is going, we play through that loop
// these notes play every 250ms
const backingTrack = "b.ssb.s.b.ssb...";

// on the beat (so every 4 ticks), we may say a note command (up,down,left,right)
// then, the user needs to press that key in the next loop
var song = "........UUU.....DDD.....UDU.....UDR.............";
// the user presses these notes
var inpt = "............uuu.....ddd.....udu.....udr.........";

// we'll fill this with targets. each target will have a note and a time
var targets = [];

// keep track of what the game is doing: null, playing, gameover
var gameState = null;
// when we are expecting the user to press a direction, we 
// set it here. then we know what to do when the user presses a key
// when we don't have a direction, set this to null
var activeDirection = null;

// we keep track of our place in the song with the following vars
// where beats = quarter note and steps = 16th note
var currentStep = 0; // mod 16
var totalSteps = 0;
var startTime = -1;
var mistakes = 0;

// we call our loop every 100ms or so, more frequently
// than our beat. we then schedule any notes that we
// expect will play soon, and set up expected inputs
const LOOP_FREQUENCY = 100; //ms
const LOOKAHEAD = 1; // ms

// how far can we press a note before or after its
// correct time?
const TIME_BEFORE = 0.1; // seconds
const TIME_AFTER = 0.1;
const STEP_LENGTH = 1 / 4; // sec

// don't schedule the start of the song
// until we've had a chance to set things up
const STARTUP_DELAY = 5;

function setupTargets() {
    targets = [];
    for (var i = 0; i < inpt.length; i++) {
        if (inpt[i] != '.') {
            const startTime = i; // start at i seconds
            const direction = inpt[i];
            targets.push({ startTime: startTime, direction: direction });
        }
    }
}

function handleInput(key) {
    if (gameState == "playing") {
        var absTime = window.AudioManager.getTime();

        // any targets left?
        if (targets.length < 1) {
            window.AudioManager.play("miss");
            mistakes++;
        } else {
            //look at the first target
            // is it within range?)
            const target = targets[0];
            const adjustedTime = target.startTime + startTime + STARTUP_DELAY;
            if (absTime < adjustedTime - TIME_BEFORE) {
                // too early
                window.AudioManager.play("miss");
                mistakes++;
            } else if (absTime >= adjustedTime - TIME_BEFORE) {
                var targetKey;
                if (target.direction == 'u') targetKey = "ArrowUp";
                else if (target.direction == 'd') targetKey = "ArrowDown";
                else if (target.direction == 'l') targetKey = "ArrowLeft";
                else if (target.direction == 'r') targetKey = "ArrowRight";
                else throw Error("invalid instruction");

                if (key != targetKey) {
                    // wrong key
                    window.AudioManager.play("miss");
                    mistakes++;
                    // remove the failed target
                    targets.shift();
                } else if (key == targetKey) {
                    window.AudioManager.play(target.direction);
                    // remove the correct target
                    targets.shift();
                }

            } else {
                throw Error("timing error with target")
            }
        }
    } else if (gameState == "gameover" && key == "a") {
        resetGame();
    }
}

function gameLoop() {
    if (gameState == "playing") {
        var absTime = window.AudioManager.getTime();

        // check for expired tasks
        if (targets.length > 0) {
            const target = targets[0];
            const adjustedTime = target.startTime + startTime + STARTUP_DELAY;
            if (absTime > adjustedTime + TIME_AFTER) {
                targets.shift();
            }
        }

        // our "current" step/beat haven't happened yet
        // when should they happen (on our adjusted clock)?
        var nextStepTime = (totalSteps * 1 / 4) + startTime + STARTUP_DELAY;
        var timeUntilStep = nextStepTime - absTime;
        // if our next step is within our lookahead, schedule it
        // and get ready for the next step
        if (timeUntilStep < LOOKAHEAD) {
            // play the backing beat
            if (backingTrack[currentStep] != ".") {
                window.AudioManager.play(backingTrack[currentStep], { offset: nextStepTime });
            }
            // is this a new beat? if so, act on it
            if (totalSteps % 4 == 0) {
                const instruction = song[totalSteps / 4];
                if (instruction != ".") {
                    window.AudioManager.play(instruction, { offset: nextStepTime });
                }
            }
            // increment our step
            totalSteps++;
            currentStep = totalSteps % 16;
        }

        if (totalSteps >= song.length * 4) {
            // we're done
            gameState = "gameover";
            window.AudioManager.speak(`Game over. You made ${mistakes} mistakes. Press A to restart.`);
        }
    }
}

function resetGame() {
    totalBeats = 0;
    currentStep = 0;
    activeDirection = null;
    gameState = null;
    startTime = window.AudioManager.getTime();
    mistakes = 0;
    setupTargets();
}

function gamePlay() {
    startTime = window.AudioManager.getTime();
    setupTargets();
    gameState = "playing";
    setInterval(gameLoop, LOOP_FREQUENCY);
}