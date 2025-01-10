const world = makeWorld();

// note that makeGridToMap is oneToNine = true by default
// e.g. every 1/0 becomes a group of 9 tiles or empty spaces
// const zoneMap = `Tile Map
// 1110000000000111
// 1111111111111111
// 1110000000000111`
const zoneMap = `Tile Map
111
111
111
010
010
010
010
010
010
010
010
010
010
010
010
111
111
111`

// these are in actual tile coordinates AFTER oneToNine
const fountainStartIjs = [[4, 4], [4, 43]];

// const zoneMapBNRO1 = `Tile Map
//   000111001010101010100000
//   000111111111111111110000
//   000111010101010101010000
//   000000000000000000010000
//   111001110111111111111110
//   001000100100000000010010
//   001000110111101110010111
//   001000100100000010010010
//   001000110100111010010111
//   001000100100111010010010
//   001000110100111010010111
//   001111100100010010010010
//   000000110100010010010111
//   000000100100010010010010
//   000000101110010010111000
//   000000111110011111111000
//   000000001110000000111000
//   000000000100101010010000
//   000000001111111111010000
//   000000000010101010010000
//   000000000000000000111000
//   000000000000000000111000
//   000000000000000000111000`;

// const pickupSound = new Audio('./sounds/pickup.mp3');

// Setup

makeGridFromMap();
var startTileP = world.tiles[0];
var startTileR = world.tiles[1];
var proto = makeNavi("proto", {
  "stand": { nFrames: 1, size: [28, 37] },
  "walk": {
    nFrames: 6,
    sizesDirArr: [
      [28, 37], [36, 37], [38, 37], [40, 37], [30, 37], [40, 37], [38, 37], [36, 37]
    ]
  }
}, 15, startTileP, false);
proto.decide.pat = ["F2", "L1", "F3", "L1", "F4", "L1", "F5", "L1"];
setFacingDir(proto, 3);

world.cameraNavi = proto;

// var rock = makeNavi("rock", {
//   "stand": { nFrames: 1, size: [19, 32] },
//   "walk": {
//     nFrames: 6,
//     sizesDirArr: [
//       [19, 32], [22, 32], [24, 32], [26, 32], [21, 32], [26, 32], [24, 32], [22, 32]
//     ]
//   }
// }, 15, startTileR, true);
// rock.decide.pat = ["F2", "R1", "F3", "R1", "F4", "R1", "F5", "R1"];
// setFacingDir(rock, 7);

fountainStartIjs.forEach((ij, idx) => {
  makeFountain(getTileAtIj(ij[0], ij[1]), idx);
});

makeTower(getTileAtIj(4, 10), false);
makeTower(getTileAtIj(4, 45), true);

console.log(world.tileAt);
makeGoal(getTileAtIj(4, 0), false);
makeGoal(getTileAtIj(4, 53), true);

// deployMinion(world.fountains[0]);

// END Setup

// Create Interval (i.e. Animation Timer)

var tickIntervalId = window.setInterval(tickLoop, 1000 / 60);

// END Create Interval