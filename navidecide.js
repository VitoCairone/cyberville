function look(navi) {
	var shift = shifts[navi.facingDir];
	var naviIj = getCenter(navi).map(x => Math.floor(x));
	var shiftL = shifts[(navi.facingDir + 6) & 7];
	var shiftR = shifts[(navi.facingDir + 2) & 7];

	var i, j, wid;
	var edgeIj = naviIj.map((x, idx) => x + shiftL[idx]);
	var rows = [];

	if (shift[0] && shift[1]) {
		for (var fwd = 0; fwd < 9; fwd++) {
			i, j = edgeIj;
			wid = fwd & 1 ? 5 : 3;
			rows.push([]);
			for (var rit = 0; rit < wid; rit++) {
				rows[fwd].push(seePlaceAs(navi, i, j, fwd, rit));
				i += shiftR[0], j += shiftR[1];
			}
			edgeIj = (fwd & 1) ?
				[edgeIj[0],  edgeIj[1] + shift[1]]
				: [edgeIj[0] + shift[0], edgeIj[1]];
		}
	} else {
		wid = 5;
		for (var fwd = 0; fwd < 6; fwd++) {
			i, j = edgeIj;
			rows.push([]);
			for (var rit = 0; rit < wid; rit++) {
				rows[fwd].push(seePlaceAs(navi, i, j, fwd, rit));
				i += shiftR[0], j += shiftR[1];
			}
			edgeIj = edgeIj.map((x, idx) => x + shift[idx]);
		}
	}
}