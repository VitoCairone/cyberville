// return time in units = time units of input velocity
function whenWillCirclesCollide(circleA, circleB, aRad, bRad, Va, Vb) {
  
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

function doCirclesOverlap(aCtr, bCtr, aRad, bRad) {
  var [dx, dy] = [aCtr[0] - bCtr[0], aCtr[1] - bCtr[1]];
  var radSum = aRad + bRad;
  return sumSqrs(dx, dy) < radSum * radSum;
}

function doThingsOverlap(a, b) {  
  return doCirclesOverlap(getCenter(a), getCenter(b), a.radius, b.radius);
}
  
function whenWillThingsCollideTk(a, b) {
  return whenWillCirclesCollide(getCenter(a), getCenter(b), a.radius, b.radius,
    getVel(a), getVel(b));
}

// returns [float, float] or null
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

function separateOverlappers(a, b) {
  // Ideally collision handling should prevent any overlaps
  // so this function should never have to run
  console.log("WARNING: called separateOverlappers");

  if (a.isCollideHalted || b.isCollideHalted) return false;

  const Rab = [getCenter(a)[0] - getCenter(b)[0], getCenter(a)[1] - getCenter(b)[1]];
  const sepL2 = sumSqrs(Rab[0], Rab[1]);
  const sepL = Math.sqrt(sepL2);
  const radSum = a.radius + b.radius;

  const sepUnitVec = Rab.map(val => val / sepL);
  const missingL = radSum - sepL;
  var moveVec = sepUnitVec.map(val => val * missingL * 1.01);

  moveThing(a, moveVec[0] / 2, moveVec[1] / 2, true);
  moveThing(b, -moveVec[0] / 2, -moveVec[1] / 2, true);
}

function getPlantedIUJs(thing, atDx = 0, atDy = 0) {
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

  thing.plantedIUJs = isPlanted ? iujs : null;

  return iujs;
}

function tileBasedCollisions() {
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
    }

    [a, b].forEach(thing => thing.isCollideHalted = true);
  });
}