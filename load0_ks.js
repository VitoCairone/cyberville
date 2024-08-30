const canvSize = [720, 480];
const refNaviMassKg = 75;
const root2 = Math.sqrt(2);
const twoPi = Math.PI * 2;
const tilesPerMile = 1609.34; // 1 tile === 1 meter moving NW|SW|SE|NE
const ticksPerHour = 60 * 60 * 60;

function mphToTpt(mph) { return mph * tilesPerMile / ticksPerHour; }
function tptToMph(tpt) { return tpt * ticksPerHour / tilesPerMile; }

const refWalkSpeed = mphToTpt(3.1); // ~ 0.023
const refRunSpeed = mphToTpt(7.25); // ~ 0.054

const pickupSoundEl = document.getElementById('pickup-audio');
const bg1SoundEl = document.getElementById('bg-1-audio');

const allSoundEls = [ pickupSoundEl, bg1SoundEl ]

const cameraLayer = document.getElementById('camera-layer');
cameraLayer.style.width = canvSize[0];
cameraLayer.style.height = canvSize[1];
const worldLayer = document.getElementById('world-layer');
const spriteLayer = document.getElementById('sprite-layer');
const tileLayer = document.getElementById('tile-layer');

const dirNames = ['NN', 'NE', 'EE', 'SE', 'SS', 'SW', 'WW', 'NW'];
const shifts = [
  [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]
]
const teamDirs = [5, 1];

function isDiag(shift) { return shift[0] && shift[1]; }

const dirToIjVector = shifts.map(sh => isDiag(sh) ? sh.map(s => s / root2) : sh);
// [ [-0.71, -0.71], [0, 1], [0.71, -0.71], ..., [-1, 0] ]
// each ijVector has a magnitude of 1.0, i.e. covers the same 2D distance

const WOOD_REGEN_ON_GRASS = 1;
const FIRE_DOT = 5;
const FIRE_DOT_DURATION = 20;
const MIASMA_DOT = 1;
const MIASMA_DOT_DURATION = 1;
const ICE_SLOW = 2;
const ELEC_METAL_HASTE = 1;
const METAL_SHIELD = 1;
const MINION_TRAIN_STOCK = 5;
const MINION_TRAIN_INTERVAL = 2 * 60;
const SPAWN_INTERVAL = 5 * 60;
const START_SPAWN_DELAY = 3 * 60;
const SHOT_SPAWN_SEPARATION = 0.1;
const VALID_KINDS = ['navi', 'tower', 'minion', 'shot', 'fountain'];
const REF_HP_BY_KIND = { minion: 30, navi: 500, tower: 1500, fountain: 2500, shot: 1 };
const flipTks = 120;
const refRunFrameHold = 7;

const weakMap = {
  'wood': 'fire', 'fire': 'aqua', 'aqua': 'elec', 'elec': 'wood',
  'norm': 'void', 'void': 'norm', 'metal': 'metal', 'sky': 'sky',
}

const metSpriteData = {
  "stand": { nFrames: 1, size: [23, 21] }, // TODO: update, this is wrong (probably?)
  "walk": { nFrames: 6, size: [23, 21], } // 138 x 168
}