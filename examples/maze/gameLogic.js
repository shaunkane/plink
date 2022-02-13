// maze game
// instantiate a maze from a text file
// and allow the user to navigate it with key presses
// there are some number of treasures to find
// at the end, announce the result

// load all your sounds before your game begins
async function gameSetup() {
    await window.AudioManager.addSound('bonk', 'sounds/bonk.wav')
    await window.AudioManager.addSound('coin', 'sounds/coin.wav')
    await window.AudioManager.addSound('steps', 'sounds/steps.wav')
    await window.AudioManager.addSound('win', 'sounds/win.wav')

    window.maze = new Maze(mazeString);
    window.treasuresFound = 0;
}


function gameIntroduction() {
    window.AudioManager.speakWithSoundEffects("Welcome to the maze. Use the arrow keys to navigate. You will hear \
    footsteps when you move successfully {{steps}}. You will hear a thunk when you try to move into a wall. {{bonk}} \
    You will hear a coin when you find a treasure. {{coin}} You must find the exit. Press the A button to continue.");
}

function gamePlay() {
    window.AudioManager.speak("Good luck!");
}

// key can be: a,b,Start,ArrowUp,ArrowDown,ArrowLeft,ArrowRight
function handleInput(key) {
    console.log("handleInput: " + key);

    if (key == "ArrowUp") {
        movePlayer(0, -1);
    } else if (key == "ArrowDown") {
        movePlayer(0, 1);
    } else if (key == "ArrowLeft") {
        movePlayer(-1, 0);
    } else if (key == "ArrowRight") {
        movePlayer(1, 0);
    }
    console.log(window.mazeString.toString())
}

// try to move the player. if we can't move,
// play a bonk sound. if we can, play footsteps.
// if we find a treasure or the exit, deal with those.
// return true if we have moved, false otherwise
function movePlayer(dx, dy) {
    var newPlayerX = window.maze.playerX + dx;
    var newPlayerY = window.maze.playerY + dy;

    // first, is the move in bounds?
    if (newPlayerX >= window.maze.width || newPlayerX < 0 || newPlayerY >= window.maze.height || newPlayerY < 0) {
        window.AudioManager.play('bonk');
        return false;
    }

    // now, is there a wall in the way?
    const charAtNewLocation = window.maze.mazeArray[newPlayerY][newPlayerX];

    if (charAtNewLocation == 'X') {
        window.AudioManager.play('bonk');
        return false;
    }

    // seems like we can move, so put our player in the new location
    // and put a blank in the old position
    window.maze.mazeArray[newPlayerY][newPlayerX] = "0";
    window.maze.mazeArray[window.maze.playerY][window.maze.playerX] = " ";
    window.maze.playerX = newPlayerX;
    window.maze.playerY = newPlayerY;

    window.AudioManager.play('steps');

    // check what's in the space. if it's treasure, indicate it
    if (charAtNewLocation == "$") {
        window.AudioManager.speakWithSoundEffects("{{coin}} You found a treasure.");
        window.treasuresFound += 1;

    } else if (charAtNewLocation == "*") {
        window.AudioManager.speakWithSoundEffects(`{{win}} You have escaped the maze! You found ${window.treasuresFound} of 2 treasures.`);
    }
}

// no need for the loop function in this example

// maze code here

var mazeString = `XX* XXXXXXXXXXXX
XXX XXXXXXXX$XXX
XX  XXXX     XXX
XX XXXXX XXXXXXX
XX   X   XX   XX
XX X X X    XXXX
XX X   XXXX XXXX
XX$XXXXXXXXoXXXX
XXXXXXXXXXXXXXXX`;

// accept a maze as a string, plus width and height
// using the following characters
// (space) -> navigable terrain
// X -> wall
// $ -> treasure
// o -> player start
// * -> goal

class Maze {
    constructor(chars) {
        var lines = chars.split('\n');
        this.height = lines.length;
        this.width = lines[0].length;

        this.playerX = -1;
        this.playerY = -1;

        // https://stackoverflow.com/questions/966225/how-can-i-create-a-two-dimensional-array-in-javascript
        // first number of cols, then rows. reference with array[y][x]
        this.mazeArray = Array(this.height).fill(0).map(x => Array(this.width).fill(0));

        // copy from the maze string. there are certainly more concise ways to do this
        for (var y = 0; y < this.height; y++) {
            for (var x = 0; x < this.width; x++) {
                this.mazeArray[y][x] = lines[y][x];

                // record the player's location
                if (lines[y][x] == 'o') {
                    this.playerX = x;
                    this.playerY = y;
                }
            }
        }
    }

    toString() {
        var string = "";
        for (var y = 0; y < this.mazeArray.length; y++) {
            for (var x = 0; x < this.mazeArray[y].length; x++) {
                string += this.mazeArray[y][x];
            }
            string += '\n';
        }
        return string;
    }
}