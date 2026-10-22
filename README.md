# AZ-900 Study Planner

An unofficial study planner for the Microsoft AZ-900 (Azure Fundamentals) exam. Enter your exam date, how many hours you can study each day and which topics feel weak, and it builds a day-by-day plan. Built for the #1MillionDevs Vibe Coding Hackathon 2026.

**Unofficial:** this is a community study tool, not affiliated with or endorsed by Microsoft. Topics follow the public Microsoft Learn AZ-900 skills outline. No exam questions are included.

## Live demo

https://iminyibrooks-bot.github.io/az900-study-planner/

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
- `app.js`: connects the form to the planner

## How AI was used

(Add the prompts you actually used, one per bullet, and what each one helped with.)

## Team

- Celestine (Cess) Rapando: planning logic
- Wangari: page layout and styling
- Brooky: content and documentation

## What we learned

- (add two or three points in your own words)
