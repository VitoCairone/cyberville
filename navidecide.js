var refVisionRange = 4800; // ~3 miles

// for now we can reasonably assume ALL points are within refVisionRange of each other
// therefor everything at the correct angle and not blocked is visible

// blocking requires a lot of math, so for now we'll just return the closest
// thing within each angle: far-left, left, center, right, and far-right

// =========|=========|=========|=========|=========|=========|=========|=======
/*
    the floormask grid is 6 fwd x 5 long = 30 wide
    since 1 << 30 is always within the safe integer range,
    one number can be used for each binary function on the space:
        isTile, isRed, isBlue
*/

function makeVisionData(navi) {
    var dir = navi.facingDir;
    const vecF = dirToIjVector[dir];
    const vecR = dirToIjVector[(dir + 2) & 7];
	var i, j, tile, bit;
    var isTileMask = 0;
    var tileColorMasks = [0, 0];

    var things = {
        left: null,
        right: null,
        rows: [null, null, null, null, null]
    };

    // PLACEHOLDER/TODO
    function closestTo(list, pt) { return list.length ? list[0] : null; }
    // PLACEHOLDER/TODO
    function isAInFrontOfB(a, b) { return true; }

    i, j = getCenter(navi);
    var contents;
    var thing;
    for (var fwd = 0, linIdx = 0; fwd < 6; fwd++) {
        for (var rit = -2; rit <= 2; rit++) {
            tile = getTileAt(
                Math.floor(i + vecF[0] * fwd + vecR[0] * rit),
                Math.floor(j + vecF[1] * fwd + vecR[1] * rit)
            );
            if (tile) {
                bit = 1 << linIdx;
                isTileMask |= bit;
                tileColorMasks[tile.isBlue] |= bit;
                contents = tile.contents || [];
                if (!fwd && rit === 0) contents = without(contents, navi);
                if (contents.length) {
                    thing = closestTo(contents, getCenter(navi));
                    if (fwd) {
                        if (!things.rows[rit + 2]) things.rows[rit + 2] = things; 
                    } else  {
                        if (rit < 0) {
                            things.left = thing;
                        } else if (rit > 0 && !things.right) {
                            things.right = thing;
                        } else {
                            if (isAInFrontOfB(thing, navi)) things.rows[2] = thing;
                        }
                    }
                }
            }
            linIdx++;
        }
    }

    return {
        isTileMask: isTileMask,
        tileColorMasks: tileColorMasks,
        things: things,
    }
}