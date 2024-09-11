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
    scores: [0, 0]
    // TODO: investigate weird behavior of isCameraNaviManual
    // manual control halts proto, even though there is nowhere that sets
    // this value true, and it continues to change directions
  };
  return world;
}

function makeMinion(startTile, isTeamB) {
  if (!startTile) fullStop("invalid startTile to makeMinion");
  // console.log("ran makeMinion")
  // TODO: fix radius
  return makeThingOnTile(startTile, 'minion', 0.3, isTeamB, metSpriteData);
}
  
function makeNavi(name, spriteData, shadowLen, startTile, isTeamB) {
  if (!startTile) fullStop("invalid startTile to makeNavi");
  var radius = shadowToRadius(shadowLen);
  var navi = makeThingOnTile(startTile, 'navi', radius, isTeamB, spriteData, name);
  if (!navi) return navi;
  navi.pose.spriteData = spriteData;
  navi.decide = {
    code: "S",
    val: 8,
    pat: [],
    idx: 0,
    until: -1
  };
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
//     radius: shadowToRadius(18),
//   };

//   world.crystals.push(crystal);
//   tile.contents.push(crystal);
//   updateThingSpritePos(crystal);
//   return crystal;
// }

function makeGoal(tile, isTeamB) {
  if (!tile) fullStop("invalid tile to makeGoal");
  tile.isGoal = true;
  tile.isTeamB = isTeamB; // TODO: use method here to ensure proper div update
  tile.div.classList.add("goal");
}

function makeShot(navi, radius = 0.1, collideDamage = 1, sweepDuration = 0) {
  var xy = getCenter(navi);
  var vec = dirToIjVector[navi.facingDir];

  // sweeps (used for melee) are centered on the edge of the navi
  // while other shots are spawned non-overlapping points
  var dist = navi.radius;
  if (!sweepDuration) dist += radius + SHOT_SPAWN_SEPARATION;
  xy = [xy[0] + vec[0] * dist, xy[1] + vec[1] * dist];

  var tile = getTileAtIj(Math.floor(xy[0]), Math.floor(xy[1]));
  console.log([tile.i, tile.j]);
  
  var shot = makeThingOnTile(tile, 'shot', radius, navi.isTeamB);
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


  shot.div.style.width = "7px";
}

function makeThingOnTile(startTile, kind, radius, isTeamB, spriteData = null, name = null) {
  if (!VALID_KINDS.includes(kind)) fullStop("invalid kind to makeThingOnTile");
  if (!startTile) fullStop("invalid startTile to makeThingOnTile");

  // TODO: use the occupancy map already constructed/updated on every tick
  // during tileBasedCollisions() to reduce extra work here
  const newCtr = [startTile.i + 0.5, startTile.j + 0.5];
  const mayPlace = !isVolumousKind(kind) || getVolumousThings().every(other => {
    return !doCirclesOverlap(newCtr, getCenter(other), radius, other.radius);
  });
  if (!mayPlace) {
    console.log(`WARNING: could not place ${name || kind} on ${[startTile.i, startTile.j]} due to overlap.`)
    return null;
  };

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
    radius: radius,
    speed: 0,
    x: startTile.i + 0.5,
    y: startTile.j + 0.5,
    facingDir: isTeamB ? 1 : 5,
    onTile: startTile,
    isTeamB: isTeamB
  };

  if (name) thing.name = name;

  // startTile.contents.push(thing);
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

function makeFountain(startTile, isTeamB) {
  if (!startTile) fullStop("invalid startTile to makeFountain");
  if (world.fountains && world.fountains[isTeamB ? 1 : 0]) fullStop("reduntant call to makefountain");
  // if (startTile.contents.length) {
  //   console.log(startTile);
  //   fullStop("occupied startTile to makefountain");
  // }

  return makeThingOnTile(startTile, 'fountain', 0.495, isTeamB);
}