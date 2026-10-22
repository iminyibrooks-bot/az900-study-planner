// planner.js - AZ-900 Study Planner (Unofficial study aid)
const { TOPICS } = require("./topics.js");
const MS_PER_DAY = 86400000;

// Turns a "YYYY-MM-DD" string or a Date into a whole-day number
// (days since 1970-01-01). Returns null if the input is not a real date.
function toDayNumber(value) {
  let year, month, day;

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    year = value.getFullYear();
    month = value.getMonth() + 1;
    day = value.getDate();
  } else if (typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) return null;
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else {
    return null;
  }

  const utc = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day;
  if (!isRealDate) return null;

  return utc.getTime() / MS_PER_DAY;
}

// Returns { ok: true, days } or { ok: false, code, error }.
// "days" = full study days from today up to the day BEFORE the exam.
function calculateStudyDays(examDate, today = new Date()) {
  const examDay = toDayNumber(examDate);
  if (examDay === null) {
    return {
      ok: false,
      code: "INVALID_EXAM_DATE",
      error: "Please enter a valid exam date (YYYY-MM-DD).",
    };
  }

  const todayDay = toDayNumber(today);
  if (todayDay === null) {
    return {
      ok: false,
      code: "INVALID_TODAY_DATE",
      error: "Today's date is not valid.",
    };
  }

  const days = examDay - todayDay;
  if (days < 1) {
    return {
      ok: false,
      code: "EXAM_NOT_IN_FUTURE",
      error: "The exam must be tomorrow or later.",
    };
  }

  return { ok: true, days };
}

const MAX_HOURS_PER_DAY = 12;
const SHORT_PREP_DAYS = 7; // fewer study days than this triggers a warning
const MAX_STUDY_DAYS = 365; // an exam further away than this is rejected (also stops huge plans)

// Checks the learner's form inputs. Does NOT build the schedule.
// Valid topic IDs come from the optional 5th argument, or the global TOPICS (topics.js).
// Returns { valid, errors, warnings, values }
//   errors / warnings: arrays of { code, message }
//   values: { studyDays, hoursPerDay, weakTopics } when valid, otherwise null
function validateInputs(examDate, hoursPerDay, weakTopics = [], today = new Date(), topics) {
  const errors = [];
  const warnings = [];

  // 1. Exam date: reuse calculateStudyDays instead of repeating its checks
  const dateResult = calculateStudyDays(examDate, today);
  let studyDays = null;
  if (dateResult.ok) {
    studyDays = dateResult.days;
    if (studyDays > MAX_STUDY_DAYS) {
      errors.push({
        code: "EXAM_TOO_FAR",
        message: `The exam is more than ${MAX_STUDY_DAYS} days away. Please choose a date within the next year.`,
      });
    }
  } else {
    errors.push({ code: dateResult.code, message: dateResult.error });
  }

  // 2 + 3. Hours per day: a number, above 0, at most MAX_HOURS_PER_DAY
  // Form fields arrive as text, so numeric strings are accepted; blank text is not.
  const hours =
    typeof hoursPerDay === "string"
      ? hoursPerDay.trim() === "" ? NaN : Number(hoursPerDay)
      : hoursPerDay;

  if (typeof hours !== "number" || !Number.isFinite(hours)) {
    errors.push({ code: "INVALID_HOURS", message: "Hours per day must be a number." });
  } else if (hours <= 0) {
    errors.push({ code: "HOURS_TOO_LOW", message: "Hours per day must be greater than 0." });
  } else if (hours > MAX_HOURS_PER_DAY) {
    errors.push({
      code: "HOURS_TOO_HIGH",
      message: `Hours per day cannot be more than ${MAX_HOURS_PER_DAY}.`,
    });
  }

  // 4 + 5. Weak topics: an array of known IDs; an empty array is fine
  let cleanWeak = [];
  if (!Array.isArray(weakTopics)) {
    errors.push({ code: "INVALID_WEAK_TOPICS", message: "Weak topics must be a list of topic IDs." });
  } else if (weakTopics.length > 0) {
    const topicList = topics || (typeof TOPICS !== "undefined" ? TOPICS : []);
    if (topicList.length === 0) {
      errors.push({ code: "TOPICS_NOT_LOADED", message: "Topic list is not loaded. Check topics.js." });
    } else {
      const knownIds = new Set(topicList.map((t) => t && t.id)); // "t &&" so a null entry cannot crash this
      const unknown = weakTopics.filter((id) => typeof id !== "string" || !knownIds.has(id));
      if (unknown.length > 0) {
        errors.push({
          code: "INVALID_TOPIC_ID",
          message: `Unknown topic ID(s): ${unknown.map(String).join(", ")}.`,
        });
      } else {
        cleanWeak = [...new Set(weakTopics)]; // remove duplicates
      }
    }
  }

  // 6. Short preparation warning (only when the date itself was valid)
  if (studyDays !== null && studyDays < SHORT_PREP_DAYS) {
    warnings.push({
      code: "SHORT_PREPARATION",
      message: `Only ${studyDays} study day${studyDays === 1 ? "" : "s"} left. The plan will be tight.`,
    });
  }

  // 7. One consistent result shape
  const valid = errors.length === 0;
  return {
    valid,
    errors,
    warnings,
    values: valid ? { studyDays, hoursPerDay: hours, weakTopics: cleanWeak } : null,
  };
}

const HIGH_PRIORITY = 2; // weak topics
const NORMAL_PRIORITY = 1; // everything else

// Labels every topic as weak or not and puts weak topics first.
// weakTopics: array of topic ID strings. allTopics: array of { id, area, name, tip }.
// Returns a NEW array of { id, name, area, priority, isWeak }. Inputs are never changed.
// Unknown or duplicate IDs are ignored safely (validateInputs is where they get reported).
function prioritizeTopics(weakTopics, allTopics) {
  if (!Array.isArray(allTopics)) return [];

  // Only string IDs count; a Set also removes duplicate IDs for free
  const weakIds = new Set(
    Array.isArray(weakTopics) ? weakTopics.filter((id) => typeof id === "string") : []
  );

  const seen = new Set();
  const weak = [];
  const normal = [];

  for (const topic of allTopics) {
    // Skip broken entries and repeated topic IDs
    if (!topic || typeof topic.id !== "string" || seen.has(topic.id)) continue;
    seen.add(topic.id);

    const isWeak = weakIds.has(topic.id);
    const item = {
      id: topic.id,
      name: topic.name,
      area: topic.area,
      priority: isWeak ? HIGH_PRIORITY : NORMAL_PRIORITY,
      isWeak,
    };
    (isWeak ? weak : normal).push(item);
  }

  return [...weak, ...normal];
}

// ---------------------------------------------------------------------------
// generateStudyPlan and its helpers
// All time is counted in quarter hours (whole numbers) so rounding can never
// push a day over the daily limit.
// ---------------------------------------------------------------------------
const QUARTER_HOUR = 0.25;
const MAX_FINAL_REVIEW_QUARTERS = 12; // 3 hours
const MAX_SPECIAL_DAY_QUARTERS = 16; // 4 hours (practice exam, revision days)
const PRACTICE_EXAM_MIN_DAYS = 7;
const REVISION_MIN_DAYS = 10;
const WEEKLY_REVISION_MIN_DAYS = 21;

// Whole day number -> "YYYY-MM-DD"
function dayNumberToDateString(dayNumber) {
  return new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);
}

// Splits totalQ quarters into up to `count` near-equal parts (never below 1 quarter each).
function splitQuarters(totalQ, count) {
  const n = Math.min(count, totalQ);
  if (n <= 0) return [];
  const base = Math.floor(totalQ / n);
  const extra = totalQ % n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

// Shares totalQ quarters between units by weight. Needs units.length <= totalQ.
function allocateQuarters(units, totalQ) {
  const extraPool = totalQ - units.length;
  const totalWeight = units.reduce((sum, u) => sum + u.weight, 0);
  const shares = units.map((u) => 1 + Math.floor((extraPool * u.weight) / totalWeight));
  let leftover = totalQ - shares.reduce((a, b) => a + b, 0);
  for (let i = 0; leftover > 0; i = (i + 1) % shares.length) {
    shares[i] += 1; // units are in priority order, so weak topics get the extras first
    leftover -= 1;
  }
  return shares;
}

function learningTasks(unit, quarters, isFirstChunk) {
  const tasks = [];
  if (isFirstChunk) {
    tasks.push(
      unit.isArea
        ? `Learning objective: understand the main ideas in ${unit.name}.`
        : `Learning objective: explain ${unit.name} in your own words.`
    );
    tasks.push(
      unit.isArea
        ? `Study these topics: ${unit.topicNames.join(", ")}.`
        : `Study: work through the ${unit.name} material (${unit.area}).`
    );
  } else {
    tasks.push(`Revise: recap ${unit.name} from memory before moving on.`);
  }
  if (quarters >= 3) {
    const questions = Math.max(3, Math.round(quarters * (unit.isWeak ? 2 : 1.25)));
    tasks.push(`Practice: answer ${questions} practice questions on ${unit.name}.`);
  }
  if (unit.isWeak && (unit.isArea || quarters >= 2)) { // area sessions always name their weak topics
    tasks.push(
      unit.isArea
        ? `Spend extra time on your weak topics: ${unit.weakNames.join(", ")}.`
        : "Weak topic: write down every mistake and re-check it later."
    );
  }
  return tasks;
}

// Checks the shape of the topic list (the one place this is done). Every topic needs a
// non-empty string id, name and area. "tip" is not used by the planner, so it is not checked.
// Returns a list of readable problems; an empty list means the data is fine.
function findTopicProblems(topics) {
  const isText = (v) => typeof v === "string" && v.trim() !== "";
  const problems = [];
  topics.forEach((t, i) => {
    if (!t || typeof t !== "object" || Array.isArray(t)) {
      problems.push(`topic #${i + 1} is not an object`);
      return;
    }
    const missing = ["id", "name", "area"].filter((field) => !isText(t[field]));
    if (missing.length > 0) {
      problems.push(`topic #${i + 1}${isText(t.id) ? ` ("${t.id}")` : ""} needs a valid ${missing.join(", ")}`);
    }
  });
  return problems;
}

// Returns { success, plan, errors, warnings }
// plan = array of sessions: { date, dayNumber, topicId, topic, area, sessionType, tasks, isWeak, totalHours }
// sessionType: "learning" | "topic-practice" | "cumulative-revision" | "practice-exam" | "final-review"
function generateStudyPlan(examDate, hoursPerDay, weakTopics, allTopics = TOPICS , today = new Date()) {
  const fail = (errors, warnings = []) => ({ success: false, plan: [], errors, warnings });
  const noTopics = { code: "NO_TOPICS", message: "The topic list is empty or missing. Check topics.js." };

  // 1. Validate everything first
  if (!Array.isArray(allTopics) || allTopics.length === 0) return fail([noTopics]);
  const topicProblems = findTopicProblems(allTopics);
  if (topicProblems.length > 0) {
    const shown = topicProblems.slice(0, 5).join("; ");
    const more = topicProblems.length > 5 ? ` (and ${topicProblems.length - 5} more)` : "";
    return fail([{ code: "INVALID_TOPIC_DATA", message: `The topic list has problems: ${shown}${more}.` }]);
  }
  const validation = validateInputs(examDate, hoursPerDay, weakTopics, today, allTopics);
  if (!validation.valid) return fail(validation.errors, validation.warnings);

  const hours = validation.values.hoursPerDay;
  const capQ = Math.floor(hours / QUARTER_HOUR + 1e-9); // daily limit in quarter hours
  if (capQ < 1) {
    return fail(
      [{ code: "HOURS_TOO_LOW_FOR_PLAN", message: "Hours per day must be at least 0.25 (15 minutes)." }],
      validation.warnings
    );
  }

  // 2. Days available (day 1 = today, last day = the day before the exam)
  const studyDays = calculateStudyDays(examDate, today).days;
  const startDay = toDayNumber(today);

  // 3. Rank topics (weak first) and group them by knowledge area
  const ranked = prioritizeTopics(validation.values.weakTopics, allTopics);
  if (ranked.length === 0) return fail([noTopics], validation.warnings);

  const areaMap = new Map();
  for (const t of ranked) {
    const key = t.area;
    if (!areaMap.has(key)) areaMap.set(key, { area: key, topicNames: [], weakNames: [] });
    areaMap.get(key).topicNames.push(t.name);
    if (t.isWeak) areaMap.get(key).weakNames.push(t.name);
  }
  const areas = [...areaMap.values()];

  const warnings = [...validation.warnings];
  const makeSession = (dayNumber, quarters, fields) => ({
    date: dayNumberToDateString(startDay + dayNumber - 1),
    dayNumber,
    ...fields,
    totalHours: quarters * QUARTER_HOUR,
  });

  // 4. Decide what each day is for
  const types = new Array(studyDays).fill("learning");
  if (studyDays >= 2) types[studyDays - 1] = "final-review";
  if (studyDays >= PRACTICE_EXAM_MIN_DAYS) types[studyDays - 2] = "practice-exam";
  if (studyDays >= REVISION_MIN_DAYS) types[studyDays - 3] = "cumulative-revision";
  if (studyDays >= WEEKLY_REVISION_MIN_DAYS) {
    // Day numbers start at 1 but types[] starts at 0, so look days up through this helper.
    // A weekly revision lands on day 7, 14, 21... only if that day AND the next day are
    // still learning days. That keeps it clear of the reserved end days and stops two
    // revision days from sitting back to back.
    const isLearningDay = (dayNumber) => types[dayNumber - 1] === "learning";
    for (let day = 7; day < studyDays; day += 7) {
      if (isLearningDay(day) && isLearningDay(day + 1)) types[day - 1] = "cumulative-revision";
    }
  }
  if (studyDays < 2) {
    warnings.push({ code: "NO_FINAL_REVIEW", message: "Only one study day, so there is no separate final review day." });
  }
  if (studyDays < PRACTICE_EXAM_MIN_DAYS) {
    warnings.push({
      code: "NO_PRACTICE_EXAM",
      message: `Fewer than ${PRACTICE_EXAM_MIN_DAYS} study days, so the plan has no full practice exam day.`,
    });
  }

  // 5. Turn topics into units of study (single topics, or whole areas if time is very short)
  const learnDays = [];
  types.forEach((type, i) => { if (type === "learning") learnDays.push(i + 1); });
  const learnQ = learnDays.length * capQ;

  let units;
  if (learnQ >= ranked.length) {
    units = ranked.map((t) => ({
      id: t.id, name: t.name, area: t.area, isWeak: t.isWeak, weight: t.priority,
      isArea: false, topicNames: [t.name], weakNames: t.isWeak ? [t.name] : [],
    }));
  } else {
    warnings.push({
      code: "COVERAGE_REDUCED",
      message: "Not enough study time for every topic separately, so the plan covers each knowledge area, starting with your weak topics.",
    });
    const areaUnits = areas.map((a) => ({
      id: null, name: a.area, area: a.area, isWeak: a.weakNames.length > 0,
      // same idea as topic mode: sum of the topic priorities (normal = 1, weak = 2)
      weight: a.topicNames.length + a.weakNames.length,
      isArea: true, topicNames: a.topicNames, weakNames: a.weakNames,
    }));
    units = areaUnits.slice(0, learnQ); // areas holding weak topics are first in this list
    if (units.length < areaUnits.length) {
      const skipped = areaUnits.slice(learnQ);
      const weakLost = skipped.flatMap((u) => u.weakNames);
      warnings.push({
        code: "COVERAGE_INCOMPLETE",
        message:
          `Not enough study time to cover: ${skipped.map((u) => u.name).join(", ")}.` +
          (weakLost.length ? ` This includes your weak topics: ${weakLost.join(", ")}.` : "") +
          " Add more hours per day or choose a later exam date.",
      });
    }
  }

  // 6. Fill the learning days in priority order (a unit may continue on the next day)
  const shares = allocateQuarters(units, learnQ);
  const learnSessions = [];
  let dayIdx = 0;
  let usedQ = 0;
  units.forEach((unit, i) => {
    let left = shares[i];
    let chunk = 0;
    while (left > 0 && dayIdx < learnDays.length) {
      const room = capQ - usedQ;
      if (room <= 0) { dayIdx += 1; usedQ = 0; continue; }
      const take = Math.min(left, room);
      learnSessions.push(
        makeSession(learnDays[dayIdx], take, {
          topicId: unit.id,
          topic: unit.name,
          area: unit.area,
          sessionType: chunk === 0 ? "learning" : "topic-practice",
          tasks: learningTasks(unit, take, chunk === 0),
          isWeak: unit.isWeak,
        })
      );
      usedQ += take;
      left -= take;
      chunk += 1;
    }
  });

  // 7. Build the revision, practice exam and final review days
  const otherSessions = [];
  types.forEach((type, idx) => {
    const dayNumber = idx + 1;

    if (type === "practice-exam") {
      otherSessions.push(
        makeSession(dayNumber, Math.min(capQ, MAX_SPECIAL_DAY_QUARTERS), {
          topicId: null, topic: "Practice exam (all areas)", area: "All areas",
          sessionType: "practice-exam", isWeak: false,
          tasks: [
            "Take a full timed practice exam under exam conditions.",
            "Mark it and list every question you got wrong.",
            "Note which areas need attention in the final review.",
          ],
        })
      );
    } else if (type === "cumulative-revision") {
      const covered = [];
      for (const s of learnSessions) {
        if (s.dayNumber < dayNumber && !covered.includes(s.area)) covered.push(s.area);
      }
      const list = (covered.length ? covered : areas.map((a) => a.area)).map((name) => areaMap.get(name));
      const parts = splitQuarters(Math.min(capQ, MAX_SPECIAL_DAY_QUARTERS), list.length);
      if (parts.length < list.length && !warnings.some((w) => w.code === "REVISION_PARTIAL")) {
        warnings.push({
          code: "REVISION_PARTIAL",
          message: `Revision days are too short to cover every area. Left out: ${list.slice(parts.length).map((a) => a.area).join(", ")}.`,
        });
      }
      parts.forEach((q, i) => {
        const a = list[i];
        const tasks = [
          `Revise: recap the key ideas from the ${a.area} topics covered so far.`,
          `Practice: answer mixed practice questions on ${a.area}.`,
        ];
        if (a.weakNames.length) tasks.push(`Focus on your weak topics: ${a.weakNames.join(", ")}.`);
        otherSessions.push(
          makeSession(dayNumber, q, {
            topicId: null, topic: `Cumulative revision: ${a.area}`, area: a.area,
            sessionType: "cumulative-revision", tasks, isWeak: a.weakNames.length > 0,
          })
        );
      });
    } else if (type === "final-review") {
      const parts = splitQuarters(Math.min(capQ, MAX_FINAL_REVIEW_QUARTERS), areas.length);
      if (parts.length < areas.length) {
        warnings.push({
          code: "FINAL_REVIEW_PARTIAL",
          message: `The final review day is too short to cover every area. Left out: ${areas.slice(parts.length).map((a) => a.area).join(", ")}.`,
        });
      }
      parts.forEach((q, i) => {
        const a = areas[i];
        const tasks = [`Final review: skim your notes on ${a.area}.`];
        if (a.weakNames.length) tasks.push(`Re-check your weak topics: ${a.weakNames.join(", ")}.`);
        tasks.push("Redo the practice questions you got wrong.");
        if (i === parts.length - 1) tasks.push("Stop on time and rest. Do not start new material today.");
        otherSessions.push(
          makeSession(dayNumber, q, {
            topicId: null, topic: `Final review: ${a.area}`, area: a.area,
            sessionType: "final-review", tasks, isWeak: a.weakNames.length > 0,
          })
        );
      });
    }
  });

  // 8. Put everything in day order (the sort is stable, so order within a day is kept)
  const plan = [...learnSessions, ...otherSessions].sort((a, b) => a.dayNumber - b.dayNumber);
  return { success: true, plan, errors: [], warnings };
}

if (typeof module !== "undefined") {
  module.exports = {
    calculateStudyDays,
    toDayNumber,
    validateInputs,
    prioritizeTopics,
    generateStudyPlan,
    findTopicProblems,
    MAX_HOURS_PER_DAY,
    SHORT_PREP_DAYS,
    MAX_STUDY_DAYS,
    HIGH_PRIORITY,
    NORMAL_PRIORITY,
  };
}