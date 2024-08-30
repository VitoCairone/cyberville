function whenWillCirclesCollide(circleA, circleB, aRad, bRad, Va, Vb) {
  // method return time units = time units of input velocity denominators
  
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

  if (!soln) return Infinity;
  var [t1, t2] = soln;
  return t1 >= 0 && t2 >= 0 ? Math.min(t1, t2) : t1 >= 0 ? t1 : t2 >= 0 ? t2 :
    Infinity;
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
  // velocity for a thing is in tiles/tick so this returns ticks
  return whenWillCirclesCollide(getCenter(a), getCenter(b), a.radius, b.radius,
    getVel(a), getVel(b));
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

function separateOverlappers(a, b) {
  console.log("called NYI separateOverlappers");
  // const Rab = [getCenter(a)[0] - getCenter(b)[0], getCenter(a)[1] - getCenter(b)[1]];
  
  // // TODO: perform all free movements first and check space
  // // being moved into to ensure that separated things aren't
  // // moved onto occupied space

  // const didMoveA = moveThing(a, Rab[0] / 1.99, Rab[1] / 1.99);
  // const didMoveB = moveThing(b, Rab[0] / -1.99, Rab[1] / -1.99);

  // if (didMoveA && !didMoveB) {
    
  // }
}

function tileBasedCollisions() {
  var collisions = [];
  var stills = world.towers; // exclude fountains for now
  var movers = world.navis.concat(world.minions).concat(world.shots);

  var allThings = stills.concat(movers).filter(x => x);
  var thingsByTile = {};

  allThings.forEach(thing => {
    var freeSweepTiles = getTilesForSweep(thing);

    var tested = {};
    freeSweepTiles.forEach(tile => {
      if (!tile) return fullStop("tile error in tileBasedCollisions");
      var tileKey = `${tile.i}_${tile.j}`;

      if (thingsByTile[tileKey]) {
        var priors = thingsByTile[tileKey].filter(prior => !tested[prior]);
        priors.forEach(prior => {
          tested[prior] = true;
          var collideTk = whenWillThingsCollideTk(thing, prior);
          // if (collideTk <= 0) fullStop(`collideTk=${collideTk}`);
          if (collideTk <= 1) collisions.push([prior, thing, collideTk]);
        });
        thingsByTile[tileKey].push(thing);
      }
      thingsByTile[tileKey] = [thing];
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
      return separateOverlappers(a, b);
    };

    // if (b.kind === 'shot' && a.kind !== 'shot') {
    //   if (b.isMelee) {
    //     b.struck ||= [];
    //     if (!b.struck.includes(a) && a !== b.maker) {
    //       impartDamage(a, b.collideDamage);
    //       b.struck.push(a);
    //     }
    //   } else {
    //     impartDamage(a, b.collideDamage);
    //     removeThing(b);
    //   }
    // } else if (b.kind !== 'shot') {
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
    // }
  });
}