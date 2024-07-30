const canvSize = [720, 480];
const refNaviMassKg = 75;
const root2 = Math.sqrt(2);
const twoPi = Math.PI * 2;
const tilesPerMile = 1609.34; // 1 tile === 1 meter moving NW|SW|SE|NE
const ticksPerHour = 60 * 60 * 60;

function mphToTpt(mph) { return mph * tilesPerMile / ticksPerHour; }
function tptToMph(tpt) { return tpt * ticksPerHour / tilesPerMile; }

const refWalkSpeed = mphToTpt(3.1);
const refRunSpeed = mphToTpt(7.25);

const pickupSoundEl = document.getElementById('pickup-audio');
const big1SoundEl = document.getElementById('bg-1-audio');

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

function isDiag(shift) { return shift[0] && shift[1]; }

const dirToIjVector = shifts.map(sh => isDiag(sh) ? sh.map(s => s / root2) : sh);
// [ [-0.71, -0.71], [0, 1], [0.71, -0.71], ..., [-1, 0] ]
// each ijVector has a magnitude of 1.0, i.e. covers the same 2D distance