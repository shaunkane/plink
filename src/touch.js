// touch.js
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
}