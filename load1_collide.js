let g_fastMode = false;

let g_testsPassed = 0;
let g_testsRan = 0;
let g_testsFailed = 0;

function assert(cond, failMsg, doCount = true) {
  if (g_fastMode) return;

  if (doCount) g_testsRan++;
  if (cond) {
    if (doCount) g_testsPassed++;
  } else {
    console.log(failMsg);
    if (doCount) g_testsFailed++;
  }
}

const AT_BOOL = 1;
const AT_OBJ = 2;
const AT_ARR = 3;
const AT_ARR2 = 4;
const AT_ARR3 = 5;
const AT_STR = 6;
const AT_NUM = 7;
const AT_INT = 8;
const AT_VEC2 = 9;
const AT_VEC3 = 10;
const AT_IVEC2 = 11;
const AT_IVEC3 = 12;
const OR_NULL = 100;


function assertArgTypes(args, argTypes, callerName = null) {
  if (g_fastMode) return;

  if (args.length && !argTypes || args.length > argTypes.length) {
    console.log(`ERR: too many args ${callerName}`);
    return;
  }

  if (argTypes.length > args.length)
    for (var i = args.length; i < argTypes.length; i++)
      if (argTypes[i] < OR_NULL) {
        console.log(`ERR: not enough args ${callerName}`);
        return;
      }

  const failMsg = `type fail ${callerName}`;
  Array.from(args).forEach((arg, idx) => {
    if (arg === null && argTypes[idx] >= OR_NULL) return;
    switch(argTypes[idx] % OR_NULL) {
      case AT_BOOL:
        assert(!arg || arg === true || arg === 1, failMsg, false);
        break;
      case AT_OBJ:
        assert(typeof arg === "object" && !Array.isArray(arg), failMsg, false);
        break;
      case AT_ARR:
        assert(Array.isArray(arg), failMsg, false);
        break;
      case AT_ARR2:
        assert(Array.isArray(arg) && arg.length === 2, failMsg, false);
        break;
      case AT_ARR3:
        assert(Array.isArray(arg) && arg.length === 3, failMsg, false);
      case AT_STR:
        assert(typeof arg === "string", failMsg, false);
        break;
      case AT_NUM:
        assert(typeof arg === "number", failMsg, false);
        break;
      case AT_INT:
        assert(Number.isInteger(arg), failMsg, false);
        break;
      case AT_VEC2:
        assert(Array.isArray(arg) && arg.length === 2 && arg.every(v => typeof v === "number"), failMsg, false);
        break;
      case AT_VEC3:
        assert(Array.isArray(arg) && arg.length === 3 && arg.every(v => typeof v === "number"), failMsg, false);
        break;
      case AT_IVEC2:
        assert(Array.isArray(arg) && arg.length === 2 && arg.every(v => Number.isInteger(v)), failMsg, false);
        break;
      case AT_IVEC3:
        assert(Array.isArray(arg) && arg.length === 3 && arg.every(v => Number.isInteger(v)), failMsg, false);
        break;
      default: console.log(`ERR: unknown argType spec in ${callerName}`);
    }
  })
}

// return time in units = time units of input velocities
// any present overlap returns 0
function whenWillCirclesCollide(circleA, circleB, aRad, bRad, Va, Vb) {
  assertArgTypes(arguments, [AT_VEC2, AT_VEC2, AT_NUM, AT_NUM, AT_VEC2, AT_VEC2],
    "whenWillCirclesCollide");

  // Relative position
  const Rab = [circleB[0] - circleA[0], circleB[1] - circleA[1]];
  
  const radiusSum = aRad + bRad;
  const radSumSqr = radiusSum * radiusSum;
  const ctrDistL2 = sumSqrs(Rab[0], Rab[1]);

  const C = ctrDistL2 - radSumSqr;
  if (C <= 0) return 0;

  // Relative velocity
  const Vab = [Vb[0] - Va[0], Vb[1] - Va[1]];

  const A = sumSqrs(Vab[0], Vab[1]);
  const B = 2 * (Rab[0] * Vab[0] + Rab[1] * Vab[1]);
  
  var soln = solveQuadratic(A, B, C);
  if (!soln || !soln.some(val => val >= 0)) return Infinity;
  return Math.min(...soln.filter(val => val >= 0));
}

function test_whenWillCirclesCollide() {
  assert(whenWillCirclesCollide([0, 0], [0, 0], 1, 1, [0, 0], [0, 0]) === 0, "whenWillCirclesCollide 0");
  assert(whenWillCirclesCollide([5, 12], [6, 13], 2, 2, [0, 0], [0, 0]) === 0, "whenWillCirclesCollide 1");
}

function doCirclesOverlap(aCtr, bCtr, aRad, bRad) {
  assertArgTypes(arguments, [AT_VEC2, AT_VEC2, AT_NUM, AT_NUM],
    "doCirclesOverlap");
  var [dx, dy] = [aCtr[0] - bCtr[0], aCtr[1] - bCtr[1]];
  var radSum = aRad + bRad;
  return sumSqrs(dx, dy) < radSum * radSum;
}

function doThingsOverlap(a, b) {  
  assertArgTypes(arguments, [AT_OBJ, AT_OBJ],
    "doThingsOverlap");
  return doCirclesOverlap(getCenter(a), getCenter(b), a.radius, b.radius);
}
  
function whenWillThingsCollideTk(a, b) {
  assertArgTypes(arguments, [AT_OBJ, AT_OBJ],
    "whenWillThingsCollideTk");
  return whenWillCirclesCollide(getCenter(a), getCenter(b), a.radius, b.radius,
    getVel(a), getVel(b));
}

// returns [float, float] or null
function solveQuadratic(A, B, C) {
  assertArgTypes(arguments, [AT_NUM, AT_NUM, AT_NUM],
    "solveQuadratic");
  if (A === 0) return B === 0 ? (C === 0 ? [0, 0] : null) : [-C / B, -C / B];
  if (C === 0) return [-B / A, 0];
  const discriminant = B * B - 4 * A * C;
  if (discriminant < 0) return null;
  const sqrtDiscriminant = Math.sqrt(discriminant);
  const t1 = (-B - sqrtDiscriminant) / (2 * A);
  const t2 = (-B + sqrtDiscriminant) / (2 * A);
  return [t1, t2];
}

function separateOverlappers(a, b) {
  assertArgTypes(arguments, [AT_OBJ, AT_OBJ],
    "separateOverlappers");
  // Ideally collision handling should prevent any overlaps
  // so this function should never have to run
  console.log("WARNING: called separateOverlappers");

  if (a.isCollideHalted || b.isCollideHalted) return false;

  const Rab = [getCenter(a)[0] - getCenter(b)[0], getCenter(a)[1] - getCenter(b)[1]];
  const sepL2 = sumSqrs(Rab[0], Rab[1]);
  const sepL = Math.sqrt(sepL2);
  const radSum = a.radius + b.radius;

  const missingL = radSum - sepL;
  // The offset vector (Rab) is divided by sepL
  // to create a normal vector in the offset direction, 
  // multiplied by missingL to create a vector of magnitude missingL,
  // and 1% added to ensure no overlap.
  const moveVec = Rab.map(val => val * missingL / sepL * 1.01);

  moveThing(a, moveVec[0] / 2, moveVec[1] / 2, true);
  moveThing(b, -moveVec[0] / 2, -moveVec[1] / 2, true);
}

function getPlantedIUJs(thing, atDx = 0, atDy = 0) {
  assertArgTypes(arguments, [AT_OBJ, AT_NUM + OR_NULL, AT_NUM + OR_NULL],
    "getPlantedIUJs");
  let [cx, cy] = getCenter(thing);
  cx += atDx;
  cy += atDy;
  let rad = thing.radius;
  let loHiXY = [[cx - rad, cy - rad], [cx + rad, cy + rad]];
  let loHiIJ = loHiXY.map(pt => pt.map(c => Math.floor(c)));
  let plantedIUJs = [];

  for (var i = loHiIJ[0][0]; i <= loHiIJ[1][0]; i++) {
    for (var j = loHiIJ[0][1]; j <= loHiIJ[1][1]; j++) {
      plantedIUJs.push(`${i}_${j}`);
    }
  }

  return plantedIUJs;
}

function getSweepIUJs(thing) {
  assertArgTypes(arguments, [AT_OBJ],
    "getSweepIUJs");
  const [vx, vy] = getVel(thing);
  const isPlanted = (vx == 0 && vy == 0);
  if (isPlanted && thing.plantedIUJs) return thing.plantedIUJs;

  const [cx, cy] = getCenter(thing);
  const rad = thing.radius;
  let [xLo, yLo, xHi, yHi] = [cx - rad, cy - rad, cx + rad, cy + rad];
  xLo = Math.min(xLo, xLo + vx);
  yLo = Math.min(yLo, yLo + vy);
  xHi = Math.max(xHi, xHi + vx);
  yHi = Math.max(yHi, yHi + vy);
  let [iLo, jLo, iHi, jHi] = [xLo, yLo, xHi, yHi].map(val => Math.floor(val));

  const iujs = [];
  for (let i = iLo; i <= iHi; i++)
    for (let j = jLo; j <= jHi; j++)
      iujs.push(`${i}_${j}`);

  // TODO: refactor tileBasedCollision to do this on planted list only
  thing.plantedIUJs = isPlanted ? iujs : null;

  return iujs;
}

function tileBasedCollisions() {
  assertArgTypes(arguments, null,
    "tileBasedCollisions");
  var collisions = [];
  var stills = world.towers; // exclude fountains for now
  var movers = world.navis.concat(world.minions).concat(world.shots);

  var allThings = stills.concat(movers).filter(x => x);
  var thingsByIUJ = {};

  allThings.forEach(thing => {
    // TODO: because we already check when moving navis acquire new occupancy
    // in order to keep them constrained to tiles, we could extend that logic
    // so that occupancy is only updated when it changes instead of
    // being re-calculated here for every moving thing every tick
    var freeSweepIUJs = getSweepIUJs(thing);

    var tested = {};
    freeSweepIUJs.forEach(iuj => {
      if (thingsByIUJ[iuj]) {
        thingsByIUJ[iuj].filter(prior => !tested[prior]).forEach(prior => {
          var collideTk = whenWillThingsCollideTk(thing, prior);
          if (collideTk <= 1) collisions.push([prior, thing, collideTk]);
          tested[prior] = true;
        });
        thingsByIUJ[iuj].push(thing);
      } else {
        thingsByIUJ[iuj] = [thing];
      }
    });
  });

  return collisions;
}
  
function handleCollisions() {
  assertArgTypes(arguments, null,
    "handleCollisions");
  var collisions = tileBasedCollisions();
  
  // TODO: prevent an object from 'ghost colliding' with a second object
  // if it already bounced off of a third object in the middle
  if (collisions.length === 1) {
    console.log(`one collision on tick ${world.tick}`);
  } else if (collisions.length > 1) {
    collisions.sort((a, b) => a[2] - b[2]); // sort ascending by time
    console.log(`${collisions.length} collisions on tick ${world.tick}`);
    console.log(collisions);
  }

  collisions.forEach(coll => {
    var [a, b, timeToCollide] = coll;

    if (timeToCollide > 0) {
      [a, b].forEach(thing => {
        // advance almost to almost point of impact
        if (thing.speed > 0) moveThing(thing, ...getVel(thing, timeToCollide * 0.99));
      });
    } else {
      console.log("WARN: called separateOverlappers in handleCollisions");
      return separateOverlappers(a, b);
    };

    if (b.kind === 'shot' && a.kind !== 'shot') {
      // shot hits non-shot
      if (b.isMelee) {
        b.struck ||= [];
        if (!b.struck.includes(a) && a !== b.maker) {
          impartDamage(a, b.collideDamage);
          b.struck.push(a);
        }
      } else {
        if (a.kind === "minion") {
          removeThing(a);
        } else {
          impartDamage(a, b.collideDamage);
        }
        removeThing(b);
      }
    } else if (b.kind !== 'shot') {
      // no shot involved
      if (a.speed && b.speed && a.facingDir === b.facingDir) {
        var faster = a.speed > b.speed ? a : b;
        setFacingDir(faster, (faster.facingDir + 4) % 8);
        // [a, b].forEach(thing => {
        //   moveThing(thing, ...getVel(thing, 1 - timeToCollide));
        // });
      } else {
        [a, b].forEach(thing => {
          if (thing.speed > 0) {
            // console.log(`${thing.name || thing.kind} before: ${thing.facingDir}`);
            setFacingDir(thing, (thing.facingDir + 4) % 8);
            // console.log(`${thing.name || thing.kind} after: ${thing.facingDir}`);
            // moveThing(thing, ...getVel(thing, 1 - timeToCollide));
          };
        });
      }
    } else {
      // shot vs shot -- currently ignored (pass through)
    }

    [a, b].forEach(thing => thing.isCollideHalted = true);
  });
}

// this block runs only when the file is invoked on the node command line,
// not in the browser.
if (typeof window === "undefined") {
  // TODO: import this properly from _fns file or move to this one
  function sumSqrs(a, b) { return a * a + b * b; }

  test_whenWillCirclesCollide();
  console.log(`Tests ran ${g_testsRan}`);
  console.log(`Tests passed ${g_testsPassed}`);
  console.log(`Tests failed ${g_testsFailed}`);
}