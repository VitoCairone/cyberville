const root2 = Math.sqrt(2);
const twoPi = Math.PI * 2;
const tilesPerMile = 1609.34; // tilesPerMeter === 1.0
const ticksPerHour = 60 * 60 * 60;
const refNaviMassKg = 75;
const canvSize = [240, 160];
function mphToTpt(mph) { return mph * tilesPerMile / ticksPerHour; }
function tptToMph(tpt) { return tpt * ticksPerHour / tilesPerMile; }
const refWalkSpeed = mphToTpt(3);
const refRunSpeed = mphToTpt(8);
function metersToPx(x) { return x * 28 / root2; }
function pxToMeters(x) { return x * root2 / 28; }
function isRat(x) { return x >= 0 && x < 1 };
function prodSqrs(a, b) { return a * a + b * b; }
// const viewDiagM = pxToMeters(Math.sqrt(prodSqrs(...canvSize)));

// TODOS
// * replace .color with bools .isBlue (tile) and .isTeamB (navi) --DONE
// * move navi divs onto sprite layer
// * replace binary array for map initialization with string

// NEXT TASKS
// 1: remove unused methods and lint -- DONE
// 2: navi decision outputs as instruction -- DONE
// 3: navi decision inputs
// 4: navi decision rulesets
// 5: purple crystals yield single-use powers
// 6: seperate serverlike and client logic

const zoneMap = [ // note these values get read right-to-left
  0b111111111111111111111111111,
  0b111111111111111111111111111,
  0b111111111111111111111111111,
  0b111000000000111000000000111,
  0b111000000000111000000000111,
  
  0b111000000000111000000000111,
  0b111000000000111000000000111,
  0b111000000000111000000000111,
  0b111000000000111000000000111,
  0b111000000000111100000000111,

  0b111000000000111110000000111,
  0b111000000000111111000000111,
  0b111111111111111111111111111,
  0b111111111111111111111111111,
  0b111111111111111111111111111,

  0b111000000111111000000000111,
  0b111000000011111000000000111,
  0b111000000001111000000000111,
  0b111000000000111000000000111,
  0b111000000000111000000000111,

  0b111000000000111000000000111,
  0b111000000000111000000000111,
  0b111000000000111000000000111,
  0b111000000000111000000000111,
  0b111111111111111111111111111,

  0b111111111111111111111111111,
  0b111111111111111111111111111
];
const ni = Math.max(...zoneMap.map(x => Math.floor(Math.log2(x)))) + 1;
const nj = zoneMap.length;
var pickupSound = new Audio('./sounds/pickup.mp3');
var isFullStop = false;
var anchorTop = 0;
var anchorLeft = (nj - 1) * 14;
const worldLayer = document.getElementById('world-layer');
const spriteLayer = document.getElementById('sprite-layer');
const tileLayer = document.getElementById('tile-layer');
const dirNames = ['NN', 'NE', 'EE', 'SE', 'SS', 'SW', 'WW', 'NW'];
const shifts = [
  [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]
]
const dirToIjVector = shifts.map(shift => {
  return (shift[0] && shift[1]) ? [shift[0] / root2, shift[1] / root2] :
    shift;
});

var world = {
  tileAt: {},
  tiles: [],
  navis: [],
  crystals: [],
  shots: [],
  nextCrystalId: 0,
  nextShotId: 0,
  tick: 0,
  resonanceFrame: 0,
  northTile: null,
  westTile: null,
  tileMins: [Infinity, Infinity],
  tileMaxs: [-Infinity, -Infinity]
}

function naviIdFor(x) {
  // conceptually this method should return an id set
  // by the navi itself, e.g. in encounter order,
  // pragmatically that can be delayed until it matters
  return x.id || x.name || x.div.id || null;
}

// untested & unused
// function isThingCtrInView(thing, camCtrIj) {
//   if (!thing || !thing.div) fullStop("invalid thing to isThingCtrInView");
  
//   var viewLoI = camCtrIj[0] - viewDiagM / 2;
//   var viewHiI = camCtrIj[0] + viewDiagM / 2;
//   var viewLoJ = camCtrIj[1] - viewDiagM / 2;
//   var viewHiJ = camCtrIj[1] + viewDiagM / 2;

//   var viewLoIjSum = viewLoI + viewLoJ;
//   var viewHiIjSum = viewHiI + viewHiJ;
//   var viewLoIjDiff = viewLoI - viewLoJ;
//   var viewHiIjDiff = viewHiI - viewHiJ;

//   var i, j = getCenter(thing);
//   var ijSum = i + j;
//   var ijDiff = i - j;
//   return viewLoIjSum <= ijSum && ijSum <= viewHiIjSum
//     && viewLoIjDiff <= ijDiff && ijDiff <= viewHiIjDiff;
// }

// in-dev method -- not yet called
// function naviLook(navi) {
//   // TODO: make this work in all directions, prototyped for NE-facing
//   // for now just see 6 forward (including own row) and 3 wide, i.e. no spread
//   // add spread in the future
//   for (var j = 0; j >= -5; j--) {
//     for (var i = -1; i <= 1; i++) {
//       var tile = getTileAtShift(navi.onTile, i, j)
//       see.tiles.push({
//         id: naviIdFor(),
//         fwd: -j,
//         lat: i,
//         isBlue: tile.isBlue,
//         contents: tile.contents.map(thing => {
//           return {
//             type: thing.type,
//             id: naviIdFor(thing)
//           };
//         });
//       });
//     }
//   }
// }

// function naviListen(navi) {
//   // as with collision detection we'll just run O(n^2) compares
//   // since n is currently small
//   var heard = {};
//   world.navis.forEach(other => {
//     if (other === navi || other.speed === 0) return;
//     // todo: when tracking navi power spend on movement, pay sound tax
//     // for now hear any navi moving within sight distance forward
//     // and in all directions
//     var aCtr, bCtr = [getCenter(navi), getCenter(thing)];
//     var x, y = [aCtr[0] - bCtr[0], aCtr[1] - bCtr[1]];

//     var audibleDist = 5;
//     // sound energy should scale with power. Just use power when implemented.
//     audibleDist *= Math.pow(other.speed / refWalkSpeed, 3) * other.mass / naviRefMass;

//     var distL2 = x * x + y * y;
//     if (distL2 <= audibleDist * audibleDist) heard.push({
//       type: other.type,
//       id: naviIdFor(other)
//     });
//   });
// }

function applyTickToNavi(navi) {
  // TODO: consider refactoring these HeldTks to LastTp to reduce updates on every tick
  navi.pose.frameHeldTks += 1;
  navi.pose.heldTks += 1;
  navi.pose.heldWithFacingTks += 1;
  var nFrames = navi.pose.nFrames;
  var didChange = false;
  var holdFor = getWalkHoldFrameFor(navi);
  if (nFrames > 1) {
    if (navi.pose.frameHeldTks >
      holdFor) { // TODO: determine from timings and/or speed
      navi.pose.frame = (navi.pose.frame + 1) % nFrames;
      navi.pose.frameHeldTks = 1;
      didChange = true;
    }
  }
  if (navi.speed !== 0) {
    if (navi.speed < 0) fullStop(`navi speed = ${navi.speed}`);
    var didMove = moveNavi(navi, ...getVel(navi));
    if (didMove) {
      didChange = true;
    } else {
      setFacingDir(navi, (navi.facingDir + 4) % 8);
    }
  }
  if (didChange) updateNaviImage(navi);
}

function doCirclesOverlap(aCtr, bCtr, aRad, bRad) {
  var [dx, dy] = [aCtr[0] - bCtr[0], aCtr[1] - bCtr[1]];
  var radSum = aRad + bRad;
  return prodSqrs(dx, dy) < radSum * radSum;
}

function doThingsOverlap(a, b) {  
  return doCirclesOverlap(getCenter(a), getCenter(b), a.radius, b.radius);
}

function fullStop(msg) {
  console.log(msg);
  isFullStop = true;
  throw "thread halted";
}

function getTileAtIj(i, j) {
  if (!world.tileAt.hasOwnProperty(i)) return null;
  var column = world.tileAt[i];
  return column.hasOwnProperty(j) ? column[j] : null;
}

function getTileAtShift(tile, shift) {
  return getTileAtIj(tile.i + shift[0], tile.j + shift[1]);
}

function getVel(a, scaleBy = 1, plusVec = [0, 0]) {
  var ijVector = dirToIjVector[a.facingDir];
  return [a.speed * ijVector[0] * scaleBy + plusVec[0], a.speed * ijVector[1] *
    scaleBy + plusVec[1]
  ];
}

function getWalkHoldFrameFor(navi) {
  // TODO: check pixel-based walk and run speeds in BNRO
  const refSpeed = mphToTpt(8);
  return Math.max(Math.round(2.5 * refSpeed / navi.speed), 1);
}

function getSurroundTiles(tile, doShowAll = false) {
  // returns an 8-element array usually containing nulls
  var allShifts = shifts.map(shift => getTileAtShift(tile, shift));
  return doShowAll ? allShifts : allShifts.filter(x => x);
}

function getThingsNaviOverlaps(navi) {
  // things in the same tile
  if (navi.onTile.contents.length < 1) fullStop(
    "navi's tile has empty contents");
  var things = navi.onTile.contents.concat(
    getSurroundTiles(navi.onTile).flatMap(tile => tile.contents)
  );
  return things.filter(x => x !== navi && doThingsOverlap(navi, x));
}

function getCenter(thing) {
  return [thing.onTile.i + thing.across, thing.onTile.j + thing.down];
}

function handleCollisions() {
  // TODO: this does nMovers^2 / 2 comparisons
  // which is fine for now because there are very few movers 
  // when there are more movers use tiles instead of O(n^2) compare

  var collisions = [];
  // navi vs navy
  world.navis.forEach((navi, idx) => {
    world.navis.slice(idx + 1).forEach(other => {
      var collideTk = whenWillThingsCollideTk(navi, other);
      if (collideTk <= 0) fullStop(`navi-navi collideTk=${collideTk}`);
      if (collideTk <= 1) collisions.push([navi, other, collideTk]);
    });
  });

  // TODO: sort collisions by time and don't move a navi twice
  collisions.forEach(coll => {
    if (coll[2] === 0) return; // TODO: re-evaluate how this should be handled
    // and note that there is already a direct overlap check every tick

    [coll[0], coll[1]].forEach(navi => {
      if (navi.speed > 0) moveNavi(navi, ...getVel(navi, coll[2]));
    });

    // temporary hack resolution: instant bounce-off from the impact
    // moving backwards along the incoming line
    [coll[0], coll[1]].forEach(navi => {
      if (navi.speed > 0) {
        navi.facingDir = (navi.facingDir + 4) % 8;
        moveNavi(navi, ...getVel(navi, 1 - coll[2]));
      };
    });
  });
}

function ijToCanvasXy(ij, camCtrIj) {
  var canvCtrXy = canvSize.map(x => x / 2);
  var diffIj = [ij[0] - camCtrIj[0], ij[1] - camCtrIj[0]];
  var i, j = diffIj;
  return [canvCtrXy[0] + 14 * (i - j), canvCtrXy[1] + 7 * (i + j)];
}

function isTileNeutralPat(tile) {
  // var nSur = getSurroundTiles(tile).length;
  var nSur = 0;
  return (shifts.every(shift => {
    var sTile = getTileAtShift(tile, shift);
    if (sTile) nSur++;
    return !sTile || sTile.isBlue === (shift[0] && shift[1] ? tile.isBlue : !tile.isBlue);
  }) && nSur > 1);
}

function makeTile(i, j, isAir = false) {
  var isBlue = (i & 1) !== (j & 1);
  var tileDiv = document.createElement('div');
  tileDiv.id = `tile-${i}-${j}`;
  tileDiv.className = `path-tile ${isBlue ? 'blue' : 'red'}`;
  tileDiv.style.left = anchorLeft + 14 * (i - j);
  tileDiv.style.top = anchorTop + 7 * (i + j);
  tileDiv.style.zIndex = i + j;
  tileLayer.appendChild(tileDiv);
  var tile = {
    type: "tyle",
    i: i,
    j: j,
    div: tileDiv,
    contents: [],
    isBlue: isBlue,
    isAir: isAir
  };
  world.tileAt[i] ||= [];
  world.tileAt[i][j] = tile;

  if (i < world.tileMins[0]) world.tileMins[0] = i;
  if (i > world.tileMaxs[0]) world.tileMaxs[0] = i;
  if (j < world.tileMins[1]) world.tileMins[0] = j;
  if (j > world.tileMaxs[1]) world.tileMaxs[0] = j;
  if (!world.northTile || (i + j) < (world.northTile.i + world.northTile.j))
    world.northTile = tile;
  if (!world.westTile || (i - j) < (world.westTile.i - world.westTile.j))
    world.westTile = tile;
  
  world.tiles.push(tile);
}
for (var j = 0; j < nj; j++) {
  row = zoneMap[j];
  for (var i = 0; i < ni; i++)
    if (row & 1 << i) makeTile(i, j);
}
var skipCounter = 0;
world.tiles.filter(tile => tile.i % 3 === 1 && tile.j % 3 === 1)
  .forEach(tile => makeCrystalOnTile(tile));

function makeNavi(name, dataFor, shadowLen, startTile, isTeamB) {
  if (!startTile) fullStop("invalid startTile to makeNavi");
  var naviDiv = document.createElement('div');
  naviDiv.id = name;
  naviDiv.className = `navi ${name}`;
  spriteLayer.appendChild(naviDiv);
  // TODO: correct positioning since navi div no longer child of tile div in DOM
  var navi = {
    name: name,
    type: "navi",
    div: naviDiv,
    pose: {
      name: "stand",
      frame: 0,
      frameHeldTks: 1,
      heldTks: 1,
      heldWithFacingTks: 1,
      size: [0, 0], // set by setPose / setFacingDir
      nFrames: 1, // copy from dataFor when poses changes
      dataFor: dataFor
    },
    radius: shadowToRadius(shadowLen),
    speed: 0,
    across: 0.5,
    down: 0.5,
    facingDir: 4,
    onTile: startTile,
    isTeamB: isTeamB,
    decide: {
      code: "S",
      val: 8,
      pat: [],
      idx: 0,
      until: -1
    }
  };
  startTile.contents.push(navi);
  setPose(navi, 'walk');
  world.navis.push(navi);
  return navi;
}
var startTileP = getTileAtIj(1, 4);
var startTileR = getTileAtIj(4, 1);
var proto = makeNavi("proto", {
  "stand": { nFrames: 1, size: [28, 37] },
  "walk": {
    nFrames: 6,
    sizesDirArr: [
      [28, 37], [36, 37], [38, 37], [40, 37], [30, 37], [40, 37], [38, 37], [36, 37]
    ]
  }
}, 15, startTileP, false);
proto.decide.pat = ["F3", "R2", "F1", "L2", "F3", "L2", "F2", "R2", "F3", "R2", "F1", "L2"];
setFacingDir(proto, 5);

var rock = makeNavi("rock", {
  "stand": { nFrames: 1, size: [19, 32] },
  "walk": {
    nFrames: 6,
    sizesDirArr: [
      [19, 32], [22, 32], [24, 32], [26, 32], [21, 32], [26, 32], [24, 32], [22, 32]
    ]
  }
}, 15, startTileR, true);
rock.decide.pat = ["F21", "R2", "F24", "R2", "F12", "R2", "F12", "L2", "F12", "L2"];
setFacingDir(rock, 3);

function makeCrystalOnTile(tile) {
  var crysDiv = document.createElement('div');
  var id = world.nextCrystalId;
  world.nextCrystalId++;
  crysDiv.id = `crystal_${id}`;
  var isSmall = false;
  crysDiv.className = isSmall ? "crystal small" : "crystal";
  // TODO: correct positioning since crystal is no longer child of tile in DOM
  spriteLayer.appendChild(crysDiv);
  var crystal = {
    id: id,
    type: "crystal",
    div: crysDiv,
    onTile: tile,
    across: 0.5,
    down: 0.5,
    radius: shadowToRadius(18),
  };
  world.crystals.push(crystal);
  tile.contents.push(crystal);
  return crystal;
}

function moveNaviToTile(navi, newTile) {
  navi.onTile.contents = without(navi.onTile.contents, navi);
  navi.onTile = newTile;
  navi.onTile.contents.push(navi);
  return true;
}

function moveNavi(navi, across, down) {
  // this method calls moveNaviToTile
  if (navi.speed <= 0) fullStop(`moveNavi speed = ${navi.speed}`);
  if (navi.speed > 1) fullStop("navi speed > 1 tile/tick")
  if (!isRat(navi.across) || !isRat(navi.down))
    fullStop(`across, down not valid ratios: ${navi.across}, ${navi.down}`);
  var radius = Math.min(navi.radius, 0.5);
  var [newAcross, newDown] = [navi.across + across, navi.down + down];
  var signs = [signOrZero(across), signOrZero(down)];
  if (signs[0] !== shifts[navi.facingDir][0] || signs[1] !== shifts[navi
      .facingDir][1]) {
    console.log(`across to moveNavi = ${across}`);
    console.log(`down to moveNavi = ${down}`)
    console.log(signs);
    console.log(shifts[navi.facingDir]);
    console.log(navi.facingDir);
    console.log(dirNames[navi.facingDir]);
    fullStop("movement is not forwards");
  }
  var newFront = [newAcross + radius * signs[0], newDown + radius * signs[1]];
  if (newAcross <= -1 || newAcross >= 2) fullStop(
    "movement across-axis >= 1 tile/tick");
  if (newDown <= -1 || newDown >= 2) fullStop(
    "movement down-axis >= 1 tile/tick");
  var isFrontSameIj = [isRat(newFront[0]), isRat(newFront[1])];
  var shift = [isFrontSameIj[0] ? 0 : signs[0], isFrontSameIj[1] ? 0 : signs[
    1]];
  var destTile = getTileAtShift(navi.onTile, shift);
  if (!destTile) return false;
  // permit corner crossing only if at least one edge adjacent tile exists
  if (shift[0] && shift[1]) {
    if (!getTileAtShift(navi.onTile, [shift[0], 0]) && !getTileAtShift(navi
        .onTile, [0, shift[1]]))
      return false;
  }

  // movement is permitted because the front of the navi moves onto a tile;
  // redo shift for the navi's center to move them to the correct tile
  var isCenterSameIj = [isRat(newAcross), isRat(newDown)];
  shift = [isCenterSameIj[0] ? 0 : signs[0], isCenterSameIj[1] ? 0 : signs[1]];
  destTile = getTileAtShift(navi.onTile, shift);
  if (!destTile) throw ("navi center movecheck got invalid tile");

  moveNaviToTile(navi, destTile);

  var overlaps = getThingsNaviOverlaps(navi);
  // for now the only other things are crystals, so handle as such
  overlaps.forEach(thing => {
    if (thing.type === "crystal") return pickupCrystal(navi, thing);
    if (thing.type === "navi") {
      console.log(`tk= ${world.tick} navis overlap: ${navi.name} and ${thing.name}`);
      return;
    }
    fullStop("navi overlaps thing of invalid type")
  });
  [navi.across, navi.down] = [newAcross, newDown].map(x => {
    return x < 0 ? x + 1 : (x < 1 ? x : x - 1);
  });

  updateThingSpritePos(navi);

  return true;
}

function updateThingSpritePos(thing) {
  if (!world.northTile) fullStop("updateThingSpritePos called before grid setup");
  if (!thing || !thing.div) fullStop("invalid thing to updateThingSpritePos");

  if (!(thing.type === "navi")) fullStop("updateThingSpritePos currently only navis");
  var halfWidth = thing.pose.size[0] / 2; // TODO: read this from div style
  var ctr = getCenter(thing);

  // works when northTile = 0, 0 and westTileI = 0
  // TODO: check for other cases!!
  var offX = 14 * (world.westTile.j - world.westTile.i + 1);

  var offY = 160; // offY for the bottom edge, since we align sprites using bottom

  thing.div.style.left = `${Math.round(offX + 14 * (ctr[0] - ctr[1])) - halfWidth}px`;
  thing.div.style.bottom =`${Math.round(offY - (7 * (ctr[0] + ctr[1])))}px`;
  thing.div.style.zIndex = Math.round(50 * (ctr[0] + ctr[1]));
}

function naviWalk(navi) {
  setPose(navi, "walk");
  navi.speed = mphToTpt(8);
}

function naviStand(navi) {
  setPose(navi, "stand");
  navi.speed = 0;
}

function pickupCrystal(navi, crystal) {
  pickupSound.load();
  pickupSound.play().catch(x => { return null; });
  var tile = crystal.onTile;
  removeThing(crystal);
  setTileColor(tile, navi.isTeamB);
  getSurroundTiles(tile).forEach(sTile => setTileColor(sTile, navi.isTeamB));
}

function removeThing(thing) {
  thing.div.remove();
  var tile = thing.onTile;
  tile.contents = without(tile.contents, thing);
  // TODO: collect a list of empty air tiles and remove those
  // which are not needed at the end, to avoid removing tiles still in use
  if (tile.isAir && tile.contents.length === 0) removeTile(tile);
  switch (thing.type) {
    case 'navi':
      world.navis = without(world.navis, thing);
      break;
    case 'shot':
      world.shots = without(world.shots, thing);
      break;
    case 'crystal':
      world.crystals = without(world.crystals, thing);
  }
}

function setPose(navi, poseName) {
  if (navi.pose.name === poseName) return "NOOP";
  if (!navi.pose.dataFor.hasOwnProperty(poseName)) fullStop("invalid poseName");
  navi.pose.name = poseName;
  navi.pose.frameHeldTks = 1;
  navi.pose.heldTks = 1;
  navi.pose.heldWithFacingTks = 1;
  var dataForPose = navi.pose.dataFor[poseName];
  navi.pose.nFrames = dataForPose.nFrames;
  if (navi.pose.frame >= navi.pose.nFrames) navi.pose.frame = 0;
  if (dataForPose.hasOwnProperty("sizesDirArr")) {
    navi.pose.size = dataForPose.sizesDirArr[navi.facingDir];
  } else {
    navi.pose.size = dataForPose.size;
  }
  updateNaviImage(navi);
  return true;
}

function setFacingDir(navi, dir) {
  if (dir === navi.facingDir) return "NOOP";
  navi.facingDir = dir;
  navi.pose.heldWithFacingTks = 1;
  var dataForPose = navi.pose.dataFor[navi.pose.name];
  if (dataForPose.hasOwnProperty("sizesDirArr")) {
    navi.pose.size = dataForPose.sizesDirArr[navi.facingDir];
  }
  updateNaviImage(navi);
  return true;
}

function setNaviBackground(navi) {
  var style = navi.div.style;
  if (navi.pose.name === "stand") {
    style.backgroundImage = `url("./sprites/${navi.name}_stand.gif")`;
    style.backgroundPositionX = "0%"; // TODO: fix this
  } else if (navi.pose.name === "walk") {
    style.backgroundImage =
      `url("./sprites/${navi.name}_walk_${navi.facingDir}.gif")`;
    style.backgroundPositionX = `${navi.pose.frame * 20}%`;
  } else {
    fullStop("invalid pose name");
  }
}

function setTileColor(tile, isToBlue) {
  if (tile.isBlue === isToBlue) return "NOOP";
  if (tile.contents.filter(x => x.type === "navi" && x.isTeamB === !isToBlue).length) return false;
  tile.isBlue = isToBlue;
  tile.div.classList.replace(isToBlue ? "red" : "blue", isToBlue ? "blue" : "red");
  return true;
}

function signOrZero(x) { return x > 0 ? 1 : (x < 0 ? -1 : 0); }

function shadowToRadius(shadow) { return shadow / 2 / 28 * root2; }

function without(arr, el) { return arr.filter(x => x !== el); }

function shouldFlip(tile, bonusVotes = 0, isBonusBlue = false) {
  var surround = getSurroundTiles(tile);
  var nSur = surround.length;
  if (!nSur && !bonusVotes) return false;
  var flipVotes = surround.filter(sTile => sTile.isBlue !== tile.isBlue).length;
  if (flipVotes > (nSur + 1) / 2) return true;
  if (!bonusVotes || tile.isBlue === isBonusBlue) return false;
  return (flipVotes + bonusVotes) > (nSur + 1 + bonusVotes) / 2;
}

function solveQuadratic(A, B, C) {
  if (A === 0) return B === 0 ? (C === 0 ? [0, 0] : null) : [-C / B, -C / B];
  if (C === 0) return [-B / A, 0];
  const discriminant = B * B - 4 * A * C;
  if (discriminant < 0) return null;
  const sqrtDiscriminant = Math.sqrt(discriminant);
  const t1 = (-B - sqrtDiscriminant) / (2 * A);
  const t2 = (-B + sqrtDiscriminant) / (2 * A);
  return [t1, t2];
}

function tickLoop() {
  if (isFullStop) {
    clearInterval(tickIntervalId);
    return;
  }
  handleCollisions();
  world.navis.forEach(navi => {
    applyTickToNavi(navi);
    updateNaviDecides(navi);
  });
  world.tick++;
  if (world.tick % 6 === 0) {
    var newRF = (world.resonanceFrame + 1) % 8;
    spriteLayer.classList.replace(`resonance-${world.resonanceFrame}`,
      `resonance-${newRF}`);
    world.resonanceFrame = newRF;
  }
  
  // todo: have tiles telegraph better for some # of ticks before flipping
  const flipTks = 20;
  if (world.tick % flipTks === (flipTks - 1)) updateAllTileColors();
}

function updateAllTileColors() {
  var tilesToFlip = [];
  var totalRedBias = 0;
  var tilesToFlip = world.tiles.filter(tile => {
    totalRedBias += tile.isBlue ? -1 : 1;
    return shouldFlip(tile);
  });
  if (!totalRedBias) return; // exactly tied
  if (Math.abs(totalRedBias) === world.tiles.length) {
    console.log(`Match Finished in ${Math.round(world.tick / 60)}s`);
    isFullStop = true;
  }

  var testTiles;
  if (tilesToFlip.length === 0) testTiles = world.tiles.filter(tile => !isTileNeutralPat(tile));
  // TODO: fix this, needs some condition to prevent fast background flipping
  for (var bonusVotes = 1; tilesToFlip.length === 0 && bonusVotes <= 10; bonusVotes++)
    tilesToFlip = testTiles.filter(tile => shouldFlip(tile, bonusVotes, totalRedBias < 0));
  
  tilesToFlip.forEach(tile => setTileColor(tile, !tile.isBlue));
}

function updateNaviImage(navi) {
  navi.div.style.width = navi.pose.size[0];
  navi.div.style.height = navi.pose.size[1];
  setNaviBackground(navi);
}

function updateNaviDecides(navi) {
  var decide = navi.decide;
  if (world.tick < decide.until) return;
  
  var newAct = decide.pat[decide.idx];
  decide.idx = (decide.idx + 1) % decide.pat.length;
  decide.code = newAct[0];
  decide.val = parseFloat(newAct.slice(1));
  if (decide.code === "L" || decide.code === "R") {
    // for current simplicy setFacingDir orders should drain instantly
    // can assume L and R will never directly follow, even on wraparound
    setFacingDir(navi, Math.round(navi.facingDir + 8 + decide.val * (decide.code === "R" ? 1 : -1)) % 8);

    newAct = decide.pat[decide.idx];
    decide.idx = (decide.idx + 1) % decide.pat.length;
    decide.code = newAct[0];
    decide.val = parseFloat(newAct.slice(1));
  }
  if (decide.code === "L" || decide.code === "R") fullStop("L/R follows L/R in navi decides");
  switch (navi.decide.code) {
    case "F":
      naviWalk(navi);
      decide.until = world.tick + decide.val / mphToTpt(8);
      break;
    case "S":
      naviStand(navi);
      decide.until = world.tick + decide.val * 60;
      break;
  }
}

function whenWillCirclesCollide(circleA, circleB, aRad, bRad, Va, Vb) {
  // method return time units = time units of input velocity denominators
  
  // Relative velocity
  const Vab = [Vb[0] - Va[0], Vb[1] - Va[1]];
  // Relative position
  const Rab = [circleB[0] - circleA[0], circleB[1] - circleA[1]];
  
  const radiusSum = aRad + bRad;
  const A = prodSqrs(Vab[0], Vab[1]);
  const B = 2 * (Rab[0] * Vab[0] + Rab[1] * Vab[1]);
  const C = prodSqrs(Rab[0], Rab[1]) - radiusSum * radiusSum;
  var soln = solveQuadratic(A, B, C);
  if (!soln) return Infinity;
  var [t1, t2] = soln;
  return t1 >= 0 && t2 >= 0 ? Math.min(t1, t2) : t1 >= 0 ? t1 : t2 >= 0 ? t2 :
    Infinity;
}

function whenWillThingsCollideTk(a, b) {
  // velocity for a thing is in tiles/tick so this returns ticks
  return whenWillCirclesCollide(getCenter(a), getCenter(b), a.radius, b.radius,
    getVel(a), getVel(b));
}

var tickIntervalId = window.setInterval(tickLoop, 1000 / 60);