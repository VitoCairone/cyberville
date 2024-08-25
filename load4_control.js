function updateNaviDecides(navi) {
  if (!navi || navi.kind !== "navi")
    return fullStop("invalid navi to updateNaviDecides");
  if (navi === world.cameraNavi && world.isCameraNaviManual) return;

  var decide = navi.decide;
  if (world.tick < decide.until) return;
  
  var newAct = decide.pat[decide.idx];
  decide.idx = (decide.idx + 1) % decide.pat.length;
  decide.code = newAct[0];
  decide.val = parseFloat(newAct.slice(1));
  if (decide.code === "L" || decide.code === "R") {
    // for current simplicy setFacingDir orders should drain instantly
    // can assume L and R will never directly follow, even on wraparound
    setFacingDir(navi, Math.round(navi.facingDir + 8 + decide.val * (decide.code === "R" ? 1 : -1)) % 8);

    newAct = decide.pat[decide.idx];
    decide.idx = (decide.idx + 1) % decide.pat.length;
    decide.code = newAct[0];
    decide.val = parseFloat(newAct.slice(1));
  }
  if (decide.code === "L" || decide.code === "R") fullStop("L/R follows L/R in navi decides");
  switch (navi.decide.code) {
    case "F":
      setPose(navi, "walk");
      decide.until = world.tick + decide.val / refRunSpeed;
      break;
    case "S":
      setPose(navi, "stand");
      decide.until = world.tick + decide.val * 60;
      break;
  }
}

// Keyboard Control

const keyboardDown = {
  ArrowLeft: false,
  ArrowUp: false,
  ArrowRight: false,
  ArrowDown: false,
};

function updateNaviDirectionViaKeyboard(navi) {
  const up = keyboardDown.ArrowUp;
  const down = keyboardDown.ArrowDown;
  const left = keyboardDown.ArrowLeft;
  const right = keyboardDown.ArrowRight;

  if (up && left) setFacingDir(navi, 7);
  else if (up && right) setFacingDir(navi, 1);
  else if (down && left) setFacingDir(navi, 5);
  else if (down && right) setFacingDir(navi, 3);
  else if (up) setFacingDir(navi, 0);
  else if (right) setFacingDir(navi, 2);
  else if (down) setFacingDir(navi, 4);
  else if (left) setFacingDir(navi, 6);
}

function updateNaviSpeedViaKeyboard(navi) {
  setPose(navi, Object.values(keyboardDown).some(value => value) ? "walk" : "stand");
}

document.addEventListener('keydown', (event) => {
  const manualNavi = world.cameraNavi;
  if (keyboardDown.hasOwnProperty(event.key)) {
      world.isCameraNaviManual = true;
      keyboardDown[event.key] = true;
      updateNaviDirectionViaKeyboard(manualNavi);
      updateNaviSpeedViaKeyboard(manualNavi);
  }
});

document.addEventListener('keyup', (event) => {
  const manualNavi = world.cameraNavi;
  if (keyboardDown.hasOwnProperty(event.key)) {
      keyboardDown[event.key] = false;
      updateNaviDirectionViaKeyboard(manualNavi);
      updateNaviSpeedViaKeyboard(manualNavi);
  }
});