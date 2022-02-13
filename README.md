# plink
Plink is an open source library for creating audio games. Plink simplifies several difficult aspects about making audio games, such as finding sound effects, dealing with audio streaming, supporting diverse input methods. Plink games run in the browser and can be played on desktop or mobile.

Plink can be used to create a variety of audio-only games:

- action games
- puzzle games
- rhythm games
- choose-your-own-adventure games
- music games
- trivia games
- ... and whatever else you can come up with.

## Features
Plink was designed based on years of prototyping and testing simople audio games. The goal of plink is to make it as easy to develop and distribute audio games as it is to develop simple graphical games. Plink includes the following features to support this goal:

- **Batteries included**—Plink is designed to make it easy to quickly prototype games. It includes commonly used functions for loading, queueing, and playing back audio. Plink abstracts away some of the difficulties of working with audio files, such as asynchronously loading audio or queueing audio sequences.
- **Single file editing**—Many games can be made by editing only a single JavaScript file.
- **Automatic sound effects**—Plink can [automatically search for and include sound effects](https://github.com/shaunkane/plink/wiki/Library-Features#loading-sound-effects-from-freesound) based on their text description, so that you can prototype games before you've chosen sound effects.
- **Multiplatform games**—Plink games are simply HTML, CSSm and JavaScripot files that can be run on many devices.
- **Flexible user interface**—Plink games can be controlled by keyboard input, or alternately by touch gestures on devices that support them. Plink uses a virtual controller model to provide equivalent interaction capabilities on each device.
- **Graphics**—Plink games are primarily audio-based, but can also include graphics. By default, Plink's user interface displays text and sound effects on-screen as they are played.

## Documentation
See [the wiki](https://github.com/shaunkane/plink/wiki) for documentation.

## Examples
You can see several examples of games made with plink, including source code, at [accessibility.games](accessibility.games/plink).

## License
Plink is distributed under the [Mozilla Public License version 2.0](https://github.com/shaunkane/plink/blob/main/LICENSE)

## Author
Plink was created by me, [Shaun Kane](https://shaunkane.com).
