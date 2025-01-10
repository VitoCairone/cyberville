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
  'Gun': {
    style: 'shot',
    damage: 10,
    elem: 'norm',
    // TODO: reduce all range 50s to cover ~2/3 of navi vison range
    range: 50,
    width: 0.1,
    shotSpeed: 0.5,
    windup: 4,
    execution: 4,
    slotType: 0
  },
  // 'Arrow': {
  //   style: 'shot',
  //   damage: 25,
  //   elem: 'norm',
  //   range: 50,
  //   width: 0.25,
  //   shotSpeed: 0.3,
  //   windup: 12,
  //   execution: 3,
  //   slotType: 0,
  // },

  // SlotType 1

  // 'Shield': {
  //   style: 'self',
  //   damage: 0,
  //   elem: 'norm',
  //   shieldHp: 50,
  //   windup: 9,
  //   execution: 1,
  //   slotType: 1
  // },
  // 'Dash': {
  //   style: 'dash',
  //   damage: 0,
  //   elem: 'norm',
  //   range: 3,
  //   windup: 0,
  //   execution: 3 * 3 / refRunSpeed,
  //   slotType: 1,
  //   // for calibration travel boost last after dash ends
  //   selfBoost: { boost: 'travel', amount: 200, duration: 3 * 3 / refRunSpeed }
  // },
  // 'Energize': {
  //   style: 'self',
  //   damage: 0,
  //   elem: 'norm',
  //   selfBoosts: [
  //     {boost: 'rate', amount: 15, duration: 3 * 60},
  //     {boost: 'power', amount: 15, duration: 3 * 60},
  //   ],
  //   windup: 3,
  //   execution: 3,
  //   slotType: 1
  // },
  // // for calibration, Power Shot is identical to Blaster in every way but
  // // damage and slotType
  // 'Power Shot': {
  //   style: 'shot',
  //   damage: 50,
  //   elem: 'norm',
  //   range: 50,
  //   width: 0.1,
  //   shotSpeed: 0.5,
  //   windup: 4,
  //   execution: 4,
  //   slotType: 1
  // },
  // 'Freeze': {
  //   mayMake: true,

  //   slotType: 1
  // },
  // 'Style Change': {
  //   isUnique: true,
  //   /* certain unique powers are coded in-places.
  //   A navi with Style Change stores up to 3 earned Styles.
    
  //   Tap: Replaces Q, W, E, and R with available Styles.

  //   Changing to a Style will change the user's Element
  //   and all Abilities except Style Change to match
  //   the navi the Style was earned from.

  //   The change has no expiration and is not disruptable.
    
  //   Style Change button is always the user's builtin Style.
  //   A new Style is granted on KO (the KOd navi)
  //   or on Assist (the ally who earned the KO).
  //   Earning a KO or Assist always refreshes Style Changes.

  //   Re-selecting the currently active Style reduces cooldown to 1 second.

  //   When 3 earned Styles are held and a new one is earned:
  //   * if an earned Style is active, it is protected
  //   * the most-used earned Style is protected
  //   * The oldest unprotected Style is discarded

  //   */
  //   slotType: 1
  // },

  // // SlotType 2

  // // for calibration, Ultra shot is identical to Blaster in every way but
  // // damage and slotType
  // 'Ultra Shot': {
  //   style: 'shot',
  //   damage: 300,
  //   elem: 'norm',
  //   range: 50,
  //   width: 0.1,
  //   shotSpeed: 0.5,
  //   windup: 4,
  //   execution: 4,
  //   reset: 0,
  //   slotType: 2
  // },
  // 'Slash Wave': {
  //   style: 'broadshot',
  //   damage: 150,
  //   elem: 'norm',
  //   reuse: { times: 1, within: 60 },
  //   width: 2.0,
  //   divisions: 8,
  //   shotSpeed: 0.2,
  //   windup: 3,
  //   execution: 3,
  //   slotType: 2
  // }
}

Object.keys(allAbilsByName).forEach(name => allAbilsByName[name].name = name);