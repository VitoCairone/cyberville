function whenWillCirclesCollide(circleA, circleB, aRad, bRad, Va, Vb) {
    // method return time units = time units of input velocity denominators
    
    // Relative velocity
    const Vab = [Vb[0] - Va[0], Vb[1] - Va[1]];
    // Relative position
    const Rab = [circleB[0] - circleA[0], circleB[1] - circleA[1]];
    
    const radiusSum = aRad + bRad;
    const radSumSqr = radiusSum * radiusSum;
    const A = sumSqrs(Rab[0], Rab[1]);
    if (A < radSumSqr) return 0;
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
    if (collisions.length === 1) {
      console.log("one collision this tick");
    } else if (collisions.length > 1) {
      collisions.sort((a, b) => a[2] - b[2]); // sort ascending by time
      console.log(`WARN: multiple collisions handled in tick ${world.tick}`);
      console.log(collisions);
    }
    
    collisions.forEach(coll => {
      var [a, b, timeToCollide] = coll;
  
      // if (timeToCollide === 0) return; // TODO: re-evaluate how this should be handled
      // and note that there is already a direct overlap check every tick
  
      // advance to point of impact
      // TODO: when time == 0, backtrack to eliminate overlap first
      if (timeToCollide > 0) [a, b].forEach(thing => {
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
        if (a.speed && b.speed && a.facingDir === b.facingDir) {
          var faster = a.speed > b.speed ? a : b;
          faster.facingDir = (faster.facingDir + 4) % 8;
          [a, b].forEach(thing => {
            moveThing(thing, ...getVel(thing, 1 - timeToCollide));
          });
        }
        [a, b].forEach(thing => {
          if (thing.speed > 0) {
            thing.facingDir = (thing.facingDir + 4) % 8;
            moveThing(thing, ...getVel(thing, 1 - timeToCollide));
          };
        });
      }
    });
  }