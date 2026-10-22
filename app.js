
document.addEventListener("DOMContentLoaded", function () {
  const topicDropdown = document.getElementById("weak-topics");

  if (!topicDropdown) {
    console.error(
      'Topic dropdown not found. Check that index.html has id="weak-topics".'
    );
    return;
  }

  function loadTopics() {
    const topics = window.TOPICS;

    if (!Array.isArray(topics) || topics.length === 0) {
      topicDropdown.innerHTML =
        '<option value="">Topics could not be loaded. Check topics.js.</option>';

      console.error(
        "TOPICS is missing or is not an array. Check topics.js."
      );
      return;
    }

    topicDropdown.replaceChildren();

    const areas = {};

    topics.forEach(function (topic) {
      if (!topic || !topic.id || !topic.name || !topic.area) {
        return;
      }

      if (!areas[topic.area]) {
        areas[topic.area] = [];
      }

      areas[topic.area].push(topic);
    });

    Object.entries(areas).forEach(function ([area, areaTopics]) {
      const group = document.createElement("optgroup");
      group.label = area;

      areaTopics.forEach(function (topic) {
        const option = document.createElement("option");
        option.value = topic.id;
        option.textContent = topic.name;
        group.appendChild(option);
      });

      topicDropdown.appendChild(group);
    });

    if (topicDropdown.options.length === 0) {
      topicDropdown.innerHTML =
        '<option value="">No valid topics found.</option>';

      console.error("No valid topics were found in TOPICS.");
    }
  }

  loadTopics();
});
