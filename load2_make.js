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
    // TODO: investigate weird behavior of isCameraNaviManual
    // manual control halts proto, even though there is nowhere that sets
    // this value true, and it continues to change directions
  };
  return world;
}

function makeMinion(startTile, isTeamB) {
  if (!startTile) fullStop("invalid startTile to makeMinion");
  // console.log("ran makeMinion")
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

function makeFountain(startTile, isTeamB) {
  if (!startTile) fullStop("invalid startTile to makeFountain");
  if (world.fountains && world.fountains[isTeamB]) fullStop("reduntant call to makefountain");
  if (startTile.contents.length) {
    console.log(startTile);
    fullStop("occupied startTile to makefountain");
  }

  return makeThingOnTile(startTile, 'fountain', isTeamB);
}