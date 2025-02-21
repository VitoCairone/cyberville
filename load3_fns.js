

var isBgMusicOn = false;
var isFullStop = false;
var isMuted = true;

function metersToPx(m) { return m * 28 / root2; }
function pxToMeters(px) { return px * root2 / 28; }
function isRat(x) { return x >= 0 && x < 1; }
function sumSqrs(a, b) { return a * a + b * b; }

function getAcrossDown(thing) {
  return [thing.x - Math.floor(thing.x), thing.y - Math.floor(thing.y)];
}

function applyTickToThing(thing) {
  if (!thing) fullStop("invalid thing to applyTickToThing");
  if (!thing.pose && !thing.speed) return;

  // TODO: consider refactoring these HeldTks to LastTp to reduce updates on every tick
  if (thing.pose && thing.pose !== "unset") {
    thing.pose.frameHeldTks += 1;
    thing.pose.heldTks += 1;
    thing.pose.heldWithFacingTks += 1;
    var nFrames = thing.pose.nFrames;
    var holdFor = getWalkHoldFrameFor(thing);
    if (nFrames > 1) {
      if (thing.pose.frameHeldTks >
        holdFor) { // TODO: determine from timings and/or speed
        thing.pose.frame = (thing.pose.frame + 1) % nFrames;
        thing.pose.frameHeldTks = 1;
      }
    }
  }

  if (thing.speed) {
    if (thing.speed < 0) fullStop(`thing speed = ${thing.speed}`);

    // minion edge following
    if (thing.kind === "minion" && thing.doTurnRightHere) {
      var didReachCenter = false
      var [across, down] = getAcrossDown(thing)
      switch (thing.facingDir) {
        case 1: didReachCenter = down <= 0.5; break;
        case 3: didReachCenter = across >= 0.5; break;
        case 5: didReachCenter = down >= 0.5; break;
        case 7: didReachCenter = across <= 0.5; break;
      }
      if (didReachCenter) {
        console.log("L50 turn")
        setFacingDir(thing, (thing.facingDir + 4) % 8);
        thing.doTurnRightHere = false;
      }
    }

    var didMove = thing.isCollideHalted || moveThing(thing, ...getVel(thing));
    thing.isCollideHalted = false;


    if (!didMove) {
      // bonk / bump / wallbonk / cliff / wallbump handled here
      if (thing.kind === "shot") {
        // TODO: allow shots to fly over empty space
        removeThing(thing);
        return;
      } else {
        console.log("L67 turn")
        let newDir;
        if (thing.facingDir & 1) {
          newDir = (thing.facingDir + 2) % 8;
          setFacingDir(thing, newDir);
        } else if (getTileAtShift(thing.onTile, shifts[(thing.facingDir + 1) % 8])) {
          // TODO: doublecheck for consistancy here / unit test
          newDir = (thing.facingDir + 1) % 8;
          setFacingDir(thing, newDir);
        } else if (getTileAtShift(thing.onTile, shifts[(thing.facingDir + 7) % 8])) {
          // TODO: doublecheck for consistancy here / unit test
          newDir = (thing.facingDir + 7) % 8;
          setFacingDir(thing, newDir);
        } else {
          setPose(thing, "stand");
        }
      }
    }
  }

  // TODO: avoid updating navi image when pose, frame, and direction are all unchanged
  updateThingImage(thing);
  afterTickForThing(thing);
}

function damageOverTime(thing, amountTotal, duration = 1, elem = 'none') {
  fullStop("NYI damageOverTime");
}

function regen(thing, amountTotal, duration = 1, elem = 'none') {
  fullStop("NYI regen");
}

function travelSlow(thing, amount, duration = 1, elem = 'norm') {
  fullStop("NYI travelSlow");
}

function travelHaste(thing, amount, duration = 1, elem = 'norm') {
  fullStop("NYI travelHaste");
}

function shieldOverTime(thing, amount, elem = 'norm') {
  fullStop("NYI shieldOverTime");
}


function afterTickForThing(thing) {
  switch (thing.onTile.terrain) {
    case 'grass':
      if (thing.elem === "wood") regen(thing, WOOD_REGEN_ON_GRASS);
      break;
    case 'fire':
      if (thing.elem !== "fire")
        damageOverTime(thing, FIRE_DOT, FIRE_DOT_DURATION, 'fire');
      break;
    case 'ice':
      if (thing.elem !== 'aqua') travelSlow(thing, ICE_SLOW, 5, 'aqua');
    case 'metal':
      if (thing.elem === 'elec') travelHaste(thing, ELEC_METAL_HASTE, 5, 'elec');
      if (thing.elem === 'metal' && thing.speed === 0) shieldOverTime(thing, METAL_SHIELD, 'metal');
      break;
    case 'miasma':
      if (thing.elem !== 'void') damageOverTime(thing, MIASMA_DOT, MIASMA_DOT_DURATION, 'void');
      break;
  }
}

function getVolumousThings() {
  return world.towers.concat(world.navis).concat(world.minions);
}

function getAllThings() {
  return world.fountains.concat(getVolumousThings()).concat(world.shots);
}

function isWeakTo(thing, atkElem) {
  if (!thing.kind) fullStop("unkind thing to isWeakTo");
  var thingElem = thing.elem || 'norm';
  return weakMap[thingElem] === atkElem;
}

function fullStop(msg = "full stop") {
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
  if (!a || !a.hasOwnProperty('facingDir')) fullStop('getVel without facingDir');
  var ijVector = dirToIjVector[a.facingDir];
  return [a.speed * ijVector[0] * scaleBy + plusVec[0], a.speed * ijVector[1] *
    scaleBy + plusVec[1]
  ];
}

function getWalkHoldFrameFor(navi) {
  return Math.max(Math.round(refRunFrameHold * refRunSpeed / navi.speed), 1);
}

function getSurroundTiles(tile, doShowAll = false) {
  // returns an 8-element array usually containing nulls
  var allShifts = shifts.map(shift => getTileAtShift(tile, shift));
  return doShowAll ? allShifts : allShifts.filter(x => x);
}

function getThingsNaviOverlaps(navi) {
  fullStop("NYI getThingsNaviOverlaps");
  // if (!navi.onTile.contents.length) fullStop("navi tile contents empty");

  // note that this method is currently only used for navi-crystal overlaps,
  // as the rest are handled by collision detection, which ignores crystals.
  // For crystals we don't need to check surround tiles.

  // var things = navi.onTile.contents.concat(
  //   getSurroundTiles(navi.onTile).flatMap(tile => tile.contents)
  // );

  // var things = navi.onTile.contents;
  // return things.filter(x => x !== navi && doThingsOverlap(navi, x));
}

function getCenter(thing) {
  return [thing.x, thing.y];
}

function triggerKO(thing) {
  if (thing.name) console.log(`${thing.name} is KOd`);
  if (thing.kind === "navi") {
    // TODO: move thing to fountain
    thing.hp = 1;
  } else {
    removeThing(thing);
  }
}

function impartDamage(thing, amount) {
  if (!thing || !thing.hp || !amount || amount < 0) return;
  thing.hp -= amount;
  if (thing.hp < 0) triggerKO(thing);
}

function isTileNeutralPat(tile) {
  var nSur = 0;
  return (shifts.every(shift => {
    var sTile = getTileAtShift(tile, shift);
    if (sTile) nSur++;
    return !sTile || sTile.isBlue === (isDiag(shift) ? tile.isBlue : !tile.isBlue);
  }) && nSur > 1);
}

function makeTile(i, j, isAir = false) {
  var isBlue = (i & 1) !== (j & 1);
  var tileDiv = document.createElement('div');
  tileDiv.id = `tile-${i}-${j}`;
  tileDiv.className = `path-tile ${isBlue ? 'blue' : 'red'}`;
  tileDiv.style.left = 14 * (i - j - 1);
  tileDiv.style.top = 7 * (i + j);
  tileDiv.style.zIndex = "-100000";
  tileLayer.appendChild(tileDiv);
  var tile = {
    kind: "tile",
    i: i,
    j: j,
    div: tileDiv,
    contents: [],
    isBlue: isBlue,
    isAir: isAir
  };
  world.tileAt[i] ||= [];
  world.tileAt[i][j] = tile;
  
  world.tiles.push(tile);
}

function makeGridFromMap(isOneToNine = true) {
  const lines = zoneMap.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (idx === 0) return;
    var j = idx - 1;
    for (var i = 0; i < line.length; i++)
      if (line[i] === '1') {
        if (isOneToNine) {
          for (var ii = 0; ii < 3; ii++)
            for (var jj = 0; jj < 3; jj++)
              makeTile(i * 3 + ii, j * 3 + jj);
        } else {
          makeTile(i, j);
        }
      }
  });
  // world.tiles.filter(tile => tile.i % 3 === 1 && tile.j % 3 === 1)
  //   .forEach(tile => makeCrystalOnTile(tile));
}

function getFountainDeployTile(fountain) {
  var fountainTile = fountain.onTile;
  // if (fountainTile.contents.length === 1) {
  //   // console.log(fountainTile);
  //   // world.minions.forEach(m => console.log(m.onTile));
  //   return fountainTile;
  // }
  var teamDir = teamDirs[fountain.isTeamB];
  var rots = [0, 1, 7, 2, 6, 3, 5, 4];
  for (var i = 0; i < 8; i++) {
    var dir = (teamDir + rots[i]) % 8;
    var tile = getTileAtShift(fountainTile, shifts[dir]);
    // TODO: implement proper occupancy check here, previously used tile.contents
    return tile;
  }
  fullStop("No available tile to deploy at fountain");
}

function deployMinion(fountain) {
  var startTile = getFountainDeployTile(fountain);
  var minion = makeMinion(startTile, fountain.isTeamB);
  if (minion) {
    updateThingSpritePos(minion);
    return minion;
  } else return null;
}

function onTickFountain(fountain) {
  if (!fountain.isStarted) {
    fountain.isStarted = true;
    fountain.ticksUntilSpawn = START_SPAWN_DELAY;
    fountain.stock = 0;
  }
  if (fountain.ticksUntilSpawn <= 0) {
    if (!fountain.stock) {
      fountain.stock = MINION_TRAIN_STOCK;
      fountain.trainTimer = 0;
    }
    if (fountain.trainTimer <= 0) {
      deployMinion(fountain);
      fountain.stock--;
      if (fountain.stock) {
        fountain.trainTimer = MINION_TRAIN_INTERVAL;  
      } else {
        fountain.ticksUntilSpawn = SPAWN_INTERVAL;
      }
    } else {
      fountain.trainTimer--;
    }
  } else {
    fountain.ticksUntilSpawn--;
  }
}

function score(isTeamB, amount = 1) {
  let scoreDiv = document.getElementById(`${isTeamB ? 'blue' : 'red'}-score`);
  world.scores[isTeamB ? 1 : 0] += amount;
  scoreDiv.innerHTML = world.scores[isTeamB ? 1 : 0];
}

// returns true if movement should occur and false if it should not
function onTileMove(thing, dx, dy) {
  if (thing.kind === "minion") {
    const newTile = getTileAtIj(Math.floor(thing.x + dx), Math.floor(thing.y + dy));

    if (newTile.isGoal) {
      score(newTile.isTeamB);
      removeThing(thing);
      return false;
    }

    var dirRt = (thing.facingDir + 2) % 8;
    if (!getTileAtShift(thing.onTile, shifts[dirRt]) && getTileAtShift(newTile, shifts[dirRt])) {
      thing.doTurnRightHere = true;
    }
  }

  return true;
}

function meleeSweep(navi, abil) {
  makeShot(navi, abil.range, abil.damage, abil.execution);
}

function getAbilBySlot(navi, slot) {
  return allAbilsByName(navi.abils[0]);
}

function beginCooldownAbil(navi, slot) {
  navi.abilCooldowns[slot] = 0.25 * 60;
}

function registerTapAbil(navi, slot) {
  console.log("rTA");
  // const abil = getAbilBySlot(navi, slot);
  makeShot(world.cameraNavi, 0.1, 5);
  beginCooldownAbil(navi, slot);
}

function registerHoldAbil(navi, slot) {
fullStop("NYI startHoldAbil");
}

function releaseHoldAbil(navi, slot) {
fullStop("NYI releaseHoldAbil");
}

function isVolumousKind(kind) {
  return kind === "minion" || kind === "navi" || kind === "tower";
}

function isMoverKind(kind) {
  return kind === "minion" || kind === "navi" || kind == "shot";
}

function areArraysEq(a, b) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;
  return a.every((x, ind) => x === b[ind]);
}

function onCliffLimited(thing) {
  return;
}

function iujToIj(iuj) {
  return iuj.split('_').map(val => parseInt(val));
}

function moveThing(thing, dx, dy) {
  if (!isMoverKind(thing.kind)) fullStop(`moveThing invalid kind ${thing.kind}`)
  if (dx == 0 && dy == 0) return false;

  const startIUJs = getPlantedIUJs(thing);
  const endIUJs = getPlantedIUJs(thing, dx, dy);

  const areIUJsDiff = !areArraysEq(startIUJs, endIUJs)
  if (areIUJsDiff && !endIUJs.every(iuj => getTileAtIj(...iujToIj(iuj)))) {
    thing.isCliffLimited = true;
    onCliffLimited(thing);
    return false;
  }
  thing.isCliffLimited = false;

  const isTileMove = Math.floor(thing.x) !== Math.floor(thing.x + dx)
    || Math.floor(thing.y) !== Math.floor(thing.y + dy);

  // onTileMove runs side effects and returns false if halting
  if (isTileMove && !onTileMove(thing, dx, dy)) return false;

  thing.x += dx;
  thing.y += dy;

  if (thing === world.cameraNavi) updateCamera();
  updateThingSpritePos(thing);

  return true;
}

function updateCamera() {
  const camNavi = world.cameraNavi;
  if (!camNavi) return false;
  const camCtr = getCenter(camNavi);
  var offX = canvSize[0] / 2 + (camCtr[1] - camCtr[0]) * 14;
  var offY = canvSize[1] / 2 + (camCtr[0] + camCtr[1]) * -7;
  worldLayer.style.transform = `translate(${offX}px, ${offY}px)`;
  return true;
}

function updateThingSpritePos(thing) {
  var ctr = getCenter(thing);
  if (!thing || !thing.div) fullStop("invalid thing to updateThingSpritePos");
  var halfWidth = parseInt(thing.div.style.width) / 2;
  if (!halfWidth) fullStop("thing width not set on div style");

  var left = Math.round(14 * (ctr[0] - ctr[1]) - halfWidth);
  var bottom = -7 * (ctr[0] + ctr[1]) - 2.5;

  // if (thing.kind === "shot") console.log(`L, B = ${left}, ${bottom}`);
  thing.div.style.left = `${left}px`;
  thing.div.style.bottom =`${bottom}px`;
  thing.div.style.zIndex = `${Math.round((ctr[0] + ctr[1]) * 100)}`;
  return true;
}

function updateThingSpeed(thing) {
  // TODO: refactor so speed is being set only here
  // speed should be the actual physics value in tiles/tick

  if (!(thing.pose.name === "walk")) {
    thing.speed = 0;
    return 0;
  }

  // FOR NOW don't do external vectors or sliding
  // current logic is simplified to assume a thing moves
  // in its facing direction or not at all
  // TODO: external vectors, sliding

  let speed = refRunSpeed;

  travelEffs = thing.effects.filter(eff => eff.alter === "travel");

  if (travelEffs.length) {
    var sum = travelEffs.reduce((sum, eff) => sum + eff.value, 0);
    var mod = sum >= 0 ? ((sum + 100) / 100) : (100 / (100 - sum));
    speed *= mod;
  }
  
  thing.speed = speed;
  return speed;
}

function toggleSound() {
  var toggleEl = document.getElementById('sound-toggle');
  if (isMuted) {
    toggleEl.classList.remove('sound-off');
    isMuted = false;
    allSoundEls.forEach(el => el.muted = false);
    if (!isBgMusicOn) playBackgroundMusic();
  } else {
    toggleEl.classList.add('sound-off');
    isMuted = true;
    allSoundEls.forEach(el => el.muted = true);
  }
  return isMuted;
}

function playPickupSound(navi) {
  if (isMuted) return;

  var loudness = 1.0;
  if (navi !== world.cameraNavi) {
    var maxLoudL2 = 12 * 12; // inscribed circle for 720 x 480 window
    var ctr = getCenter(navi);
    var camCtr = getCenter(world.cameraNavi);
    var [dx, dy] = [ctr[0] - camCtr[0], ctr[1] - camCtr[1]];
    var distL2 = sumSqrs(dx, dy);
    if (distL2 > maxLoudL2) loudness = maxLoudL2 / distL2;
  }

  if (loudness >= 0.01) {
    pickupSoundEl.volume = loudness;
    pickupSoundEl.load();
    pickupSoundEl.play().catch((err) => { console.log(err); });
  }
}

function playBackgroundMusic() {
  if (isMuted) return;
  bg1SoundEl.play().catch((err) => { console.log(err); });
  isBgMusicOn = true;
}

function pickupCrystal(navi, crystal) {
  var tile = crystal.onTile;
  removeThing(crystal);
  setTileColor(tile, navi.isTeamB);
  getSurroundTiles(tile).forEach(sTile => setTileColor(sTile, navi.isTeamB));
  playPickupSound(navi);
}

function removeThing(thing) {
  // this flag is set for debugging. Don't intentially do anything
  // with things after calling removeThing!
  thing.isRemoved = true;

  thing.div.remove();
  var kindGroup = thing.kind + 's';
  world[kindGroup] = without(world[kindGroup], thing);
}

function setPose(thing, poseName) {
  if (thing.pose.name === poseName) return false;
  const spriteData = thing.kind === "navi" ? thing.pose.spriteData : metSpriteData;
  if (!spriteData.hasOwnProperty(poseName)) fullStop("invalid poseName");
  thing.pose.name = poseName;
  thing.pose.frameHeldTks = 1;
  thing.pose.heldTks = 1;
  thing.pose.heldWithFacingTks = 1;
  const spriteDataPose = spriteData[poseName];
  thing.pose.nFrames = spriteDataPose.nFrames;
  if (thing.pose.frame >= thing.pose.nFrames) thing.pose.frame = 0;
  // TODO: eliminate sizesDirArr, one size per pose for all frames and directions
  if (spriteDataPose.hasOwnProperty("sizesDirArr")) {
    thing.pose.size = spriteDataPose.sizesDirArr[thing.facingDir];
  } else {
    thing.pose.size = spriteDataPose.size;
  }
  thing.div.style.width = thing.pose.size[0];
  thing.div.style.height = thing.pose.size[1];
  updateThingSpeed(thing);
  updateThingImage(thing);
  return true;
}

function setFacingDir(thing, dir) {
  if (dir === thing.facingDir) return false;
  thing.facingDir = dir;
  if (thing.pose) {
    thing.pose.heldWithFacingTks = 1;
    var spriteDataPose = thing.pose.spriteData[thing.pose.name];
    if (spriteDataPose.hasOwnProperty("sizesDirArr")) {
      thing.pose.size = spriteDataPose.sizesDirArr[thing.facingDir];
      thing.div.style.width = thing.pose.size[0];
      thing.div.style.height = thing.pose.size[1];
    }
    updateThingImage(thing);
  }
  return true;
}

function setShotBackground(shot) {
  // nothing to do yet as the basic shot is static
  // future shots will have directions and frames
  return true;
}

function setMinionBackground(minion) {
  if (!(minion.facingDir & 1)) fullStop("no sprites for cardinal facing mets");

  // TODO: unify minion and navi sprite sheet formats
  // use a single sprite sheet for each entity

  // console.log("setMinionBackground")
  // console.log(minion)

  var style = minion.div.style;
  if (minion.pose.name === "stand") {
    fullStop("DEBUG minion stand");
    // const yVal = 
    //   [0, -25, -50, -75][Math.floor(minion.facingDir / 2)];
    // style.backgroundPositionX = "0px";
    // style.backgroundPositionY = `-${yVal}%`;
  } else if (minion.pose.name === "walk") {
    const xVal = -23 * minion.pose.frame; // TODO: percents
    const yVal = 
      -42 * [Math.floor(minion.facingDir / 2)] - 21;
    // console.log([xVal, yVal]);
    style.backgroundPositionX = `${xVal}px`;
    style.backgroundPositionY = `${yVal}px`;
  } else {
    fullStop("invalid pose name");
  }
}

function setNaviBackground(navi) {
  var style = navi.div.style;
  if (navi.pose.name === "stand") {
    style.backgroundImage = `url("./sprites/${navi.name}_stand.gif")`;
    style.backgroundPositionX = `-${28 * navi.facingDir}px`;
  } else if (navi.pose.name === "walk") {
    // NOTE: this assumes walk cycle is always 6 frames
    style.backgroundImage =
      `url("./sprites/${navi.name}_walk_${navi.facingDir}.gif")`;
    style.backgroundPositionX = `${navi.pose.frame * 20}%`;
  } else {
    fullStop("invalid pose name");
  }
}


/* NEW COLOR CHANGE RULES

  Things (and Contested Tiles) vote continuously.
  All Tiles begin at 0 and Uninitialized.
  Uninitialized Tiles don't vote and ignore votes from Tiles,
    but flip as soon as any Thing vote is registered
  All Blue Team things vote + and Red Team things vote -.
  A Red tile flips Blue when it hits +100.
  A Blue tile flips Red when it hits -100.
  A Tile votes 1 for itself and its surround
  A Minion votes 2 for its onTile and surround

  Navis don't vote, but they block all opposed votes
  for the tile they stand on, ensuring it cannot flip
  against them.

  When a Thing is destroyed by an enemy's attack,
  it immediately flips its tile to the enemy color
  and sets it to max votes.

  When a Navi is destroyed and grants an enemy KO,
  its surround is also flipped to the enemy color
  and set to max votes.

  If needed for runtime, consider having things and tiles
  vote in segmented groups, so that every thing and tile
  votes e.g. once / 10 ticks instead of every tick

  COLOR EFFECTS

  When standing on the opponent color,
  Navis have Travel -5
  Any Ability used gets Offside Penalty (Rate -100) until refreshed
*/

function setTileColor(tile, isToBlue) {
  if (tile.isBlue === isToBlue) return false;
  // if (tile.contents.filter(x => x.kind === "navi" && x.isTeamB === !isToBlue).length) return false;
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

function tickLoop() {
  if (isFullStop) {
    clearInterval(tickIntervalId);
    return;
  }

  if (world.tick <= 1) updateCamera();

  world.fountains.forEach(fountain => onTickFountain(fountain));

  handleCollisions();

  var movers = world.navis.concat(world.minions).concat(world.shots);
  movers.forEach(mover => {
    // TODO: fix this -- everything is moved 1 tick after colliders have already
    // advanced to the point collision up to 1 tick
    
    applyTickToThing(mover);
    if (mover.kind === "navi" && (mover !== world.cameraNavi || !world.isCameraNaviManual))
      updateNaviDecides(mover);
  });

  world.tick++;
  if (world.tick % 10 === 0) {
    var newRF = (world.resonanceFrame + 1) % 8;
    tileLayer.classList.replace(`resonance-${world.resonanceFrame}`,
      `resonance-${newRF}`);
    world.resonanceFrame = newRF;
  }
  
  // todo: have tiles telegraph better for some # of ticks before flipping
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

  // TODO: before winner-favoring bonusVoting, try bonusVotes for each team
  // for each crystal picked up in the last 6 seconds

  var testTiles;
  if (tilesToFlip.length === 0) testTiles = world.tiles.filter(tile => !isTileNeutralPat(tile));
  for (var bonusVotes = 1; tilesToFlip.length === 0 && bonusVotes <= 8; bonusVotes++)
    tilesToFlip = testTiles.filter(tile => shouldFlip(tile, bonusVotes, totalRedBias < 0));
  
  tilesToFlip.forEach(tile => setTileColor(tile, !tile.isBlue));
}

function updateThingImage(thing) {
  switch (thing.kind) {
    case "navi": return setNaviBackground(thing);
    case "minion": return setMinionBackground(thing);
    case "shot": return setShotBackground(thing);
    default: return fullStop(`no method to set background in updateThingImage`);
  }
}

// END Functions

// Node Only

// This section does NOT run when the script is linked in an HTML document
// It runs only for testing and helper scripts invoked with node
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = { createWorld };
}

// END Node Only