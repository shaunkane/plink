/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// ui.js
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
}