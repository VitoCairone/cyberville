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

const weakMap = {
  'wood': 'fire',
  'fire': 'aqua',
  'aqua': 'elec',
  'elec': 'wood',
  'norm': 'void',
  'void': 'norm',
  'metal': 'metal',
  'sky': 'sky',
}

const metSpriteData = {
  "stand": { nFrames: 1, size: [23, 21] }, // TODO: update, this is wrong (probably?)
  "walk": { nFrames: 6, size: [23, 21], } // 138 x 168
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

Object.keys(allAbilsByName).forEach(name => allAbilsByName[name].name = name);