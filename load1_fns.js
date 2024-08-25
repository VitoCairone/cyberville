

var isBgMusicOn = false;
var isFullStop = false;
var isMuted = true;

function metersToPx(m) { return m * 28 / root2; }
function pxToMeters(px) { return px * root2 / 28; }
function isRat(x) { return x >= 0 && x < 1; }
function sumSqrs(a, b) { return a * a + b * b; }

// note that makeGridToMap is oneToNine = true by default
// e.g. every 1/0 becomes a group of 9 tiles or empty spaces
const zoneMap = `Tile Map
1110000000000111
1111111111111111
1110000000000111`

// these are in actual tile coordinates AFTER oneToNine
const fountainStartIjs = [[4, 4], [43, 4]];

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

function makeWorld() {
  var world = {
    tileAt: {},
    tiles: [],
    navis: [],
    crystals: [],
    towers: [],
    fountains: [],
    minions: [],
    shots: [],
    nextCrystalId: 0,
    tick: 0,
    resonanceFrame: 0,
    cameraNavi: null,
    isCameraNaviManual: false,
  };
  return world;
}

var world = makeWorld();

function applyTickToThing(thing) {
  if (!thing) fullStop("invalid thing to applyTickToThing");
  if (!thing.pose && !thing.speed) return;

  var didChange = false;

  // TODO: consider refactoring these HeldTks to LastTp to reduce updates on every tick
  if (thing.pose && thing.pose !== "unset") {
    thing.pose.frameHeldTks += 1;
    thing.pose.heldTks += 1;
    thing.pose.heldWithFacingTks += 1;
    var nFrames = thing.pose.nFrames;
    var didChange = false;
    var holdFor = getWalkHoldFrameFor(thing);
    if (nFrames > 1) {
      if (thing.pose.frameHeldTks >
        holdFor) { // TODO: determine from timings and/or speed
        thing.pose.frame = (thing.pose.frame + 1) % nFrames;
        thing.pose.frameHeldTks = 1;
        didChange = true;
      }
    }
  }

  if (thing.speed) {
    if (thing.speed < 0) fullStop(`thing speed = ${thing.speed}`);
    var didMove = moveThing(thing, ...getVel(thing));
    if (didMove) {
      didChange = true;
    } else {
      // bonk / bump / wallbonk // wallbump handled here ??
      if (thing.scoreHist) thing.scoreHist.bonks++;
      let newDir;
      switch (thing.facingDir) {
        case 0: newDir = thing.across <= 0.5 ? 1 : 7; break;
        case 1: newDir = 3; break;
        case 2: newDir = thing.down <= 0.5 ? 3 : 1; break;
        case 3: newDir = 5; break;
        case 4: newDir = thing.across >= 0.5 ? 5 : 3; break;
        case 5: newDir = 7; break;
        case 6: newDir = thing.down >= 0.5 ? 7 : 5; break;
        case 7: newDir = 1; break;
      }
      setFacingDir(thing, newDir);
    }
  }
  if (didChange) updateThingImage(thing);

  afterTickForThing(thing);
}

const WOOD_REGEN_ON_GRASS = 1;
const FIRE_DOT = 5;
const FIRE_DOT_DURATION = 20;
const MIASMA_DOT = 1;
const MIASMA_DOT_DURATION = 1;
const ICE_SLOW = 2;
const ELEC_METAL_HASTE = 1;
const METAL_SHIELD = 1;

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

function isWeakTo(thing, atkElem) {
  if (!thing.kind) fullStop("unkind thing to isWeakTo");
  var thingElem = thing.elem || 'norm';
  return weakMap[thingElem] === atkElem;
}

function doCirclesOverlap(aCtr, bCtr, aRad, bRad) {
  var [dx, dy] = [aCtr[0] - bCtr[0], aCtr[1] - bCtr[1]];
  var radSum = aRad + bRad;
  return sumSqrs(dx, dy) < radSum * radSum;
}

function doThingsOverlap(a, b) {  
  return doCirclesOverlap(getCenter(a), getCenter(b), a.radius, b.radius);
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
  const refRunHold = 7;
  return Math.max(Math.round(refRunHold * refRunSpeed / navi.speed), 1);
}

function getSurroundTiles(tile, doShowAll = false) {
  // returns an 8-element array usually containing nulls
  var allShifts = shifts.map(shift => getTileAtShift(tile, shift));
  return doShowAll ? allShifts : allShifts.filter(x => x);
}

function getThingsNaviOverlaps(navi) {
  if (!navi.onTile.contents.length) fullStop("navi tile contents empty");

  // note that this method is currently only used for navi-crystal overlaps,
  // as the rest are handled by collision detection, which ignores crystals.
  // For crystals we don't need to check surround tiles.

  // var things = navi.onTile.contents.concat(
  //   getSurroundTiles(navi.onTile).flatMap(tile => tile.contents)
  // );

  var things = navi.onTile.contents;
  return things.filter(x => x !== navi && doThingsOverlap(navi, x));
}

function getCenter(thing) {
  return [thing.onTile.i + thing.across, thing.onTile.j + thing.down];
}

function triggerKO(thing) {
  if (thing.name) console.log(`${thing.name} is KOd`);
  if (thing.kind === "navi") {
    moveThingToTile(thing, world.fountains[navi.isTeamB]);
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

function getTilesForSweep(thing) {
  if (thing.kind === "fountain" || thing.kind === "tower")
    return [thing.onTile];

  const tiles = [];
  const [cx, cy] = getCenter(thing);
  const rad = thing.radius;

  let [xLo, yLo, xHi, yHi] = [cx - rad, cy - rad, cx + rad, cy + rad];

  if (thing.speed) {
    const [vx, vy] = getVel(thing);

    const endXLo = xLo + vx;
    const endYLo = yLo + vy;
    const endXHi = xHi + vx;
    const endYHi = yHi + vy;

    xLo = Math.min(xLo, endXLo);
    yLo = Math.min(yLo, endYLo);
    xHi = Math.max(xHi, endXHi);
    yHi = Math.max(yHi, endYHi);
  }

  let [iLo, jLo, iHi, jHi] = [xLo, yLo, xHi, yHi].map(val => Math.floor(val));

  if (iLo === iHi && jLo === jHi) return [thing.onTile];

  for (let i = iLo; i <= iHi; i++)
    for (let j = jLo; j <= jHi; j++)
      tiles.push(getTileAtIj(i, j));

  return tiles.filter(x => x);
}

function tileBasedCollisions() {
  var collisions = [];
  var stills = world.fountains.concat(world.towers);
  var movers = world.navis.concat(world.minions).concat(world.shots);

  var allThings = stills.concat(movers).filter(x => x);
  var thingsByTile = {};

  allThings.forEach(thing => {
    var freeSweepTiles = getTilesForSweep(thing);

    var tested = {};
    freeSweepTiles.forEach(tile => {
      if (thingsByTile[tile]) {
        var priors = thingsByTile[tile].filter(prior => !tested[prior]);
        priors.forEach(prior => {
          tested[prior] = true;
          if (thing.kind === "shot")
            if (prior.kind === "shot" || (thing.isMelee && thing.maker === prior))
              return;
          var collideTk = whenWillThingsCollideTk(thing, prior);
          if (collideTk <= 0) fullStop(`collideTk=${collideTk}`);
          if (collideTk <= 1) collisions.push([prior, thing, collideTk]);
        });
        thingsByTile[tile].push(thing);
      }
      thingsByTile[tile] = [thing];
    });
  });

  return collisions;
}

function handleCollisions() {
  // TODO: this does nMovers^2 / 2 comparisons
  // which is fine for now because there are very few movers 
  // when there are more movers use tile sweeps instead of O(n^2) compare

  // var collisions = [];
  // var stills = world.fountains.concat(world.towers);
  // var movers = world.navis.concat(world.minions).concat(world.shots);

  // stills.forEach(still => {
  //   movers.forEach(other => {
  //     var collideTk = whenWillThingsCollideTk(still, other);
  //     if (collideTk <= 0) fullStop(`still-mover collideTk=${collideTk}`);
  //     if (collideTk <= 1) collisions.push([still, other, collideTk]);
  //   })
  // });

  // movers.forEach((mover, idx) => {
  //   movers.slice(idx + 1).forEach(other => {
  //     var collideTk = whenWillThingsCollideTk(mover, other);
  //     if (collideTk <= 0) fullStop(`mover-mover collideTk=${collideTk}`);
  //     if (collideTk <= 1) collisions.push([mover, other, collideTk]);
  //   });
  // });

  var collisions = tileBasedCollisions();
  
  // TODO: ensure an object doesn't get moved more than 1 tick worth
  // if they are collided into more than once
  // TODO: prevent an object from 'ghost colliding' with a second object
  // if it already bounced off of a third object in the middle
  if (collisions.length > 1) {
    collisions.sort((a, b) => a[2] - b[2]); // sort ascending by time
    console.log(`WARN: multiple collisions handled in tick ${world.tick}`);
  }
  
  collisions.forEach(coll => {
    var [a, b, timeToCollide] = coll;

    if (timeToCollide === 0) return; // TODO: re-evaluate how this should be handled
    // and note that there is already a direct overlap check every tick

    // advance to point of impact
    [a, b].forEach(thing => {
      // TODO: make moveThing for non-navis!!!
      if (thing.speed > 0) moveThing(thing, ...getVel(thing, timeToCollide));
    });

    if (b.kind === 'shot' && a.kind !== 'shot') {
      if (b.isMelee) {
        b.struck ||= [];
        if (!b.struck.includes(a) && a !== b.maker) {
          impartDamage(a, b.collideDamage);
          b.struck.push(a);
        }
      } else {
        impartDamage(a, b.collideDamage);
        removeThing(b);
      }
    } else if (b.kind !== 'shot') {
      [a, b].forEach(thing => {
        if (thing.speed > 0) {
          thing.facingDir = (thing.facingDir + 4) % 8;
          moveThing(thing, ...getVel(thing, 1 - timeToCollide));
        };
      });
    }
  });
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

function makeTower(startTile, isTeamB) {
  if (!startTile) fullStop("invalid startTile to makeTower");
  var towerDiv = document.createElement('div');
  // TODO: set id
  towerDiv.className = `tower`;
  spriteLayer.appendChild(towerDiv);
  var tower = {
    kind: "tower",
    div: towerDiv,
    radius: 0.495,
    speed: 0,
    across: 0.5,
    down: 0.5,
    facingDir: isTeamB ? 5 : 1,
    isTeamB: isTeamB,
    isPermRooted: true,
  };

  // TODO: DRY repeated logic in methods for creating Things

  startTile.contents.push(tower);
  world.towers.push(tower);
  return tower;
}

const MINION_TRAIN_STOCK = 5;
const MINION_TRAIN_INTERVAL = 2 * 60;
const SPAWN_INTERVAL = 30 * 60;
const START_SPAWN_DELAY = 10 * 60;

// NOTE the CURRENT USER HERE is train as in a train (noun) of cars

// TODO: consider revising terms so that
// 'train' means preparing a unit (long timer)
// and 'deploy' means sending out a unit (short timer)

function getFountainDeployTile(fountain) {
  var fountainTile = fountain.onTile;
  if (fountainTile.contents.length === 1) return fountainTile;
  var teamDir = teamDirs[fountain.isTeamB];
  var rots = [0, 1, 7, 2, 6, 3, 5, 4];
  for (var i = 0; i < 8; i++) {
    var dir = (teamDir + rots[i]) % 8;
    var tile = getTileAtShift(fountainTile, shifts[dir]);
    if (tile.contents.length === 0) return tile;
  }
  fullStop("No available tile to deploy at fountain");
}

function deployMinion(fountain) {
  var startTile = getFountainDeployTile(fountain);
  var minion = makeMinion(startTile, fountain.isTeamB);
  return minion;
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

function makeFountain(startTile, isTeamB) {
  if (!startTile) fullStop("invalid startTile to makeFountain");
  if (world.fountains && world.fountains[isTeamB]) fullStop("reduntant call to makefountain");
  if (startTile.contents.length) {
    console.log(startTile);
    fullStop("occupied startTile to makefountain");
  }

  return makeThingOnTile(startTile, 'fountain', isTeamB);
}

const SHOT_SPAWN_SEPARATION = 0.1;
const VALID_KINDS = ['navi', 'tower', 'minion', 'shot', 'fountain'];

const REF_HP_BY_KIND = {
  minion: 30,
  navi: 500,
  tower: 1500,
  fountain: 2500
};

function makeThingOnTile(startTile, kind, isTeamB, spriteData = null, name = null) {
  if (!VALID_KINDS.includes(kind)) fullStop("invalid kind to makeThingOnTile");
  if (!startTile) fullStop("invalid startTile to makeThingOnTile");
  var thingDiv = document.createElement('div');
  if (kind === "navi") thingDiv.id = `navi ${name} team-${isTeamB}`;
  thingDiv.className = name ? `${kind} ${name} team-${isTeamB}` : `${kind} team-${isTeamB}`;
  spriteLayer.appendChild(thingDiv);
  var thing = {
    kind: kind,
    div: thingDiv,
    hp: REF_HP_BY_KIND[kind] || 1,
    hpMax: REF_HP_BY_KIND[kind] || 1,
    abils: [null, null, null, null],
    abilCooldowns: [0, 0, 0, 0],
    radius: 0.4,
    speed: 0,
    across: 0.5,
    down: 0.5,
    facingDir: isTeamB ? 5 : 1,
    onTile: startTile,
    isTeamB: isTeamB
  };

  if (name) thing.name = name;

  startTile.contents.push(thing);
  world[kind + 's'].push(thing);

  // for simplicity set walk pose immediately
  if (spriteData) {
    thing.pose = {
      name: "unset",
      frame: 0,
      frameHeldTks: 1,
      heldTks: 1,
      heldWithFacingTks: 1,
      size: undefined,
      nFrames: undefined,
      spriteData: spriteData
    };
    setPose(thing, "walk");
  }

  return thing;
}

function makeShot(navi, radius = 0.1, collideDamage = 1, sweepDuration = 0) {
  var xy = getCenter(navi);
  var vec = dirToIjVector[navi.facingDir];

  // sweeps (used for melee) are centered on the edge of the navi
  // while other shots are spawned on non-overlapping points
  var dist = navi.radius;
  if (!sweepDuration) dist += radius + SHOT_SPAWN_SEPARATION;
  xy = [x + vec[0] * dist, y + vec[1] * dist];
  var tile = getTileAtIj(xy.map(c => Math.floor(c)));
  
  var shot = makeThingOnTile(tile, 'shot', navi.isTeamB);
  shot.facingDir = navi.facingDir;
  shot.radius = radius;
  shot.maker = navi;
  if (sweepDuration) {
    shot.isMelee = true;
    shot.speed = navi.speed;
  } else {
    // Airsoft pellet realistic ref value is 1.5 tiles/tick
    // Use slower value for improved visibility for the time being
    shot.speed = navi.speed + 0.3;
  }
  shot.collideDamage = collideDamage;
}

function meleeSweep(navi, abil) {
  makeShot(navi, abil.range, abil.damage, abil.execution);
}

const allAbilsByName = {
  // SlotType 0

  'Sword': {
    style: 'melee',
    damage: 30,
    elem: 'norm',
    range: 1,
    windup: 4,
    execution: 12,
    slotType: 0
  },
  'Blaster': {
    style: 'shot',
    damage: 10,
    elem: 'norm',
    range: 12,
    width: 0.1,
    shotSpeed: 0.5,
    windup: 4,
    execution: 4,
    slotType: 0
  },
  'Arrow': {
    style: 'shot',
    damage: 25,
    elem: 'norm',
    range: 12,
    width: 0.25,
    shotSpeed: 0.3,
    windup: 12,
    execution: 3,
    slotType: 0,
  },

  // SlotType 1

  'Shield': {
    style: 'self',
    damage: 0,
    elem: 'norm',
    shieldHp: 50,
    windup: 9,
    execution: 1,
    slotType: 1
  },
  'Dash': {
    style: 'dash',
    damage: 0,
    elem: 'norm',
    range: 3,
    windup: 0,
    execution: 3 * 3 / refRunSpeed,
    slotType: 1,
    // for calibration travel boost last after dash ends
    selfBoost: { boost: 'travel', amount: 200, duration: 3 * 3 / refRunSpeed }
  },
  'Energize': {
    style: 'self',
    damage: 0,
    elem: 'norm',
    selfBoosts: [
      {boost: 'rate', amount: 15, duration: 3 * 60},
      {boost: 'power', amount: 15, duration: 3 * 60},
    ],
    windup: 3,
    execution: 3,
    slotType: 1
  },
  // for calibration, Power Shot is identical to Blaster in every way but
  // damage and slotType
  'Power Shot': {
    style: 'shot',
    damage: 50,
    elem: 'norm',
    range: 12,
    width: 0.1,
    shotSpeed: 0.5,
    windup: 4,
    execution: 4,
    slotType: 1
  },
  'Freeze': {
    mayMake: true,

    slotType: 1
  },
  'Style Change': {
    isUnique: true,
    /* certain unique powers are coded in-places.
    A navi with Style Change stores up to 3 earned Styles.
    
    Tap: Replaces Q, W, E, and R with available Styles.

    Changing to a Style will change the user's Element
    and all Abilities except Style Change to match
    the navi the Style was earned from.

    The change has no expiration and is not disruptable.
    
    Style Change button is always the user's builtin Style.
    A new Style is granted on KO (the KOd navi)
    or on Assist (the ally who earned the KO).
    Earning a KO or Assist always refreshes Style Changes.

    Re-selecting the currently active Style reduces cooldown to 1 second.

    When 3 earned Styles are held and a new one is earned:
    * if an earned Style is active, it is protected
    * the most-used earned Style is protected
    * The oldest unprotected Style is discarded

    */
    slotType: 1
  },

  // SlotType 2

  // for calibration, Ultra shot is identical to Blaster in every way but
  // damage and slotType
  'Ultra Shot': {
    style: 'shot',
    damage: 300,
    elem: 'norm',
    range: 12,
    width: 0.1,
    shotSpeed: 0.5,
    windup: 4,
    execution: 4,
    reset: 0,
    slotType: 2
  },
  'Slash Wave': {
    style: 'broadshot',
    damage: 150,
    elem: 'norm',
    reuse: { times: 1, within: 60 },
    width: 2.0,
    divisions: 8,
    shotSpeed: 0.2,
    windup: 3,
    execution: 3,
    slotType: 2
  }
}

/*
  CHIPS
  Blast Shot     = Shot + small radius splash
  Blast Shot 2   = Shot + mid radius splash
  Blast Shot 3   = Shot + large radius splash
  Double Strike  = any Attack Special can be recast within 2 second (1 use)
  Double Shield  = any Shield Special can be recast within 2 seconds of expiration (1 use)
  Double Empower = any Empower Special can be recast within 2 seconds
  Double Recover = any Recover Special can be recast within 2 seconds
  Double Ability = any Ability can be recast within 2 seconds (1 use)
  Rapid Fire     = Rate +100 for all Ranged Attack abilities for 2 seconds
  Berserker      = Rate +100 for all Melee Attack abilities for 3 secounds 
  Double Dash    = any Move Special can be recast within 2 seconds (1 use)
  Triple Dash    = any Move Special can be recast within 2 seconds (2 uses)
  Recover 10     = recover 10
  Recover 30     = recover 30
  Recover 50     = recover 50
  Recover 80     = recover 80
  Recover 120    = recover 120
  Recover 150    = recover 150
  Recover 300    = recover 300
  Barrier        = 1-strike barrier (10 second duration)
  Mini Bomb      = Toss small Bomb range 3 dealing 0.5 radius area damage
  Little Bomb    = Toss small Bomb range 3 dealing 1.0 radius area damage
  Big Bomb       = Toss Bomb range 3 dealing 2.0 radius area damage
  Grass Field    = self and surround terrain becomes Grass
  Ice Field      = self and surround terrain becomes Ice
  Fire Field     = self and surround terrain becomes Fire
  Metal Field    = self and surround terrain becomes Metal
  Poison Field   = self and surround terrain becomes Miasma
  Reset Field    = self and surround terrain becomes Normal
  Crack Field    = self and surround terrain becomes Cracked; Cracked become Broken
  Break Field    = self and surround terrain becomes Broken
*/

Object.keys(allAbilsByName).forEach(name => allAbilsByName[name].name = name);

function getAbilByShot(navi, slot) {
  return allAbilsByName(navi.abils[0])
}

function beginCooldownAbil(navi, slot) {
  var abil = getAbilBySlot(navi, slot);
}

function beginCooldownAbil(navi, slot) {
  fullStop("NYI beginCooldownAbil");
}

function registerTapAbil(navi, slot = 0) {
  makeShot(navi);
  beginCooldownAbil(navi, slot);
}

function registerHoldAbil(navi, slot = 0) {
  fullStop("NYI startHoldAbil");
}

function releaseHoldAbil(navi, slot = 0) {
  fullStop("NYI releaseHoldAbil");
  beginCooldownAbil(navi, slot);
}

function makeMinion(startTile, isTeamB) {
  if (!startTile) fullStop("invalid startTile to makeMinion");
  console.log("ran makeMinion")
  return makeThingOnTile(startTile, 'minion', isTeamB, metSpriteData);
}

function makeNavi(name, spriteData, shadowLen, startTile, isTeamB) {
  if (!startTile) fullStop("invalid startTile to makeNavi");
  var navi = makeThingOnTile(startTile, 'navi', isTeamB, spriteData, name);

  // TODO: fix this...
  navi.radius = shadowToRadius(shadowLen);
  navi.pose.spriteData = spriteData;

  navi.decide = {
    code: "S",
    val: 8,
    pat: [],
    idx: 0,
    until: -1
  };
  navi.mem = {
    tileVisits: [],
    tilesSeenHash: {}
  };
  navi.scoreHist = {
    pickups: 0,
    bonks: 0,
    revisits: 0,
    visitedAt: {}
  }

  if (!world.cameraNavi) world.cameraNavi = navi;
  return navi;
}

// function makeCrystalOnTile(tile) {
//   var id = world.nextCrystalId;
//   world.nextCrystalId++;

//   var crysDiv = document.createElement('div');
//   crysDiv.id = `crystal_${id}`;
//   crysDiv.className = "crystal";
//   crysDiv.style.width = "24px";
//   spriteLayer.appendChild(crysDiv);

//   var crystal = {
//     id: id,
//     kind: "crystal",
//     div: crysDiv,
//     onTile: tile,
//     across: 0.5,
//     down: 0.5,
//     radius: shadowToRadius(18),
//   };

//   world.crystals.push(crystal);
//   tile.contents.push(crystal);
//   updateThingSpritePos(crystal);
//   return crystal;
// }

function moveThingToTile(thing, newTile) {
  thing.onTile.contents = without(thing.onTile.contents, thing);
  thing.onTile = newTile;
  thing.onTile.contents.push(thing);

  // if (thing.kind === "navi") {
  //   const visitedAt = thing.scoreHist.visitedAt;
  //   const [i, j] = [thing.onTile.i, thing.onTile.j];
  //   if (i in visitedAt && j in visitedAt[i]) thing.scoreHist.revisits++;
  //   visitedAt[i] ||= {};
  //   visitedAt[i][j] = world.tick;
  
  //   // TODO: exponentiall falloff records of tileVisits here,
  //   // keep tilesSeenHash in sync with tileVisits
  
  //   if (thing.mem.tilesSeenHash[newTile]) {
  //     // revisit handling here
  //     // TODO: prefer to trigger revisit handing BEFORE moving onto the tile
  //     thing.mem.tilesSeenHash[newTile]++;
  //   } else {
  //     thing.mem.tilesSeenHash[newTile] = 1;
  //   }
  // }

  return true;
}

function moveThing(thing, across, down) {
  // this method calls moveThingToTile

  if (thing.speed <= 0) fullStop(`moveNavi speed = ${thing.speed}`);
  if (thing.speed > 1) fullStop("thing speed > 1 tile/tick")
  if (!isRat(thing.across) || !isRat(thing.down))
    fullStop(`across, down not valid ratios: ${thing.across}, ${thing.down}`);

  var radius = Math.min(thing.radius, 0.5);
  var [newAcross, newDown] = [thing.across + across, thing.down + down];
  var signs = [signOrZero(across), signOrZero(down)];
  if (signs[0] !== shifts[thing.facingDir][0] || signs[1] !== shifts[thing
      .facingDir][1])
    fullStop("movement is not forwards");
  var newFront = [newAcross + radius * signs[0], newDown + radius * signs[1]];
  if (newAcross <= -1 || newAcross >= 2) fullStop(
    "movement across-axis >= 1 tile/tick");
  if (newDown <= -1 || newDown >= 2) fullStop(
    "movement down-axis >= 1 tile/tick");
  var isFrontSameIj = [isRat(newFront[0]), isRat(newFront[1])];
  var shift = [isFrontSameIj[0] ? 0 : signs[0], isFrontSameIj[1] ? 0 : signs[
    1]];
  var destTile = getTileAtShift(thing.onTile, shift);

  if (!destTile) return false;
  // permit corner crossing only if at least one edge adjacent tile exists
  if (shift[0] && shift[1]) {
    if (!getTileAtShift(thing.onTile, [shift[0], 0]) && !getTileAtShift(thing
        .onTile, [0, shift[1]]))
      return false;
  }

  // movement is permitted because the FRONT of the thing moves onto a tile;
  // redo shift for the thing's CENTER to place it on the correct tile
  var isCenterSameIj = [isRat(newAcross), isRat(newDown)];
  shift = [isCenterSameIj[0] ? 0 : signs[0], isCenterSameIj[1] ? 0 : signs[1]];
  destTile = getTileAtShift(thing.onTile, shift);
  if (!destTile) throw ("thing center movecheck got invalid tile");
  moveThingToTile(thing, destTile);

  var overlaps = getThingsNaviOverlaps(thing);
  // for now the only cases detected by overlap are crystals, so handle as such
  overlaps.forEach(other => {
    if (thing.kind === "crystal") return pickupCrystal(thing, other);
    console.log(`tick=${world.tick} things overlap: ${thing.name || thing.kind} and ${other.name || other.kind}`);
  });
  [thing.across, thing.down] = [newAcross, newDown].map(x => {
    return x < 0 ? x + 1 : (x < 1 ? x : x - 1);
  });

  if (thing === world.cameraNavi) updateCamera();
  updateThingSpritePos(thing);

  return true;
}

function updateCamera() {
  const camNavi = world.cameraNavi;
  const camCtr = camNavi ? getCenter(camNavi) : canvSize.map(x => x/2);
  var offX = canvSize[0] / 2 + (camCtr[1] - camCtr[0]) * 14;
  var offY = canvSize[1] / 2 + (camCtr[0] + camCtr[1]) * -7;
  worldLayer.style.transform = `translate(${offX}px, ${offY}px)`;
}

function updateThingSpritePos(thing) {
  var ctr = getCenter(thing);
  if (!thing || !thing.div) fullStop("invalid thing to updateThingSpritePos");
  var halfWidth = parseInt(thing.div.style.width) / 2;

  var left = Math.round(14 * (ctr[0] - ctr[1]) - halfWidth);
  var bottom = -7 * (ctr[0] + ctr[1]) - 2.5;

  thing.div.style.left = `${left}px`;
  thing.div.style.bottom =`${bottom}px`;
  thing.div.style.zIndex = `${Math.round((ctr[0] + ctr[1]) * 100)}`;
}

function updateThingSpeed(thing) {
  // TODO: refactor so speed is being set only here
  // speed should be the actual physics value in tiles/tick

  if (!thing.pose === "walk") {
    thing.speed = 0;
    return 0;
  }

  // FOR NOW don't do external vectors or sliding
  // current logic is simplified to assume a thing moves
  // in its facing direction or not at all
  // TODO: external vectors, sliding

  let speed = refRunSpeed;

  thing.effects ||= []; // TODO move this to makeThing
  travelEffs = thing.effects.filter(eff => eff.effect === "travel");
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
  navi.scoreHist.pickups++;
  setTileColor(tile, navi.isTeamB);
  getSurroundTiles(tile).forEach(sTile => setTileColor(sTile, navi.isTeamB));
  playPickupSound(navi);
}

function removeThing(thing) {
  thing.div.remove();
  var tile = thing.onTile;
  tile.contents = without(tile.contents, thing);
  // TODO: collect a list of empty air tiles and remove those
  // which are not needed at the end, to avoid removing tiles still in use
  if (tile.isAir && tile.contents.length === 0) removeTile(tile);
  var kindGroup = thing.kind + 's';
  world[kindGroup] = without(world[kindGroup], thing);
}

function setPose(thing, poseName) {
  if (thing.pose.name === poseName) return "NOOP";
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

function setFacingDir(navi, dir) {
  if (dir === navi.facingDir) return "NOOP";
  navi.facingDir = dir;
  navi.pose.heldWithFacingTks = 1;
  var spriteDataPose = navi.pose.spriteData[navi.pose.name];
  if (spriteDataPose.hasOwnProperty("sizesDirArr")) {
    navi.pose.size = spriteDataPose.sizesDirArr[navi.facingDir];
  }
  updateThingImage(navi);
  return true;
}

function setMinionBackground(minion) {
  if (!(minion.facingDir & 1)) fullStop("no sprites for cardinal facing mets");

  // TODO: unify minion and navi sprite sheet formats
  // use a single sprite sheet for each entity

  console.log("setMinionBackground")
  console.log(minion)

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
    console.log([xVal, yVal]);
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
    style.backgroundPositionX = "0%";
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
  if (tile.isBlue === isToBlue) return "NOOP";
  if (tile.contents.filter(x => x.kind === "navi" && x.isTeamB === !isToBlue).length) return false;
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

  if (world.tick <= 1) updateCamera();

  world.fountains.forEach(fountain => onTickFountain(fountain));

  handleCollisions();
  
  var movers = world.navis.concat(world.minions).concat(world.shots);
  movers.forEach(mover => {
    applyTickToThing(mover);
    if (mover.kind === "navi" && (mover !== world.cameraNavi || !world.isCameraNaviManual))
      updateNaviDecides(mover);
  });

  world.tick++;
  if (world.tick % 6 === 0) {
    var newRF = (world.resonanceFrame + 1) % 8;
    spriteLayer.classList.replace(`resonance-${world.resonanceFrame}`,
      `resonance-${newRF}`);
    world.resonanceFrame = newRF;
  }
  
  // todo: have tiles telegraph better for some # of ticks before flipping
  const flipTks = 120;
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
  if (thing.kind === "navi") return setNaviBackground(thing);
  return setMinionBackground(thing);
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
      setPose(navi, "walk");
      decide.until = world.tick + decide.val / refRunSpeed;
      break;
    case "S":
      setPose(navi, "stand");
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
  const A = sumSqrs(Vab[0], Vab[1]);
  const B = 2 * (Rab[0] * Vab[0] + Rab[1] * Vab[1]);
  const C = sumSqrs(Rab[0], Rab[1]) - radiusSum * radiusSum;
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

// END Functions

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


const metSpriteData = {
  "stand": { nFrames: 1, size: [23, 21] }, // TODO: update, this is wrong (probably?)
  "walk": { nFrames: 6, size: [23, 21], } // 138 x 168
}

fountainStartIjs.forEach((ij, idx) => {
  for (var i = 0; i < 5; i++)
  for (var j = 0; j < 5; j++)
  var tile = getTileAtIj(ij[0], ij[1]);
  makeFountain(tile, idx);
});

deployMinion(world.fountains[0]);

// END Setup

// Keyboard Control

const keyboardDown = {
  ArrowLeft: false,
  ArrowUp: false,
  ArrowRight: false,
  ArrowDown: false,
};

function updateNaviDirectionViaKeyboard(navi) {
  const up = keyboardDown.ArrowUp;
  const down = keyboardDown.ArrowDown;
  const left = keyboardDown.ArrowLeft;
  const right = keyboardDown.ArrowRight;

  if (up && left) setFacingDir(navi, 7);
  else if (up && right) setFacingDir(navi, 1);
  else if (down && left) setFacingDir(navi, 5);
  else if (down && right) setFacingDir(navi, 3);
  else if (up) setFacingDir(navi, 0);
  else if (right) setFacingDir(navi, 2);
  else if (down) setFacingDir(navi, 4);
  else if (left) setFacingDir(navi, 6);
}

function updateNaviSpeedViaKeyboard(navi) {
  navi.speed = Object.values(keyboardDown).some(value => value) ? refRunSpeed : 0;
}

document.addEventListener('keydown', (event) => {
  const manualNavi = world.cameraNavi;
  if (keyboardDown.hasOwnProperty(event.key)) {
      keyboardDown[event.key] = true;
      updateNaviDirectionViaKeyboard(manualNavi);
      updateNaviSpeedViaKeyboard(manualNavi);
  }
});

document.addEventListener('keyup', (event) => {
  const manualNavi = world.cameraNavi;
  if (keyboardDown.hasOwnProperty(event.key)) {
      keyboardDown[event.key] = false;
      updateNaviDirectionViaKeyboard(manualNavi);
      updateNaviSpeedViaKeyboard(manualNavi);
  }
});

// END Keyboard Control

// Create Interval (i.e. Animation Timer)

// var tickIntervalId = window.setInterval(tickLoop, 1000 / 60);

// END Create Interval

// Node Only

// This section does NOT run when the script is linked in an HTML document
// It runs only for testing and helper scripts invoked with node
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = { createWorld };
}

// END Node Only