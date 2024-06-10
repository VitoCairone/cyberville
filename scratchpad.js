//  a file for notes and saved methods that are not used

/*
    TARGET RULES: these are some basic rules for the most basic world
	1. run to most near crystal
	2. run to most near frontier
    3. run to the center of the nearest opponent-colored 3x3 and stand there for 30 seconds
    4. run to the nearest opponent-colored tile and stand there for 6 seconds
    5. run forward for 6 seconds
*/

/*

    run : expect <to|towards|away from|with|in front of|behind|alongside>
    run to : plan a path to the specified place and run until reaching it
        if can't plan a path, default to go toward
    run toward : run in the direction of the specified place
        for the specified time, until reaching it, or until no
        path is available that goes towards the place
    
    the: expect a single item

    QUALIFIERS

    most [<metric>] <selector> : returns the single item within the
        selector group having the highest value of the metric specified or implied
    least [<metric>] <selector> : returns the single item witinh the
        selector group having the lowest value of the metric specified or implied
    <ally|opponent> : returns a selector group filtered on
        items (navis/tiles) which are of the specified team color

    METRICS

    far         -> path distance to placable things (farthest; near/nearest)
    distant     -> as-the-crow-flies distance to placable thing (; close/closest)
    wide        -> radius (widest; thin/thinnest)
    tall        -> height (tallest; short/shortest)
    fast        -> speed (fastest; slow/slowest)
    big         -> height * rad * rad (biggest; small/smallest)

    SELECTORS

    navi     -> navis NOT INCLUDING self
    navii    -> navis including self
    region   -> regions (places)
    tile     -> tiles (places)
    thing    -> things (excluding places)
    object   -> things (excluding places & navis)
    place    -> places
    crystal  -> crystals
    

things:
    redTile
    blueTile
    noTile
    crystal


// [720px, 480px] diagonal / 2 = 21 tiles
// a navi in the center of a 3-row can see across 3 rows to the edge of 1 row
// therefor, on the edge a navi can see 2 rows of a 3-row over a 3-row gap

var terrainAheadArr = [
    "BrBrBrBrBrBrBrBrBrBrB",
    "_____________________",
    "_____________________",
    "_____________________",
    "BrBrBrBrBrBrBrBrBrBrB",
    "rBrBrBrBrBrBrBrBrBrBr",
    "?rBrBrBrBrBrBrBrBrBrB",
    "_____________________",
    "_____________________",
    "_____________________",
    "BrBrBrBrBrBrBrBrBrBrB"
];

function look() {
    // returns the tile the navi is on plus 20 tiles forward (= 21)
    // for the current row and 7 rows lateral each way (= 15)
    // = 315 places in vision
}

var moversAheadArr = [
    { 
        isAppearing: false,
        type: 'mover', 
        desc: descFor()
    }
];
var crystalsAheadArr = [
    { 
        isAppearing: false,
        type: 'crystal',
        at: [3.1, 3.] // at: tiles forward, tiles lateral (- left, + right)
    }
]

objects: [{
    gapsAhead:
    gapsLateral: {

    }
}]


function makeMe(myName, myDesc) {
	return {
		types: ['navi'],
		nextObserveId: 0,
		nextModelId: 1, // self id == 1
        inputHistoryLL:
        lastInputHistoryNode: 
		observes: {
            0: { nothing }
			0: { type: 'navi', id: 3, desc: myDesc}
		},
		things: {
			0: { type: 'nothing', id: 0, name: "nothing", desc: "nothing" },
			// everything is the container for everywhere, therefor the first
			// non-place container for any thing not within a larger thing
			1: { type: 'everything', id: 1, name: "everything", desc: "everything", contents: [2] },
			2: { type: 'place', id: 2, descy: "everywhere", desc: "everywhere", contents: [3] },
			3: { type: 'navi', id: 3, name: myName, desc: myDesc, within: 2 },
		},

		decide: {
			pat: ['F5', 'R1', 'F6', 'R1', 'F7', 'R1', 'F8', 'R1', 'F9', 'R1'],
			idx: 0
		},
	}
}

function observe(me, naviInputs) {

}


// ruleMethods
/*

SELECTORS

modelSets = Visible|Audible|Observed|Seen|Heard|InScene|OutScene|Known
    default = InScene

modelType = Thing|Mover|Navi|Crystal|Tile|Place

COMMANDS

<walk|run>[<N>][<To(##)|Toward(##)>]
turn[<N>][<To(##)|Toward(##)>]

TRUTHINESS:
    FALSY: null, 0, #0
    TRUTHY: everything else (note: [] or {} are truthy)
    // TODO: reavaluate practical benefits of truthy vs falsy empty list/hash

CONSTANTS
srt2 = Math.sqrt(2);
srt3 = Math.sqrt(3);
srt5 = Math.sqrt(5);
srt7 = Math.sqrt(7);
crt2 = Math.pow(2, 1/3);
crt3 = Math.pow(3, 1/3);
crt5 = Math.pow(5, 1/3);
crt7 = Math.pow(7, 1/3);
frt5 = Math.pow(5, 1/5);

PURE FUNCTIONS
non-number arguments to numerical functions
are always treated as the truthiness of the argument (1 or 0)


// TODO: check for ability to parse remainder of IDs as int
function isId(a) { return isString(a) && a[0] === "#" && a.length >= 2 };

function isStr(a) { return typeof a === "string"; }
function isArrlk(a) { // is array-like (true for empty)
    try { return a.length > -1; } catch (err) { return false; }
}
function isPArrlk(a) { // is present array-like (false for empty)
    try { return a.length > 0; } catch (err) { return false; }
}
function isNum(a) {
    var n = parseFloat(a);
    return n || n === 0 || n === -0;
}
function isNeg(a) {
    return a && isNum(a) ? a < 0 : isId(a) ? a[1] === "-" : isPArrlk(a) && a[0] === "-" : false;
}
function isId(a) {
    if (!a || typeof a !== string || a.length < 2 || a[0] !== '#') return false;
    var num = parseFloat(a.slice(1));
    return Number.isInteger(num) ? (num >= 0 ? 1 : -1) : false;
}
function flipSign(a) {
    function negArrlk(a) {
        try {
            return "-" + a;
        } catch (err) {
            try { return ["-"].concat(a); } catch (err2) { return a; }
        }
    }

    if (!a) return a;
    if isNum(a) return -a;
    if isId(a) {
        if (a[1] === "-") return "#" + a.slice(2);
        return "#-" + a.slice(1);
    } else if (isPArrlk(a)) {
        if (a[0] === "-") {
            if (a.length === 1) return isStr(a) ? "+" : ["+"];
            try { return a.slice(1); } catch (err) { return a; }
        } else if (a[0] === "+") {
            if (a.length === 1) return isStr(a) ? "-" : ["-"];
            try { return negArrlk(a.slice(1)); } catch (err) { return a; }
        }
        return negArrlk(a);
    }
    return a;
}

function asNum(a) {
    if (isNum(a)) return parseFloat(a);
    if (isId(a)) {
        if (a === "#0" || a === "#-0") return 0;
        return isNeg(a) ? -1 : 1;
    }
    return a ? (isNeg(a) ? -1 : 1) : 0;
}

const fnLists = [
    ["t", "!", "s", "-", "sqr", "abs", "len"],
    ["+", "*", "/", "/d", "%", "=", ">", ">=", "b^", "b&", "b|", "L2"],
]

const fnLib = {
    "t": function(a) {},
    "!": function(a) {},
    "s": function(a) {},
    "-": function(a) {},
    "sqr" function(a) {},
    "abs" function(a) {},
    "len" function(a) {},
}


t   a => { return a ? 1 : 0; }
!   a => { return a ? 0 : 1; }
s   a => { return a ? (isNeg(a) ? -1 : 1) : 0; }
-   a => { return a ? flipSign(a) : a; }
sqr a => { var f = asNum(a); return f * f; }
abs a => { return isNeg(a) ? flipSign(a) : a }
len a => { return isArrlk(a) ? a.length : -1 }
rgs a => split pair a into two args

// trig functions use lookup tables for the 8 directions
// inverse trig functions return the nearest of the 8 directions
// for the given inputs

// NOTE: remove extended arg syntax for now and make everything
// take exactly one or two arguments

+  a, b ... => sum of arguments
    when IDs or ID lists are part of the argument,
        removes the ID from the 'anticounted' set if present and adds 1
        otherwise places it in the 'counted' set and adds 1 or 0:
        repeat positive IDs already 'counted' do not change the sum
    For any negative ID:
        removes the ID from the 'counted' set if present and adds -1
        otherwise places it in the 'anticounted' set and adds -1 or 0:
        repeat negative IDs alreaady 'anticounted' do not change the sum
*  a, b ... => product of arguments
    short-circuits on encountering 0
/  a, b ... => a / b / c etc. (int)
    divide-by-zero results in
        positive / 0 => Infinity
        0 / 0 => ERROR (kill rule)
        negative / 0 => -Infinity
/d a b ... => a / b / c etc. (decimal)
     divide-by-zero same rules as /
%  a b ... => a % b % c etc.
=  a b ... => 1 if all arguments are equal, otherwise 0
    short-circuits on first inequality
|  a b ... => return first truthy value, otherwise 0
    short-circuits on first truthy value
&  a b ... => return 1 if all values are truthy, otherwise 0
    short-circuits on first falsy value
>  a b ... => returns 1 if a > b > c etc, otherwise 0
>= a b ... => returns 1 if a >= b >= c etc, otherwise 0
b^ a b ... => returns a bitwise-XOR b (bitwise-XOR c, etc)
b| a b ... => returns a bitwise-OR b, (bitwise-OR c, etc)
b& a b ... => returns a bitwise-AND b (bitwise-AND c, etc)
    short-circuits on evaluation to 0
L2 a b ... => a * a + b * b
rot a b ... => returns direction a + b (+c etc), => int in [0 -> 7]
    {
        var rv = Math.round(a + b);
        // TODO: verify these are correct and check % of - to simplify
        if (rv < 0) return rv + (Math.floor(-rv / 8) + 1) * 8;
        if (rv >= 8) return rv % 8;
        return rv;
    }

FLOW CONTROL
(   open frame
)   close frame
?   a b [_ c] => returns b if a is truthy, otherwise c or null
_   extend argument list
.   end extend argument list

me

ROLES: all roles can potentially overlap or be null
target can be anything, including self or null
all others must be navi or null and cannot be me

companion : default first ally | null
rival : default first opponent | null
target[<Thing|Navi|Place>] : default [null, me, here]
mentor : default null
ward : default null
here
nearest[<N>][<modelSet>][modelType]
farthest[<N>][<modelSet>][modelType]
first[<N>][<modelSet>][modelType]
last[<N>][<modelSet>][<modelType]


*/