#! /bin/sh
cat ../src/audio.js ../src/input.js ../src/touch.js ../src/ui.js ../src/setup.js ../src/state.js > ../dist/plink.js

# copy to the template directory
cp ../dist/plink.js ../template

# copy over the examples
cp ../dist/plink.js ../examples/boxing
cp ../dist/plink.js ../examples/maze
cp ../dist/plink.js ../examples/rhythm
cp ../dist/plink.js ../examples/freesound