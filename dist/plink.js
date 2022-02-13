/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// audio.js
// this manages all of the audio stuff for Plink.
// including loading sounds, playing sounds, and 
// handling speech

// some presets for pan and volume
const PAN_LEFT = -1;
const PAN_RIGHT = 1;
const PAN_CENTER = 0;
const VOLUME_HIGH = 1;
const VOLUME_MEDIUM = 0.6;
const VOLUME_LOW = 0.3;

// this class does almost everything now
class AudioManager {
    constructor() {
        // context for playing all audio
        this.context = new AudioContext();

        // sound library. we assume here that all
        // sounds will be loaded ahead of time, each
        // has a string identifier. later we play
        // songs based on that string identifier
        // todo: make sure all sounds are loaded
        this.soundLibrary = {}

        // we maintain a list of looping sounds,
        // so that we can stop loops later
        // every time we start a loop, we add a dict
        // {loopHandle, soundName:string, playing:bool}
        this.loops = [];

        // some browsers won't play any audio until a sound
        // is played directly in response to user input
        // (keyboard etc). to deal with this, we look
        // for the first user input and play a quick sound
        this.initialized = false;
    }

    // convenience function here. our audiocontext has a
    // precise timer (recorded as seconds after creating the
    // context). we can use this as a more reliable clock
    getTime() {
        return this.context.currentTime;
    }

    // we store sound files as audio buffers
    // https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer
    async addSound(name, fileName) {
        const fileHandle = await fetch(fileName);
        const arrayBuffer = await fileHandle.arrayBuffer();
        const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
        this.soundLibrary[name] = audioBuffer;
        return audioBuffer;
    }

    // fetch a sound from freesound.org
    // for now we filter for sounds <= 2 seconds
    // as we want discrete game sound effects
    // we can add specific search terms, or just use the name
    // of the file
    async addFreesound(name, freesoundKey, maxLength = 2, searchTerms = null) {
        if (!searchTerms) searchTerms = name;
        const url = `https://freesound.org/apiv2/search/text/?fields=name,duration,previews,license,username,url&filter=duration:%5B0.1%20TO%20${maxLength}%5D&query=${searchTerms}&token=${freesoundKey}`;
        const response = await fetch(url);
        const jsonData = await response.json();
        console.log(jsonData)
        const result = jsonData.results[0];

        // log the sound we used
        console.log(`Downloaded sound: ${result.name} from ${result.username}. URL: ${result.url}. License: ${result.license}`);
        const soundUrl = result.previews["preview-hq-mp3"];
        const buffer = await this.addSound(name, soundUrl);
        return buffer;
    }

    // play a brief tone. we basically only use this to intialize the system,
    // since we need to play some sound in response to user input
    playTone(tone = 220, length = 300) {
        var osc = this.context.createOscillator();
        osc.type = "sine";
        osc.frequency.value = tone;
        osc.connect(this.context.destination);
        setTimeout(() => {
            osc.stop();
        }, length);
        osc.start();
    }

    // play a discrete sound. we assume these sounds are brief, so we don't
    // bother tracking the sound handle for stopping etc.
    // currently we add audio nodes for volume and panning as needed, but
    // don't do anything with them. in the future we could expose these to
    // enable dynamic changing of volume or pan
    play(name, { callback = null, volume = 1, panValue = 0, loop = false, offset = 0 } = {}) {
        if (!(name in this.soundLibrary)) {
            throw Error("Sound " + name + " not found");
        } else {
            const sampleSource = this.context.createBufferSource();
            sampleSource.buffer = this.soundLibrary[name];

            if (loop) {
                sampleSource.loop = loop;
                this.loops.push({ soundName: name, loopHandle: sampleSource, isPlaying: true });
            }

            if (callback) {
                sampleSource.onended = callback;
            }
            // we may have multiple nodes between the sample
            // and the output. keep track here;
            var currentNode = sampleSource;
            var volumeNode = null;
            var pannerNode = null;

            if (volume != 1) {
                volumeNode = new GainNode(this.context, { gain: volume });
                currentNode.connect(volumeNode);
                currentNode = volumeNode;
            }
            if (panValue != 0) {
                pannerNode = new StereoPannerNode(this.context, { pan: panValue });
                currentNode.connect(pannerNode);
                currentNode = pannerNode;
            }

            currentNode.connect(this.context.destination);
            sampleSource.start(offset);

            // propagate a sound effect event
            var event = new CustomEvent('soundEffect', { detail: { name: name, panValue: panValue, volume: volume, loop: loop } });
            window.dispatchEvent(event);

            return sampleSource;
        }
    }

    // stop a loop by its name
    // then remove it from our list
    stopLoop(name) {
        this.loops.forEach(item => {
            if (item.soundName == name && item.isPlaying) {
                item.loopHandle.stop();
                item.isPlaying = false;
            }
        });

        // remove all stopped loops
        this.loops = this.loops.filter(item => item.isPlaying);
    }

    // speech functions

    // speak with optional callback
    // specify a callback, voice preference, and rate
    // for voice preference, the system scans the list of voices
    // and chooses a voice if it exists, otherwise default
    speak(text, { callback = null, voicePreference = null, speechRate = 1.5 } = {}) {
        let utt = new SpeechSynthesisUtterance(text);

        if (callback) {
            utt.onend = callback;
        }
        utt.rate = speechRate;

        if (voicePreference != null) {
            const voice = window.speechSynthesis.getVoices().find(item => item.name == voicePreference);
            if (voice != null) {
                utt.voice = voice;
            }
        }

        window.speechSynthesis.speak(utt);

        // propagate a speech event
        var event = new CustomEvent('speak', { detail: text });
        window.dispatchEvent(event);
    }

    // this is a special feature! we can pass a string, if there are sound effects within, they
    // will play. e.g. "Hello {{thunder}} world". these effects must have previously been added
    // using addSound
    speakWithSoundEffects(formattedText, { voicePreference = null } = {}) {
        var queue = new AudioSequence(this);
        var tokens = formattedText.split(' ');
        var buffer = "";
        for (var i = 0; i < tokens.length; i++) {
            if (tokens[i].match('{{(.*)}}')) {
                // do we have anything in the buffer? if so, add it as a phrase and clear the buffer
                if (buffer.length > 0) {
                    queue.add(buffer, "text", { voicePreference: voicePreference });
                    buffer = "";
                }
                // add sound
                var soundName = tokens[i].match('{{(.*)}}')[1];
                queue.add(soundName, "sound");
            } else {
                // add to the buffer
                buffer += " " + tokens[i];
            }
        }
        // anything left in the buffer?
        if (buffer.length > 0) {
            queue.add(buffer, "text", { voicePreference: voicePreference });
        }
        queue.start();

        // set the queue on the object, so we can cancel it
        this.queue = queue;

        return queue;
    }
}

// we can use this class to manage playback of
// a series of sounds. we instantiate one of these whenever
// we do this
class AudioSequence {
    // spacing is placed between each sound (in ms)
    constructor(audioManager, spacing = 100) {
        this.audioManager = audioManager;
        this.queue = [];
        this.spacing = spacing;
        this.playing = false;
        this.currentItem = null;
    }

    add(itemToAdd, audioType, prefs) {
        this.queue.push({ item: itemToAdd, mediaType: audioType, prefs: prefs });
    }

    // pull the oldest item off the queue and 
    // act on it
    doNext() {
        if (this.hasNext() && this.isPlaying) {
            var firstItem = this.queue.shift();
            console.log(firstItem);
            if (firstItem.mediaType == "text") {
                this.audioManager.speak(firstItem.item, { callback: (e) => this.callback(), voicePreference: firstItem.prefs.voicePreference });
            } else if (firstItem.mediaType == "sound") {
                this.audioManager.play(firstItem.item, { callback: (e) => this.callback() });
            } else {
                throw Error("invalid media type");
            }
        } else {
            // we got canceled or something else happened
            this.shutdown();
        }
    }

    start() {
        this.isPlaying = true;
        this.doNext();
    }

    // is there anything else left to play?
    hasNext() {
        return this.queue.length > 0;
    }

    cancel() {
        // reset queue and clear
        // we're done
        this.isPlaying = false;
        this.currentItem = null;
        this.queue = [];
    }

    // callback. this is called whenever the most recent speech or
    // sound is done playing
    callback() {
        if (!this.hasNext()) {
            this.cancel();
        } else {
            this.sleep(this.spacing).then(() => {
                this.doNext();
            })
        }
    }

    // add a gap
    // see examples https://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
} // input.js
// this file includes all the code for our
// virtual controller. our controller supports
// seven inputs: up, down, left, right, A, B, start
// these are supported as keyboard input or swipe
// input. currently, both are possible on any platform
// that supports them

// todo: make something cool happen when the user
// inputs the konami code

// like the gesture input, this object emits custom
// events of type "controllerInput", the detail has
// the specific key (e.g., "a", "Start")

class InputManager {
    // track gesture inputs on domElement
    // we always track keyboard input at the 
    // document level
    constructor(domElement) {
        this.lastKeyPressed = null;

        document.addEventListener('keyup', (event) => {
            this.handleKeyboardKey(event.key);
        });

        // track gestures with a gesture tracker
        this.gestureCanvas = domElement;
        this.gestureTracker = new GestureTracker(this.gestureCanvas);
        this.gestureCanvas.addEventListener('gesture', (event) => {
            this.handleGestureInput(event.detail);
        });
    }

    propagateEvent(key) {
        var event = new CustomEvent('controllerInput', { detail: key });
        this.lastKeyPressed = event;
        document.dispatchEvent(event);
    }

    // if a valid key is pressed, propagate it as controller input
    // we'll just use the key codes, except Enter -> Start
    handleKeyboardKey(keyName) {
        const validKeys = ["a", "b", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
        if (validKeys.includes(keyName)) {
            this.propagateEvent(keyName);
        } else if (keyName == "Enter") {
            this.propagateEvent("Start");
        }
    }

    // convert gestures into our universal controller button names
    handleGestureInput(gestureName) {
        const gestureToController = { leftSwipe: "ArrowLeft", rightSwipe: "ArrowRight", upSwipe: "ArrowUp", downSwipe: "ArrowDown", oneFingerTap: "a", twoFingerTap: "b", threeFingerTap: "start" };
        this.propagateEvent(gestureToController[gestureName]);
    }
} // touch.js
// features for handling touch input
// we need to support the gestures used by Plink
// directional swipes, one and two and three finger tap

// these will create custom events
// that can be subscribed to elsewhere
// see: https://developer.mozilla.org/en-US/docs/Web/Events/Creating_and_triggering_events

// the event is of type 'gesture'. a field within, detail includes
// the specific gesture

// why do we need to define single finger tap? because we are
// using a (very short, currently 250ms) timer to determine 
// whether two or three fingers are tapped, as they won't 
// actually come down at the same moment

// our gestures are identified using heuristics (time, distance,
// angle, etc). These are listed here - you may want to tweak
// them

// an N-finger tap is identified as N fingers coming down within
// 0.n seconds and lifting within 0.m seconds and not traveling
// more than P pixels

TAP_THRESHOLD_MS = 400;
TAP_MAX_TRAVEL_PIXELS = 25;

// a swipe is defined as one finger moving and lifting within
// Q seconds. it must move at least R% of the distance of the
// container. and the angle needs to be within S degrees of
// straightness (S < 45)

SWIPE_MIN_DISTANCE_PIXELS = 75;
SWIPE_MAX_MILLISECONDS = 500;
SWIPE_MAX_ANGLE = 30 // on either side

// a long tap must be held for T seconds
LONG_PRESS_MILLISECONDS = 1000

class GestureTracker {
    // track gestures on this element only
    // in the default template, this is a fullscreen
    // invisible div
    constructor(domElement) {
        this.element = domElement;
        this.touches = []; // list of touch IDs
        this.lastGesture = null;
        this.timers = [];

        this.element.ontouchstart = e => this.touchDown(e);
        this.element.ontouchmove = e => this.touchMove(e);
        this.element.ontouchcancel = e => this.touchUp(e);
        this.element.ontouchend = e => this.touchUp(e);

        // we use these for our heuristics
        this.fingersInThisGesture = -1;
        this.couldBeTap = false;
        this.couldBeLongPress = false;
        this.couldBeSwipe = false;
    }
    touchDown(event) {
        Array.from(event.changedTouches).forEach(newTouch => {
            console.log("finger down: " + newTouch.identifier)
            if (this.touches.length == 0) {
                this.touches.push({ id: newTouch.identifier, time: new Date().getTime(), startX: newTouch.pageX, startY: newTouch.pageY });
                this.fingersInThisGesture = 1;
                this.couldBeTap = true;
                this.couldBeLongPress = true;
                this.couldBeSwipe = true;

                // set a tap timer -> after this point, it can't be a tap or a multitap
                this.timers.push(setTimeout(() => {
                    this.couldBeTap = false;
                }, TAP_THRESHOLD_MS));

                // can't be a swipe after this time
                this.timers.push(setTimeout(() => {
                    this.couldBeSwipe = false;
                }, SWIPE_MAX_MILLISECONDS));

                // if we are still held down, this is a long press, and cancel everything
                this.timers.push(setTimeout(() => {
                    if (this.couldBeLongPress) {
                        this.propagateEvent("longPress");
                    }
                }, LONG_PRESS_MILLISECONDS));

            } else {
                this.fingersInThisGesture += 1;
                this.touches.push({ id: newTouch.identifier, time: new Date().getTime(), startX: newTouch.pageX, startY: newTouch.pageY });
                this.couldBeLongPress = false;
                this.couldBeSwipe = false;
            }
        });
    }
    touchUp(event) {
        Array.from(event.changedTouches).forEach(liftedTouch => {
            console.log("finger up: " + liftedTouch.identifier)
            var origTouch = this.touches.find(touch => touch.id == liftedTouch.identifier);

            // remove the touch from our list
            this.touches = this.touches.filter(touch => touch.id != liftedTouch.identifier);

            // we only really do anything if we lifted all the fingers
            if (this.touches.length == 0) {
                if (this.fingersInThisGesture == 2 && this.couldBeTap) {
                    this.propagateEvent("twoFingerTap");
                } else if (this.fingersInThisGesture == 3 && this.couldBeTap) {
                    this.propagateEvent("threeFingerTap");
                } else {
                    var dist2 = distance(liftedTouch.pageX, origTouch.startX, liftedTouch.pageY, origTouch.startY);
                    if (this.couldBeSwipe && dist2 > SWIPE_MIN_DISTANCE_PIXELS) {
                        var angle = angleBetween(origTouch.startX, liftedTouch.pageX, origTouch.startY, liftedTouch.pageY);
                        console.log("swipe angle: " + angle);
                        if (numberWithin(angle, 0, SWIPE_MAX_ANGLE)) {
                            this.propagateEvent("rightSwipe");
                        } else if (numberWithin(angle, 180, SWIPE_MAX_ANGLE)) { // left can be 180 or -180
                            this.propagateEvent("leftSwipe");
                        } else if (numberWithin(angle, -180, SWIPE_MAX_ANGLE)) {
                            this.propagateEvent("leftSwipe");
                        } else if (numberWithin(angle, -90, SWIPE_MAX_ANGLE)) {
                            this.propagateEvent("upSwipe");
                        } else if (numberWithin(angle, 90, SWIPE_MAX_ANGLE)) {
                            this.propagateEvent("downSwipe");
                        }
                    } else if (this.couldBeTap) {
                        // it's a tap
                        this.propagateEvent("oneFingerTap");
                    }
                }
                this.cancel();
            }
        });
    }
    touchMove(event) {
        // we can cancel a pending gesture by moving too far
        Array.from(event.changedTouches).forEach(newTouch => {

            var newTouch = event.changedTouches[0];
            console.log("finger move: " + newTouch.identifier);

            if (this.touches.length == 1) {
                var oldTouch = this.touches[0];
                var dist = distance(newTouch.pageX, oldTouch.startX, newTouch.pageY, oldTouch.startY);
                if (dist > TAP_MAX_TRAVEL_PIXELS) {
                    this.couldBeTap = false;
                    this.couldBeLongPress = false;
                }
            }
        });
    }

    propagateEvent(gestureType) {
        var event = new CustomEvent('gesture', { detail: gestureType });
        this.lastGesture = event;
        this.element.dispatchEvent(event);
    }
    cancel() {
        this.timers.forEach(timer => {
            clearTimeout(timer);
        })
        this.timers = [];
        this.couldBeTap = false;
        this.couldBeLongPress = false;
        this.couldBeSwipe = false;

        this.fingersInThisGesture = -1;
    }
}

function distance(x1, x2, y1, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function angleBetween(x1, x2, y1, y2) {
    return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
}

// convenience function for measuring angles
// return true if firstNum is within error of targetNum
function numberWithin(firstNum, targetNum, error) {
    return firstNum >= targetNum - error && firstNum <= targetNum + error;
}

// removes an element from the array
// this preserves the original array, so you must
// explicitly overwrite the original if you want that
function removeElement(element, array) {
    return array.filter(el => el != element);
} // ui.js
// manages the visual UI. currently this visualizes sounds
// read out, but later it may support custom visual UIs

// basically, each time there is a sound, we will write it
// in the plinkUI div with the type and content
// we keep the last ~10 of these

class UserInterface {
    // specify queries for the output areas
    constructor(element, maxElements = 18) {
        this.element = element;
        this.maxElements = maxElements;
    }

    // pass a div and add it here
    showText(htmlString) {
        while (this.element.children.length >= this.maxElements) {
            this.element.removeChild(this.element.firstChild);
        }
        this.element.appendChild(htmlString);
    }

    clearAll() {
        this.element.innerHTML = '';
    }

    createDiv(className, text) {
        const div = document.createElement("div");
        div.className = className;
        div.innerText = text;
        return div;
    }

    showMainAudio(text) {
        this.showText(this.createDiv("mainAudio", "narrator: " + text));
    }

    showSoundEffect(text, panValue = 0, loop = false) {
        var prefix = "sound: ";
        // add pan if it's there?
        if (panValue < 0) {
            prefix = prefix + " (left)";
        } else if (panValue > 0) {
            prefix = prefix + " (right)";
        }
        this.showText(this.createDiv("soundEffect", prefix + text));
    }

    showBackgroundSound(text) {
        this.showText(this.createDiv("backgroundSound", "background: " + text));
    }

    showUserInput(text) {
        this.showText(this.createDiv("userInput", "user input: " + text));
    }

    initializeUI() {
        this.clearAll();
    }
} // setup.js
// this code instantiates objects and connects things
// at page startup

// don't change the code below unless you want
// to change the overall behavior of the game engine

// this code instantiates the global objects and connects
// things to other things
document.addEventListener('DOMContentLoaded', function(event) {

    // instantiate objects

    // create game state. see gameState.js for details
    window.GameState = new GameState(STATE_START);
    // set up the UI
    window.UserInterface = new UserInterface(document.querySelector("#plinkUI"));
    window.UserInterface.initializeUI();
    // gesture and keyboard input
    window.InputManager = new InputManager(document.querySelector('#gestureCanvas'));
    // this manages all the audio
    window.AudioManager = new AudioManager();

    // connect objects to each other

    // show speech and audio in the UI
    window.addEventListener('speak', (event) => {
        window.UserInterface.showMainAudio(event.detail);
    });
    window.addEventListener('soundEffect', (event) => {
        window.UserInterface.showSoundEffect(event.detail.name, event.detail.panValue, event.detail.loop);
    });
    // show user input in the UI
    // this is called for both keyboard input and 
    // gestures (which are generated by the InputManager)
    document.addEventListener('controllerInput', (event) => {
        const key = event.detail;
        window.UserInterface.showUserInput(key);
    });

    // pass input to the user's game
    // note that we only do this if the game is in the
    // Playing state, and if the key matches one of our
    // predefined controller keys
    document.addEventListener('controllerInput', (event) => {
        if (window.GameState.state == STATE_GAME_PLAYING) {
            const key = event.detail;
            handleInput(key);
        }
    });

    // here we step through the other state functions
    // first we request input to unlock the audio
    window.AudioManager.speak("Press a key or tap the screen to begin.");
    window.GameState.state = STATE_REQUEST_INPUT;

    // separate keyboard handler down here to keep these setup steps organized
    document.addEventListener('controllerInput', (event) => {
        if (window.GameState.state == STATE_REQUEST_INPUT) {
            // stop speaking
            window.speechSynthesis.cancel();

            // play a beep (100hz, .5secs) to free the audio
            window.AudioManager.playTone(100, 500);
            setTimeout(() => {
                window.GameState.state = STATE_RECEIVED_INPUT;

                // once we get input, we do game setup
                // this is an async function that blocks until the
                // items are loaded
                window.GameState.state = STATE_GAME_SETUP;

                // CALL TO USER CODE
                // also this is an async function
                gameSetup().then(() => {
                    window.GameState.state = STATE_GAME_SETUP_COMPLETED;

                    // now we start the game intro. after this, nothing happens
                    //  until a key is pressed, so we handle it below
                    window.GameState.state = STATE_GAME_INTRO_STARTED;

                    // CALL TO USER CODE
                    gameIntroduction();

                });


            }, 1000);
        } else if (window.GameState.state == STATE_GAME_INTRO_STARTED) {
            if (window.AudioManager.queue != null) {
                window.AudioManager.queue.cancel();
            }

            window.GameState.state = STATE_GAME_INTRO_COMPLETE;

            // stop speaking
            window.speechSynthesis.cancel();
            window.GameState.state = STATE_GAME_PLAYING;

            // CALL TO USER CODE
            gamePlay();
        }
    });
}); // gameState.js
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