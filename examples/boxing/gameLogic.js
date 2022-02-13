// game.js
//
// game logic and tying everything else together
// to make a game, you can edit this file to customize
// the functions below, or move the logic for your particular
// game into a separate file

// these functions below are designed to make it easy to set up
// simple games quickly

// you can load your sounds here with "await window.AudioManager.addSound()""
// you don't need to put it here exactly, but it's a good idea to
// load all your sounds before your game begins
async function gameSetup() {
    await window.AudioManager.addSound("hitThem", "sounds/punch.wav");
    await window.AudioManager.addSound("hitYou", "sounds/punched.wav");
    await window.AudioManager.addSound("aboutToPunch", "sounds/aboutToPunch.wav");
    await window.AudioManager.addSound("dodge", "sounds/whoosh.wav");
    await window.AudioManager.addSound("block", "sounds/block.wav");
    await window.AudioManager.addSound("bell", "sounds/bell.wav");

    window.canvas = new GraphicsCanvas(document.querySelector('#drawCanvas'));
    await window.canvas.loadGraphics();
}

function gameIntroduction() {

    window.AudioManager.speakWithSoundEffects("Welcome to the boxing game. You can press left or right to dodge a punch. You can press A or B to punch. When you hear your \
    opponent winding up {{aboutToPunch}}, you should dodge in the opposite direction. The game ends when you knock down your opponent. Press the A button to continue.");
}

// game parameters
const MAX_HITS = 5; // whoever gets to max_hits first wins
const delayBeforeFirstPunch = 5; // don't punch for the first 5 seconds
const playerPunchInterval = 1; // limit the player to one punch per second
var opponent;

// variables for this specific game instance
var timesYouHitOpponent = 0;
var timesOpponentHitYou = 0;
var lastTimeYouPunched = -1;
var lastTimeOpponentPunched = -1;
var lastTimeYouDodged = -1;
var currentPunch = null;
var startTime = -1;

// what's happening in the game right now? use this to figure out
// what to do with user input. options null, fighting, gameover
var gameState = null;

// main gameplay loop 
function gamePlay() {
    window.canvas.drawBoxer();
    window.AudioManager.play("bell");
    currentPunch = null; // we'll put a dict here; see below
    gameState = "fighting";
    opponent = new Boxer();
    startTime = window.AudioManager.getTime();
    setInterval(() => {
        // we use AudioManager's built in clock to get accurate
        // timing: window.AudioManager.getTime() -> seconds
        const now = window.AudioManager.getTime();
        // can the opponent punch now?
        // we must be fighting and have not recently thrown a punch
        if (gameState == "fighting" && currentPunch == null && now - lastTimeOpponentPunched > opponent.minTimeBetweenPunches && now - startTime > delayBeforeFirstPunch) {
            // roll a die to see if the opponent throws a new punch
            const shouldPunch = randomChance(opponent.chanceToPunch);
            // if yes, punch. otherwise, wait until the next timer tick
            if (shouldPunch) {
                // clear the screen
                window.canvas.clearAll();
                // left or right?
                const punchLeft = randomChance(0.5);
                if (punchLeft) {
                    window.canvas.drawLeft();
                    window.AudioManager.play("aboutToPunch", { panValue: PAN_LEFT, volume: 0.5 });
                } else {
                    window.canvas.drawRight();
                    window.AudioManager.play("aboutToPunch", { panValue: PAN_RIGHT, volume: 0.5 });
                }
                currentPunch = { isLeft: punchLeft, startTime: now };
                lastTimeOpponentPunched = now;
            }
        } else if (currentPunch != null) {
            // we have an ongoing punch
            // has it been long enough to hit?
            if (now - currentPunch.startTime > opponent.punchSpeed) {
                // hit!
                window.AudioManager.play("hitYou");
                timesOpponentHitYou++;
                currentPunch = null;
                if (timesOpponentHitYou >= MAX_HITS) { // did they win?
                    // game over
                    gameState = "gameover";
                    window.AudioManager.speakWithSoundEffects("{{bell}} You lost. Press A to restart.");
                }
            }
        }
    }, 250);
}

// key can be: a,b,Start,ArrowUp,ArrowDown,ArrowLeft,ArrowRight
function handleInput(key) {
    if (gameState == "fighting") {
        const now = window.AudioManager.getTime();
        if (key == "a" || key == "b") { // punch
            // can I punch now?
            if (now - lastTimeYouPunched > playerPunchInterval) {
                lastTimeYouPunched = now;
                // did you just dodge? if so, your accuracy is raised
                const justDodged = now - lastTimeYouDodged < opponent.loweredBlockChancePeriod;
                const hitChance = justDodged ? opponent.blockChanceAfterDodge : opponent.blockChance;
                const didIHit = randomChance(hitChance);
                window.canvas.clearAll();
                if (didIHit) {
                    // if they were about to punch, cancel the punch
                    currentPunch = null;
                    window.AudioManager.play("hitThem");
                    window.canvas.drawBang();
                    timesYouHitOpponent++;
                    if (timesYouHitOpponent >= MAX_HITS) {
                        // game over
                        gameState = "gameover";
                        window.AudioManager.speakWithSoundEffects("{{bell}} You won! Press A to restart.");
                    }
                } else {
                    window.AudioManager.play("block");
                    window.canvas.drawBlock();
                }
            }

        } else if (currentPunch != null) { // dodge
            if (currentPunch.isLeft && key == "ArrowRight") {
                window.AudioManager.play("dodge", { panValue: PAN_LEFT });
                currentPunch = null;
                lastTimeYouDodged = now;
            } else if (!currentPunch.isLeft && key == "ArrowLeft") {
                window.AudioManager.play("dodge", { panValue: PAN_RIGHT });
                currentPunch = null;
                lastTimeYouDodged = now;
            }
        }
    } else if (gameState == "gameover" && key == "a") {
        resetGame();
    }
}

// reset button. restart the game
function resetGame() {
    timesYouHitOpponent = 0;
    timesOpponentHitYou = 0;
    lastTimeYouPunched = -1;
    lastTimeOpponentPunched = -1;
    lastTimeYouDodged = -1;
    gameState = null;
    gamePlay();
}

// represent our boxing opponent
// the boxer decides to punch based on a die roll
// when the boxer decides to punch, it plays a sound and shows
// a graphic and sets a timer. if the player dodges correctly,
// the punch defuses. otherwise they get hit

class Boxer {
    constructor() {
        this.chanceToPunch = 0.3; // per check, which is every 500ms
        this.punchSpeed = 1.5; // you have this many seconds to dodge
        this.minTimeBetweenPunches = 4; // seconds
        // these are actually hit chances, not block chances...
        this.blockChance = 0.1; // usually the boxer is good at blocking
        this.blockChanceAfterDodge = 0.3; // the boxer is worse at blocking after you dodge them
        this.loweredBlockChancePeriod = 2; // time interval where blocking is impaired in seconds
    }
}

// graphics functions are below

// create a class to manage the drawing canvas. in truth,
// we don't really need a Canvas for this example since
// we are just showing and hiding elements, but this is
// useful for demonstration purposes
class GraphicsCanvas {
    constructor(element) {
        this.element = element;
        this.context = this.element.getContext('2d');
    }

    // load our sprites
    // save their size and positions by adding attributes to
    // the object
    async loadGraphics() {
        this.boxer = await loadImage('images/boxer.png');
        this.boxer.position = { x: 0, y: 0, width: 400, height: 400 };
        this.gloveLeft = await loadImage('images/glove-left.png');
        this.gloveLeft.position = { x: 5, y: 150, width: 87, height: 60 };
        this.gloveRight = await loadImage('images/glove-right.png');
        this.gloveRight.position = { x: 310, y: 150, width: 87, height: 60 };
        this.bang = await loadImage('images/bang.png');
        this.bang.position = { x: 170, y: 200, width: 60, height: 60 };
        this.block = await loadImage('images/block.png');
        this.block.position = { x: 170, y: 200, width: 60, height: 60 };
    }

    // if there's a timeout, clear after that time
    drawElement(element) {
        this.context.drawImage(element, element.position.x, element.position.y);
    }

    clearElement(element) {
        this.context.clearRect(element.position.x, element.position.y, element.position.width, element.position.height);
    }

    // clear all "status" indicators, but leave the boxer silhouette
    clearAll() {
        this.clearLeft();
        this.clearRight();
        this.clearBang();
        this.clearBlock();
    }

    // convenience functions for drawing
    drawBoxer() { this.drawElement(this.boxer); }
    clearBoxer() { this.clearElement(this.boxer); }
    drawLeft() { this.drawElement(this.gloveLeft); }
    clearLeft() { this.clearElement(this.gloveLeft); }
    drawRight() { this.drawElement(this.gloveRight); }
    clearRight() { this.clearElement(this.gloveRight); }
    drawBang() { this.drawElement(this.bang); }
    clearBang() { this.clearElement(this.bang); }
    drawBlock() { this.drawElement(this.block); }
    clearBlock() { this.clearElement(this.block); }

}

// we use this function to asynchronously
// load and await images for our canvas
// inspired by https://stackoverflow.com/questions/52059596/loading-an-image-on-web-browser-using-promise/52060802

async function loadImage(src) {
    return new Promise(resolve => {
        const img = new Image();
        img.addEventListener('load', () => {
            resolve(img);
        });
        img.src = src;
    })
}

// flip a weighted coin. we use this
// for dice roles for our boxer
function randomChance(prob) {
    return Math.random() <= prob;
}