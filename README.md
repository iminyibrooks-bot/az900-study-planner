# AZ-900 Study Planner

An unofficial study planner for the Microsoft AZ-900 (Azure Fundamentals) exam. Enter your exam date, how many hours you can study each day and which topics feel weak, and it builds a day-by-day plan. Built for the #1MillionDevs Vibe Coding Hackathon 2026.

**Unofficial:** this is a community study tool, not affiliated with or endorsed by Microsoft. Topics follow the public Microsoft Learn AZ-900 skills outline. No exam questions are included.

## Live demo

https://iminyibrooks-bot.github.io/az900-study-planner/

## Presentation

Our project slides on Canva: https://canva.link/dqme2pbkq1hzv7b

## Features

- Day-by-day plan from today until your exam date
- Weak topics get more study time and extra practice
- Covers all three AZ-900 areas: Cloud Concepts, Azure Architecture and Services, Azure Management and Governance
- Validates your inputs and shows clear error messages and warnings
- Works on a phone

## How to run it locally

1. Clone the repo: `git clone https://github.com/iminyibrooks-bot/az900-study-planner.git`
2. Open the folder and start a local server: `python3 -m http.server 8000`
3. Visit `http://localhost:8000`

## Project structure

- `index.html` and `style.css`: the page and its styling
- `src/topics.js`: the AZ-900 topic list with a short tip for each
- `src/planner.js`: the planning logic
- `src/planner.test.js`: tests for the planner
- `app.js`: fills the weak-topics dropdown from the topic list
- `script.js`: reads the form, calls the planner and shows the plan

## How AI was used

We used Claude as a coding and planning assistant. All AI-written code was run and tested by us, in Node and in the browser, before it was committed.

- **Scoping:** "We have until Friday to build an AZ-900 study planner. What is a small scope we can finish, and how do we split the jobs so nobody edits the same file?" This led us to a planner (not a quiz bank) and one owner per file.
- **Shared data shape:** "Give us a data format for topics and plan entries so the layout and the logic can be built in parallel." This let the page and the planner be built separately and then joined.
- **Connecting the pieces:** we pasted the real output of `generateStudyPlan` and asked for a script that connects the form to it using those exact fields. This avoided guessing field names.
- **Debugging:** we pasted `grep` output from `index.html` and asked why the page had no styling. It showed the link said `styles.css` but the file is `style.css`.
- **Content rule:** topics come from the public Microsoft Learn AZ-900 skills outline. We did not use real exam questions or copied material.

## Team

- Celestine (Cess) Rapando: planning logic
- Wangari: page layout and styling
- Brooky: content and documentation

## What we learned

- Agreeing the data shape and an owner for each file first let three people build in parallel without overwriting each other.
- Moving files into a folder broke the script paths silently, so after any restructure we check the paths and the browser console.
- One wrong letter in a filename (`styles.css` vs `style.css`) removed all the styling with no error message, so we learned to check the Network tab and read `grep` output.
- Code written for Node can use `require`, but the browser cannot, so the planner had to work in both places.
- A rejected push usually means a teammate pushed first, so we run `git pull --rebase` before every push.
