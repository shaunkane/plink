/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// Lazy cat game

// This is an example of a simple game that uses auto-selected 
// sound files. It is incredibly simple. Every 30 seconds,
// it plays an animal sound. if it's a cat, the user presses left
// if it's a dog, right. after 10, give the score

// freesound key. use this if you want to automatically select
// sounds for your gam. add your own key here.
// for more info: https://freesound.org/help/developers/
const FREESOUND_KEY = "enter-your-own-key-here";

// you can load your sounds here with "await window.AudioManager.addSound()""
// you don't need to put it here exactly, but it's a good idea to
// load all your sounds before your game begins
async function gameSetup() {
    // by default this picks the top search result from freesound, which is
    // an angry cat sound. adding search terms allows you to pick different
    // sounds, but this is not necessary
    await window.AudioManager.addFreesound("cat", FREESOUND_KEY, "kitten meow");
    await window.AudioManager.addFreesound("dog", FREESOUND_KEY);
    await window.AudioManager.addFreesound("buzzer", FREESOUND_KEY);
    await window.AudioManager.addFreesound("success", FREESOUND_KEY);

    resetGame();
}

// called after setup and before game start
function gameIntroduction() {
    window.AudioManager.speakWithSoundEffects("Pet sorter. In this game you will sort \
    cats from dogs based on their sound. When you hear a cat sound, press left. When \
    you hear a dog sound, press right. Press the A button to begin");
}

// called after setup and intro. time to play!
function gamePlay() {
    // our game is already set up, so just fetch
    // the next round
    nextRound();
}

// key can be: a,b,Start,ArrowUp,ArrowDown,ArrowLeft,ArrowRight
// this should only fire while the game is playing, so we just
// need to check what the last sound was and whether we are done
function handleInput(key) {
    if (round < NUM_ROUNDS) {
        if (key == "ArrowLeft" || key == "ArrowRight") {
            // were we correct?
            const correct = (key == "ArrowLeft" && animalArray[round] == "cat") || (key == "ArrowRight" && animalArray[round] == "dog");
            if (correct) {
                this.score++;
                window.AudioManager.play("success");
            } else {
                window.AudioManager.play("buzzer");
            }
            // start the next round in 3 seconds
            round++;
            setTimeout(() => { nextRound() }, 3000);
        }
    } else if (round >= NUM_ROUNDS && key == "a") {
        // time to restart
        resetGame();
        nextRound();
    }

}

// game settings
const NUM_ROUNDS = 5;
const animalOptions = ["cat", "dog"];

// variables for our specific run of this game
// reset these to restart the game
var round;
var score;
var animalArray;

function resetGame() {
    round = 0;
    score = 0;
    // load up 10 animal sounds
    animalArray = [];
    for (var i = 0; i < NUM_ROUNDS; i++) {
        animalArray.push(randomFromArray(animalOptions));
    }
}

function nextRound() {
    if (round >= NUM_ROUNDS) {
        // we're done!
        window.AudioManager.speak(`Game over! You got ${score} out of ${NUM_ROUNDS} correct. Press the A button to restart.`)
    } else {
        window.AudioManager.play(animalArray[round]);
    }
}

// used to pick a random cat or dog
function randomFromArray(array) {
    return array[Math.floor(Math.random() * array.length)];
}