// Test suite for planner.js. Run with:  node --test planner.suite.test.js
const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const planner = require("./planner.js");
const { calculateStudyDays, validateInputs, generateStudyPlan, findTopicProblems } = planner;

// ---------- test data ----------
const AREAS = [
  ["Describe cloud concepts", "cloud"],
  ["Describe Azure architecture and services", "arch"],
  ["Describe Azure management and governance", "gov"],
];
const AREA_NAMES = AREAS.map(([a]) => a);
const makeTopics = (perArea) =>
  AREAS.flatMap(([area, prefix]) =>
    Array.from({ length: perArea }, (_, i) => ({ id: `${prefix}-${i + 1}`, area, name: `${prefix} topic ${i + 1}`, tip: "" }))
  );
const TOPICS = makeTopics(8); // 24 topics
const TODAY = "2026-10-22";

// ---------- helpers ----------
const addDays = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const codes = (list) => list.map((x) => x.code);
const plan = (days, hours, weak = [], topics = TOPICS) => generateStudyPlan(addDays(TODAY, days), hours, weak, topics, TODAY);
const daysOfType = (p, type) => [...new Set(p.filter((s) => s.sessionType === type).map((s) => s.dayNumber))].sort((a, b) => a - b);
const learningTypes = ["learning", "topic-practice"];
const hoursForArea = (p, area) => p.filter((s) => learningTypes.includes(s.sessionType) && s.area === area).reduce((t, s) => t + s.totalHours, 0);

// Rules every successful plan must follow
function assertPlanRules(result, days, hours) {
  assert.equal(result.success, true, `expected success: ${JSON.stringify(result.errors)}`);
  const exam = addDays(TODAY, days);
  const perDay = new Map();
  for (const s of result.plan) {
    for (const f of ["date", "dayNumber", "topic", "tasks", "totalHours", "sessionType", "area"]) {
      assert.ok(s[f] !== undefined && s[f] !== null && s[f] !== "", `session missing ${f}`);
    }
    assert.ok(!s.tasks.join(" ").includes("undefined"), `a task mentions "undefined": ${s.tasks}`);
    assert.ok(s.date < exam, `${s.date} is not before the exam (${exam})`);
    assert.notEqual(s.date, exam);
    assert.equal(s.date, addDays(TODAY, s.dayNumber - 1));
    perDay.set(s.dayNumber, (perDay.get(s.dayNumber) || 0) + s.totalHours);
  }
  for (const [day, total] of perDay) assert.ok(total <= hours, `day ${day}: ${total}h exceeds ${hours}h`);
  assert.equal(perDay.size, days, "every study day should have a session");
  assert.equal(Math.max(...perDay.keys()), days);
}

// ===========================================================================
describe("1. Date calculations and invalid dates", () => {
  test("today counts as a study day and the exam date is excluded", () => {
    assert.deepEqual(calculateStudyDays("2026-10-23", TODAY), { ok: true, days: 1 });
    assert.deepEqual(calculateStudyDays("2026-10-29", TODAY), { ok: true, days: 7 });
    const r = plan(7, 2);
    assert.equal(r.plan[0].dayNumber, 1);
    assert.equal(r.plan[0].date, TODAY, "day 1 must be today");
    assert.equal(r.plan.at(-1).date, "2026-10-28", "last study day is the day before the exam");
    assert.ok(r.plan.every((s) => s.date !== "2026-10-29"), "nothing on the exam date");
  });

  test("exam today or in the past is rejected", () => {
    for (const exam of [TODAY, "2026-10-21", "2020-01-01"]) {
      const r = calculateStudyDays(exam, TODAY);
      assert.equal(r.ok, false);
      assert.equal(r.code, "EXAM_NOT_IN_FUTURE");
    }
  });

  test("invalid exam dates are rejected", () => {
    const bad = ["2026-02-30", "2026-13-01", "2026-00-10", "2026-04-31", "2026-02-29", "abc", "", "2026-1-5", null, undefined, 20261029, new Date("x")];
    for (const exam of bad) {
      const r = calculateStudyDays(exam, TODAY);
      assert.equal(r.ok, false, `accepted ${String(exam)}`);
      assert.equal(r.code, "INVALID_EXAM_DATE");
    }
  });

  test("invalid 'today' is reported separately", () => {
    for (const today of ["nope", null, new Date("x"), 5]) {
      assert.equal(calculateStudyDays("2026-10-29", today).code, "INVALID_TODAY_DATE");
    }
  });

  test("leap days, month ends and year ends", () => {
    assert.equal(calculateStudyDays("2028-03-01", "2028-02-28").days, 2);
    assert.equal(calculateStudyDays("2027-03-01", "2027-02-28").days, 1);
    assert.equal(calculateStudyDays("2027-01-02", "2026-12-30").days, 3);
    assert.equal(calculateStudyDays("2026-12-01", "2026-11-30").days, 1);
  });

  test("a Date object works for 'today', even late in the evening", () => {
    assert.equal(calculateStudyDays("2026-10-29", new Date(2026, 9, 22, 23, 59)).days, 7);
    assert.equal(calculateStudyDays("2026-10-29", new Date(2026, 9, 22, 0, 1)).days, 7);
  });
});

// ===========================================================================
describe("2. Invalid hours and topic IDs", () => {
  const hoursCases = [
    [-1, "HOURS_TOO_LOW"], [0, "HOURS_TOO_LOW"], ["0", "HOURS_TOO_LOW"],
    [12.01, "HOURS_TOO_HIGH"], [13, "HOURS_TOO_HIGH"], [100, "HOURS_TOO_HIGH"],
    [NaN, "INVALID_HOURS"], [Infinity, "INVALID_HOURS"], ["abc", "INVALID_HOURS"], ["", "INVALID_HOURS"],
    [null, "INVALID_HOURS"], [undefined, "INVALID_HOURS"], [true, "INVALID_HOURS"], [[2], "INVALID_HOURS"],
    [0.1, "HOURS_TOO_LOW_FOR_PLAN"],
  ];
  for (const [hours, code] of hoursCases) {
    test(`hours ${JSON.stringify(hours) ?? String(hours)} -> ${code}`, () => {
      const r = plan(10, hours);
      assert.equal(r.success, false);
      assert.deepEqual(r.plan, []);
      assert.ok(codes(r.errors).includes(code), `got ${codes(r.errors)}`);
    });
  }

  test("hours boundaries 0.25 and 12 are accepted", () => {
    assertPlanRules(plan(10, 12), 10, 12);
    assertPlanRules(plan(10, 0.25), 10, 0.25);
  });

  test("invalid weak topic IDs are rejected and listed", () => {
    for (const bad of ["nope", "CLOUD-1", " cloud-1", "", 42, null, {}]) {
      const r = plan(14, 2, ["cloud-1", bad]);
      assert.equal(r.success, false);
      assert.deepEqual(codes(r.errors), ["INVALID_TOPIC_ID"]);
    }
    assert.ok(plan(14, 2, ["nope", "also-fake"]).errors[0].message.includes("nope, also-fake"));
    assert.deepEqual(codes(plan(14, 2, "cloud-1").errors), ["INVALID_WEAK_TOPICS"]);
    assert.deepEqual(codes(plan(14, 2, null).errors), ["INVALID_WEAK_TOPICS"]);
  });

  describe("malformed topic data (never undefined names or areas)", () => {
    const good = { id: "ok-1", area: "Area A", name: "Fine topic" };
    const malformed = {
      "null entry": null,
      "missing name": { id: "a", area: "X" },
      "missing area": { id: "a", name: "A" },
      "missing id": { name: "A", area: "X" },
      "empty id": { id: "", name: "A", area: "X" },
      "numeric id": { id: 1, name: "A", area: "X" },
      "blank name": { id: "a", name: "   ", area: "X" },
      "string instead of object": "cloud-1",
      "array instead of object": [],
    };
    for (const [label, bad] of Object.entries(malformed)) {
      test(`${label} -> INVALID_TOPIC_DATA (no crash, with or without weak IDs)`, () => {
        for (const weak of [[], ["ok-1"]]) {
          const r = generateStudyPlan(addDays(TODAY, 14), 2, weak, [good, bad], TODAY);
          assert.equal(r.success, false);
          assert.deepEqual(codes(r.errors), ["INVALID_TOPIC_DATA"]);
          assert.ok(r.errors[0].message.includes("topic #2"), r.errors[0].message);
        }
      });
    }

    test("the message is capped for long lists, and valid data passes", () => {
      const r = generateStudyPlan(addDays(TODAY, 14), 2, [], Array(8).fill(null), TODAY);
      assert.ok(r.errors[0].message.includes("and 3 more"));
      assert.deepEqual(findTopicProblems(TOPICS), []);
      assert.deepEqual(findTopicProblems([]), []);
    });

    test("'tip' is optional", () => {
      const noTips = TOPICS.map(({ tip, ...rest }) => rest);
      assertPlanRules(generateStudyPlan(addDays(TODAY, 14), 2, [], noTips, TODAY), 14, 2);
    });

    test("validateInputs on its own does not crash on a null topic entry", () => {
      const v = validateInputs(addDays(TODAY, 14), 2, ["a"], TODAY, [{ id: "a" }, null]);
      assert.equal(v.valid, true);
    });
  });
});

// ===========================================================================
describe("3. Empty and duplicate weak-topic selections", () => {
  test("empty selection gives normal priority to everything", () => {
    const r = plan(30, 2, []);
    assertPlanRules(r, 30, 2);
    assert.ok(r.plan.filter((s) => learningTypes.includes(s.sessionType)).every((s) => s.isWeak === false));
  });

  test("omitting the argument behaves like an empty list", () => {
    assert.deepEqual(generateStudyPlan(addDays(TODAY, 14), 2, undefined, TOPICS, TODAY), plan(14, 2, []));
  });

  test("duplicates are treated as a single selection", () => {
    const once = plan(14, 2, ["cloud-1"]);
    assert.deepEqual(plan(14, 2, ["cloud-1", "cloud-1", "cloud-1"]), once);
    assert.deepEqual(validateInputs(addDays(TODAY, 14), 2, ["gov-1", "gov-1", "arch-2"], TODAY, TOPICS).values.weakTopics, ["gov-1", "arch-2"]);
  });

  test("multiple weak topics are scheduled first and get more time", () => {
    const weak = ["gov-8", "cloud-2", "arch-5"];
    const r = plan(14, 3, weak);
    assertPlanRules(r, 14, 3);
    const firstThree = r.plan.filter((s) => s.sessionType === "learning").slice(0, 3).map((s) => s.topicId);
    assert.deepEqual(firstThree, ["cloud-2", "arch-5", "gov-8"]);
    const hours = (id) => r.plan.filter((s) => s.topicId === id).reduce((t, s) => t + s.totalHours, 0);
    for (const id of weak) assert.ok(hours(id) > hours("cloud-1"));
    assert.ok(hours("cloud-1") >= 0.25, "normal topics are not neglected");
  });
});

// ===========================================================================
describe("4. 30-day, 7-day and 3-day preparation periods", () => {
  test("30 days, 2h/day", () => {
    const r = plan(30, 2, ["cloud-3"]);
    assertPlanRules(r, 30, 2);
    assert.deepEqual(r.warnings, []);
    assert.deepEqual(daysOfType(r.plan, "final-review"), [30]);
    assert.deepEqual(daysOfType(r.plan, "practice-exam"), [29]);
    assert.deepEqual(daysOfType(r.plan, "cumulative-revision"), [7, 14, 21, 28]);
  });

  test("7 days, 2h/day", () => {
    const r = plan(7, 2);
    assertPlanRules(r, 7, 2);
    assert.deepEqual(r.warnings, []);
    assert.deepEqual(daysOfType(r.plan, "practice-exam"), [6]);
    assert.deepEqual(daysOfType(r.plan, "final-review"), [7]);
    assert.deepEqual(daysOfType(r.plan, "cumulative-revision"), []);
  });

  test("3 days, 2h/day: area mode with warnings, no practice exam", () => {
    const r = plan(3, 2);
    assertPlanRules(r, 3, 2);
    assert.deepEqual(codes(r.warnings).sort(), ["COVERAGE_REDUCED", "NO_PRACTICE_EXAM", "SHORT_PREPARATION"]);
    assert.deepEqual(daysOfType(r.plan, "final-review"), [3]);
    assert.deepEqual(daysOfType(r.plan, "practice-exam"), []);
  });

  test("3 days, 4h/day: enough time for every topic", () => {
    const r = plan(3, 4);
    assertPlanRules(r, 3, 4);
    assert.deepEqual(codes(r.warnings).sort(), ["NO_PRACTICE_EXAM", "SHORT_PREPARATION"]);
    assert.equal(new Set(r.plan.filter((s) => s.topicId).map((s) => s.topicId)).size, 24);
  });
});

// ===========================================================================
describe("5. Daily hour limits and exam-date exclusion", () => {
  test("sweep: plan length x daily hours x weak selection", () => {
    let count = 0;
    for (const days of [1, 2, 3, 5, 7, 9, 10, 14, 21, 22, 30, 60]) {
      for (const hours of [0.25, 0.5, 1, 1.3, 2, 4, 12]) {
        for (const weak of [[], ["cloud-1"], ["cloud-1", "arch-2", "gov-3"]]) {
          assertPlanRules(plan(days, hours, weak), days, hours);
          count++;
        }
      }
    }
    assert.equal(count, 12 * 7 * 3);
  });

  test("a fractional limit is never exceeded (1.3h -> at most 1.25h)", () => {
    const r = plan(10, 1.3);
    const perDay = {};
    r.plan.forEach((s) => (perDay[s.dayNumber] = (perDay[s.dayNumber] || 0) + s.totalHours));
    assert.ok(Math.max(...Object.values(perDay)) <= 1.25);
  });
});

// ===========================================================================
describe("6. Knowledge-area coverage and warnings", () => {
  test("with sufficient time, every topic and every area is covered in each phase", () => {
    const r = plan(30, 2, ["gov-1"]);
    assert.equal(new Set(r.plan.filter((s) => s.topicId).map((s) => s.topicId)).size, 24);
    for (const type of ["learning", "cumulative-revision", "final-review"]) {
      const areas = new Set(r.plan.filter((s) => s.sessionType === type).map((s) => s.area));
      assert.deepEqual([...areas].sort(), [...AREA_NAMES].sort(), `${type} misses an area`);
    }
    assert.deepEqual(r.warnings, []);
  });

  test("short on time: still touches every area, with a clear warning", () => {
    const r = plan(7, 1);
    assertPlanRules(r, 7, 1);
    assert.deepEqual(codes(r.warnings), ["COVERAGE_REDUCED"]);
    const areas = new Set(r.plan.filter((s) => s.sessionType === "learning").map((s) => s.area));
    assert.deepEqual([...areas].sort(), [...AREA_NAMES].sort());
  });

  test("area mode shares time by area size (a bigger area gets more)", () => {
    const topics = [
      ...Array.from({ length: 10 }, (_, i) => ({ id: `b${i}`, area: "Big", name: `Big ${i}` })),
      ...Array.from({ length: 2 }, (_, i) => ({ id: `s${i}`, area: "Small", name: `Small ${i}` })),
    ];
    const r = plan(3, 1, [], topics);
    assertPlanRules(r, 3, 1);
    assert.equal(hoursForArea(r.plan, "Big"), 1.5);
    assert.equal(hoursForArea(r.plan, "Small"), 0.5);
  });

  test("area mode gives extra time to an area containing a weak topic", () => {
    const mk = (area, n) => Array.from({ length: n }, (_, i) => ({ id: `${area}${i}`, area, name: `${area} ${i}` }));
    const r = plan(3, 1, ["B0"], [...mk("A", 6), ...mk("B", 6)]);
    assertPlanRules(r, 3, 1);
    assert.ok(hoursForArea(r.plan, "B") > hoursForArea(r.plan, "A"));
    assert.equal(r.plan[0].area, "B", "the weak area comes first");
  });

  test("area mode names weak topics even when the area only gets 15 minutes", () => {
    const r = plan(1, 0.75, ["gov-3"]); // 3 quarters of learning time, 3 areas
    assertPlanRules(r, 1, 0.75);
    const gov = r.plan.find((s) => s.area === AREA_NAMES[2]);
    assert.equal(gov.totalHours, 0.25);
    assert.ok(gov.tasks.join(" ").includes("gov topic 3"));
  });

  test("not enough time for every area: warning names the areas and the weak topics left out", () => {
    const r = plan(1, 0.25, ["cloud-1", "arch-1", "gov-1"]);
    assertPlanRules(r, 1, 0.25);
    const w = r.warnings.find((x) => x.code === "COVERAGE_INCOMPLETE");
    assert.ok(w, `got ${codes(r.warnings)}`);
    assert.ok(w.message.includes(AREA_NAMES[1]) && w.message.includes(AREA_NAMES[2]));
    assert.ok(w.message.includes("arch topic 1") && w.message.includes("gov topic 1"));
    assert.ok(!w.message.includes("cloud topic 1"), "the covered weak topic must not be listed as left out");
    assert.deepEqual([...new Set(r.plan.map((s) => s.area))], [AREA_NAMES[0]]);
    assert.ok(codes(r.warnings).includes("NO_FINAL_REVIEW"));
  });

  test("final review and revision days warn when they cannot cover every area", () => {
    const r = plan(14, 0.25);
    assertPlanRules(r, 14, 0.25);
    assert.ok(codes(r.warnings).includes("FINAL_REVIEW_PARTIAL"));
    assert.ok(codes(r.warnings).includes("REVISION_PARTIAL"));
    const finalWarning = r.warnings.find((w) => w.code === "FINAL_REVIEW_PARTIAL");
    assert.ok(finalWarning.message.includes(AREA_NAMES[1]) && finalWarning.message.includes(AREA_NAMES[2]));
  });

  test("the revision warning appears once even with several revision days", () => {
    const r = plan(30, 0.25);
    assert.equal(codes(r.warnings).filter((c) => c === "REVISION_PARTIAL").length, 1);
  });

  test("no warnings at all when there is plenty of time", () => {
    assert.deepEqual(plan(30, 3).warnings, []);
  });
});

// ===========================================================================
describe("7. Weekly revision scheduling and conflicts with special sessions", () => {
  // Written independently of the implementation: what SHOULD be a revision day for N study days.
  function expectedRevisionDays(n) {
    const days = [];
    if (n >= 21) for (let d = 7; d <= n - 4; d += 7) days.push(d); // weekly, never in the last 3 reserved days or the day before
    if (n >= 10) days.push(n - 2); // the revision day before the practice exam
    return days;
  }

  test("revision days match the rule for every plan length from 1 to 120 days (plus 150, 200, 365)", () => {
    for (const n of [...Array.from({ length: 120 }, (_, i) => i + 1), 150, 200, 365]) {
      const r = plan(n, 2);
      assert.equal(r.success, true, `${n} days`);
      assert.deepEqual(daysOfType(r.plan, "cumulative-revision"), expectedRevisionDays(n), `revision days, ${n}-day plan`);
      assert.deepEqual(daysOfType(r.plan, "final-review"), n >= 2 ? [n] : [], `final review, ${n}-day plan`);
      assert.deepEqual(daysOfType(r.plan, "practice-exam"), n >= 7 ? [n - 1] : [], `practice exam, ${n}-day plan`);
    }
  });

  test("no day mixes a special session with anything else, and no two weekly revisions touch", () => {
    for (const n of [7, 10, 14, 21, 22, 28, 29, 30, 31, 35, 42, 90]) {
      const r = plan(n, 2);
      const typesByDay = new Map();
      r.plan.forEach((s) => typesByDay.set(s.dayNumber, (typesByDay.get(s.dayNumber) || new Set()).add(s.sessionType)));
      for (const [day, types] of typesByDay) {
        const special = [...types].filter((t) => !learningTypes.includes(t));
        if (special.length > 0) assert.equal(types.size, 1, `day ${day} of ${n} mixes ${[...types]}`);
      }
      const rev = daysOfType(r.plan, "cumulative-revision");
      for (let i = 1; i < rev.length; i++) assert.ok(rev[i] - rev[i - 1] > 1, `back-to-back revision days in ${n}-day plan`);
    }
  });

  test("specific cases: 20, 21, 28 and 31 days", () => {
    assert.deepEqual(daysOfType(plan(20, 2).plan, "cumulative-revision"), [18], "20 days: no weekly revision yet");
    assert.deepEqual(daysOfType(plan(21, 2).plan, "cumulative-revision"), [7, 14, 19], "21 days: day 21 is the final review, not revision");
    assert.deepEqual(daysOfType(plan(28, 2).plan, "cumulative-revision"), [7, 14, 21, 26]);
    const r31 = plan(31, 2);
    assert.deepEqual(daysOfType(r31.plan, "cumulative-revision"), [7, 14, 21, 29]);
    assert.deepEqual([...new Set(r31.plan.filter((s) => s.dayNumber === 28).map((s) => s.sessionType))], ["learning"],
      "day 28 stays a learning day (it sits right before the revision on day 29)");
  });

  test("weekly revision covers only areas studied so far, and names weak topics", () => {
    const r = plan(30, 2, ["gov-8"]);
    const day7 = r.plan.filter((s) => s.dayNumber === 7);
    assert.ok(day7.length > 0 && day7.every((s) => s.sessionType === "cumulative-revision"));
    const studiedBefore = new Set(r.plan.filter((s) => s.dayNumber < 7 && learningTypes.includes(s.sessionType)).map((s) => s.area));
    assert.ok(day7.every((s) => studiedBefore.has(s.area)));
  });
});

// ===========================================================================
describe("8. Compatibility with the existing code", () => {
  test("function names, result shapes and exports are unchanged", () => {
    for (const name of ["calculateStudyDays", "validateInputs", "prioritizeTopics", "generateStudyPlan", "toDayNumber"]) {
      assert.equal(typeof planner[name], "function", `${name} export missing`);
    }
    for (const name of ["MAX_HOURS_PER_DAY", "SHORT_PREP_DAYS", "MAX_STUDY_DAYS", "HIGH_PRIORITY", "NORMAL_PRIORITY"]) {
      assert.equal(typeof planner[name], "number", `${name} export missing`);
    }
    assert.deepEqual(Object.keys(plan(14, 2)).sort(), ["errors", "plan", "success", "warnings"]);
    assert.deepEqual(Object.keys(plan(14, 2, [], [])).sort(), ["errors", "plan", "success", "warnings"]);
    assert.deepEqual(Object.keys(validateInputs(addDays(TODAY, 14), 2, [], TODAY, TOPICS)).sort(), ["errors", "valid", "values", "warnings"]);
    assert.deepEqual(Object.keys(plan(14, 2).plan[0]).sort(),
      ["area", "date", "dayNumber", "isWeak", "sessionType", "tasks", "topic", "topicId", "totalHours"]);
  });

  test("deterministic, and the inputs are never modified", () => {
    const weak = ["cloud-3", "gov-1"];
    const snapshot = JSON.stringify([TOPICS, weak]);
    assert.deepEqual(plan(30, 2, weak), plan(30, 2, weak));
    assert.equal(JSON.stringify([TOPICS, weak]), snapshot);
  });
});