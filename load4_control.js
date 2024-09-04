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
  q: false, // quick abil
  w: false, // special abil 1
  e: false, // special abil 2
  r: false  // ultimate abil
};

// TODO: right-click pathing should
// override and create simulated arrow keys input;
// assume Driving not supported on Mobile for now

function updateNaviAbilsViaKeyboard(navi) {
  if (!navi.abilTriggers) {
    navi.abilTriggers = [1, 1, 1, 1].map(x => {
      return {isDown: false, sinceTk: -1, priorStateHeld: 0};
    });
  }
  ['q', 'w', 'e', 'r'].forEach((key, slot) => {
    var abilTrigger = navi.abilTriggers[slot];
    var isDown = keyboardDown[key];
    if (abilTrigger.isDown != isDown) {
      abilTrigger.isDown = isDown;
      abilTrigger.priorStateHeld = (world.tick - abilTrigger.sinceTk - 1);
      abilTrigger.sinceTk = world.tick;

      if (isDown) {
        // TODO: queue Delayed, with proper cancel handing,
        // for registerHold
      } else {
        // this is currently no different from binding only to keyup
        // but will be needed when we also register holds
        registerTapAbil(world.cameraNavi, slot);
      }
    }
  });
}

function updateNaviDirectionViaKeyboard(navi) {
  const up = keyboardDown.ArrowUp;
  const down = keyboardDown.ArrowDown;
  const left = keyboardDown.ArrowLeft;
  const right = keyboardDown.ArrowRight;

  // TODO: buffer these somewhat so that a manual navi moving grid-aligned
  // should end up standing facing the same way even if the buttons are not
  // released on precisely the same tick

  if (up && left) setFacingDir(navi, 7);
  else if (up && right) setFacingDir(navi, 1);
  else if (down && left) setFacingDir(navi, 5);
  else if (down && right) setFacingDir(navi, 3);
  else if (up) setFacingDir(navi, 0);
  else if (right) setFacingDir(navi, 2);
  else if (down) setFacingDir(navi, 4);
  else if (left) setFacingDir(navi, 6);
}

const ARROW_KEYS = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];

function updateNaviSpeedViaKeyboard(navi) {
  setPose(navi, ARROW_KEYS.some(key => keyboardDown[key]) ? "walk" : "stand");
}

document.addEventListener('keydown', (event) => {
  const manualNavi = world.cameraNavi;
  if (keyboardDown.hasOwnProperty(event.key)) {
      world.isCameraNaviManual = true;
      keyboardDown[event.key] = true;
      updateNaviDirectionViaKeyboard(manualNavi);
      updateNaviSpeedViaKeyboard(manualNavi);
      updateNaviAbilsViaKeyboard(manualNavi);
  }
});

document.addEventListener('keyup', (event) => {
  const manualNavi = world.cameraNavi;
  if (keyboardDown.hasOwnProperty(event.key)) {
      keyboardDown[event.key] = false;
      updateNaviDirectionViaKeyboard(manualNavi);
      updateNaviSpeedViaKeyboard(manualNavi);
      updateNaviAbilsViaKeyboard(manualNavi);
  }
});