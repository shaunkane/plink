/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// input.js
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
}