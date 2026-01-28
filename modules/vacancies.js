/**
 * OneVR Vacancies Module
 * Expected turnr per weekday for LKF Malmö
 */
(function() {
  'use strict';

  console.log('[OneVR] Vacancies module starting...');

  // Ensure OneVR namespace exists
  if (!window.OneVR) {
    console.error('[OneVR] OneVR namespace missing! Creating it...');
    window.OneVR = {};
  }

  // Turlista för LKF Malmö
  // Index: 0=sön, 1=mån, 2=tis, 3=ons, 4=tor, 5=fre, 6=lör
  var LKF_MALMO = {
    // Söndag
    0: [
      "17101", "17102", "17103", "17104", "17105", "17106", "17107", "17108", "17109", "17110",
      "17130", "17131", "17171A", "17171B", "17172A", "17172B",
      "17201", "17202", "17203", "17204", "17205", "17206", "17207", "17208", "17209", "17210",
      "17211", "17212", "17213", "17214", "17215", "17216", "17217", "17218", "17219", "17220",
      "17221", "17222", "17223", "17224", "17225", "17226", "17227", "17228", "17229", "17230",
      "17231", "17232", "17233", "17234", "17235", "17281", "17291", "17292", "17293"
    ],
    // Måndag
    1: [
      "11101", "11102", "11103", "11104", "11105", "11106", "11107", "11108", "11109", "11110",
      "11111HB", "11112", "11113HB", "11114", "11115", "11116", "11117",
      "11171", "11171A", "11171B", "11172A", "11172B", "11173A",
      "11201", "11202", "11203", "11204", "11205", "11207", "11208", "11209", "11210",
      "11211", "11212", "11213", "11214", "11215", "11216", "11218", "11219HB", "11220",
      "11221", "11222", "11223", "11224", "11225", "11226", "11227", "11228", "11229", "11230",
      "11231", "11232", "11233", "11271", "11275", "11281", "11282", "11291", "11292", "11293"
    ],
    // Tisdag
    2: [
      "12101", "12103", "12104", "12105", "12106", "12107", "12108HB", "12109", "12110HB",
      "12111", "12112", "12113", "12114", "12115",
      "12171A", "12171B", "12172", "12172A", "12172B", "12173A", "12173B",
      "12201", "12202", "12203", "12204", "12205", "12206", "12207", "12208", "12209", "12210",
      "12211", "12212", "12213", "12214HB", "12215HB", "12216", "12217", "12218", "12219", "12220",
      "12221", "12222", "12224", "12225", "12226", "12227", "12229", "12230", "12231",
      "12271", "12272", "12281", "12282", "12291", "12292", "12293"
    ],
    // Onsdag
    3: [
      "12101", "12102", "12103", "12104", "12105", "12106", "12107", "12108HB", "12109", "12110HB",
      "12111", "12112", "12113", "12114", "12115",
      "12171A", "12171B", "12172", "12172A", "12172B", "12173A", "12173B",
      "12201", "12202", "12203", "12204", "12205", "12206", "12207", "12208", "12209", "12210",
      "12211", "12212", "12213", "12214HB", "12215HB", "12216", "12217", "12218", "12219", "12220",
      "12221", "12222", "12224", "12225", "12226", "12227", "12229", "12230", "12231",
      "12271", "12272", "12281", "12282", "12291", "12292", "12293"
    ],
    // Torsdag
    4: [
      "12101", "12102", "12103", "12104", "12105", "12106", "12107", "12108HB", "12109", "12110HB",
      "12111", "12112", "12113", "12114", "12115",
      "12171A", "12171B", "12172A", "12172B", "12173A", "12173B",
      "12201", "12202", "12203", "12204", "12205", "12206", "12207", "12208", "12209", "12210",
      "12211", "12212", "12213", "12214HB", "12215HB", "12216", "12217", "12218", "12219", "12220",
      "12221", "12222", "12223", "12224", "12225", "12226", "12227", "12228", "12229", "12230", "12231",
      "12275", "12281", "12282", "12292", "12293"
    ],
    // Fredag
    5: [
      "12281", "12282", "12291", "12292", "12293",
      "15101", "15102", "15103", "15104", "15105", "15106", "15107", "15108", "15109", "15110",
      "15111", "15112", "15113", "15171A", "15171B", "15172A", "15172B", "15173A", "15173B",
      "15201", "15202", "15203", "15204", "15205", "15206", "15207", "15208", "15209", "15210",
      "15211", "15212", "15213", "15214", "15215", "15216", "15217", "15218", "15219", "15220",
      "15221", "15222", "15223", "15224", "15225", "15226", "15227", "15228", "15229", "15230",
      "15231", "15232", "15233"
    ],
    // Lördag
    6: [
      "16102", "16103", "16104", "16105", "16106", "16108", "16109",
      "16171A", "16171B", "16172A", "16172B", "16173B", "16174", "16178", "16179", "16180", "16181",
      "16201", "16202", "16203", "16204", "16205", "16206", "16207", "16208", "16209", "16210",
      "16211", "16212", "16213", "16214", "16215", "16216", "16217", "16218", "16219", "16220",
      "16221", "16222", "16223", "16224", "16225", "16226", "16227", "16281", "16291", "16292", "16293"
    ]
  };

  /**
   * Normalize turnr by removing location suffixes (HB, etc.)
   * "11111HB" -> "11111"
   * "12171A" -> "12171A" (A/B are part of the turn, not location)
   */
  function normalizeTurnr(turnr) {
    if (!turnr) return '';
    // Remove HB suffix (Helsingborg temporary assignment)
    return turnr.trim().replace(/HB$/i, '');
  }

  /**
   * Get expected turnr for a given date
   * @param {string} isoDate - Date in YYYY-MM-DD format
   * @param {string} role - Role (e.g. 'LF')
   * @param {string} location - Location (e.g. 'Malmö')
   * @returns {string[]} Array of expected turnr
   */
  function getExpectedTurnr(isoDate, role, location) {
    var date = new Date(isoDate);
    var weekday = date.getDay(); // 0=sön, 1=mån, etc.

    if (role === 'LKF' && location === 'Malmö') {
      return LKF_MALMO[weekday] || [];
    }

    return [];
  }

  /**
   * Find vacancies (missing turnr) for current data
   * @param {Object[]} people - Array of person objects
   * @param {string} isoDate - Current date
   * @param {string} role - Role filter
   * @param {string} location - Location filter
   * @returns {Object} { expected: [], current: [], vacancies: [] }
   */
  function findVacancies(people, isoDate, role, location) {
    var expected = getExpectedTurnr(isoDate, role, location);

    // Get current turnr from filtered people (normalized)
    var currentSet = {};
    people.forEach(function(p) {
      if (p.badge === role && p.locName === location && p.turnr && p.turnr !== '-') {
        var normalized = normalizeTurnr(p.turnr);
        currentSet[normalized] = true;
      }
    });

    var current = Object.keys(currentSet);

    // Find vacancies (expected but not in current, using normalized comparison)
    var vacancies = expected.filter(function(t) {
      var normalizedExpected = normalizeTurnr(t);
      return !currentSet[normalizedExpected];
    });

    return {
      expected: expected,
      current: current,
      vacancies: vacancies
    };
  }

  // Export to global namespace
  window.OneVR.vacancies = {
    getExpectedTurnr: getExpectedTurnr,
    findVacancies: findVacancies,
    data: {
      LKF_MALMO: LKF_MALMO
    }
  };

  console.log('[OneVR] Vacancies loaded, window.OneVR.vacancies =', window.OneVR.vacancies);
  console.log('[OneVR] OneVR keys:', Object.keys(window.OneVR));
})();
