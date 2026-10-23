document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("planner-form");
  const examDateEl = document.getElementById("exam-date");
  const hoursEl = document.getElementById("hours-per-day");
  const weakEl = document.getElementById("weak-topics");
  const formMessage = document.getElementById("form-message");
  const planMessages = document.getElementById("plan-messages");
  const planOutput = document.getElementById("plan-output");
  const summaryDays = document.getElementById("summary-days");
  const summaryHours = document.getElementById("summary-hours");
  const summaryWeak = document.getElementById("summary-weak");

  if (!form || !planOutput) {
    console.error("planner-form or plan-output not found in index.html.");
    return;
  }

  function messageOf(item) {
    return typeof item === "string" ? item : item.message;
  }

  function selectedWeakTopics() {
    if (!weakEl) return [];
    return Array.from(weakEl.selectedOptions || [])
      .map(function (option) { return option.value; })
      .filter(function (value) { return value !== ""; });
  }

  function renderPlan(plan) {
    planOutput.replaceChildren();

    const days = new Map();
    plan.forEach(function (session) {
      if (!days.has(session.dayNumber)) days.set(session.dayNumber, []);
      days.get(session.dayNumber).push(session);
    });

    days.forEach(function (sessions, dayNumber) {
      const dayBox = document.createElement("section");
      dayBox.className = "plan-day";

      const total = sessions.reduce(function (sum, s) { return sum + s.totalHours; }, 0);
      const heading = document.createElement("h3");
      heading.textContent = "Day " + dayNumber + " · " + sessions[0].date + " · " + total + " h";
      dayBox.appendChild(heading);

      sessions.forEach(function (session) {
        const card = document.createElement("div");
        card.className = session.isWeak ? "plan-session weak" : "plan-session";

        const title = document.createElement("strong");
        title.textContent = session.isWeak ? session.topic + " (weak topic)" : session.topic;

        const meta = document.createElement("small");
        meta.textContent = " " + session.area + " · " + session.totalHours + " h";

        const list = document.createElement("ul");
        session.tasks.forEach(function (task) {
          const li = document.createElement("li");
          li.textContent = task;
          list.appendChild(li);
        });

        card.append(title, meta, list);
        dayBox.appendChild(card);
      });

      planOutput.appendChild(dayBox);
    });

    const resultsSection = planOutput.closest("section");
    if (resultsSection) resultsSection.hidden = false;
    planOutput.hidden = false;
  }

  function showMessages(el, items) {
    if (!el) return;
    el.replaceChildren();
    items.forEach(function (item) {
      const p = document.createElement("p");
      p.textContent = messageOf(item);
      el.appendChild(p);
    });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (typeof generateStudyPlan === "undefined") {
      showMessages(formMessage, ["Planner failed to load. Check that src/planner.js is loaded before script.js."]);
      return;
    }

    const weak = selectedWeakTopics();
    const result = generateStudyPlan(examDateEl.value, Number(hoursEl.value), weak);

    showMessages(formMessage, []);
    showMessages(planMessages, []);

    if (!result.success) {
      planOutput.replaceChildren();
      showMessages(formMessage, result.errors);
      return;
    }

    renderPlan(result.plan);
    showMessages(planMessages, result.warnings);

    const dayCount = new Set(result.plan.map(function (s) { return s.dayNumber; })).size;
    const hourTotal = result.plan.reduce(function (sum, s) { return sum + s.totalHours; }, 0);
    if (summaryDays) summaryDays.textContent = dayCount;
    if (summaryHours) summaryHours.textContent = hourTotal;
    if (summaryWeak) summaryWeak.textContent = weak.length;
  });
});
