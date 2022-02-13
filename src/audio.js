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
}