const amendments = Array.isArray(window.AMENDMENTS_DATA) ? window.AMENDMENTS_DATA : [];

const storeKey = "amendmaster.progress.v2";
const state = {
  view: "dashboard",
  mode: "practice",
  questions: [],
  index: 0,
  score: 0,
  selected: null,
  examAnswers: [],
  roundReview: [],
  roundStart: 0,
  timerId: null,
  bookmarksOnly: false,
  progress: loadProgress()
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  views: $$(".view"),
  navButtons: $$(".nav-btn"),
  themeButtons: [$("#theme-toggle"), $("#theme-toggle-mobile")],
  heroAccuracy: $("#hero-accuracy"),
  totalQuestions: $("#total-questions"),
  amendmentTotal: $("#amendment-total"),
  attempted: $("#attempted-count"),
  xp: $("#xp-count"),
  streak: $("#streak-count"),
  dailyProgress: $("#daily-progress"),
  badges: $("#badges"),
  topicFilter: $("#topic-filter"),
  search: $("#search-input"),
  bookmarksOnly: $("#bookmarks-only"),
  amendmentList: $("#amendment-list"),
  quizSetup: $("#quiz-setup"),
  questionScreen: $("#question-screen"),
  resultsScreen: $("#results-screen"),
  modeCards: $$(".mode-card"),
  difficulty: $("#difficulty-select"),
  length: $("#length-select"),
  amendmentSelect: $("#amendment-select"),
  startQuiz: $("#start-quiz"),
  quizModeLabel: $("#quiz-mode-label"),
  counter: $("#question-counter"),
  timer: $("#timer"),
  quizProgress: $("#quiz-progress"),
  difficultyPill: $("#difficulty-pill"),
  amendmentPill: $("#amendment-pill"),
  questionText: $("#question-text"),
  optionList: $("#option-list"),
  explanation: $("#explanation-panel"),
  quitQuiz: $("#quit-quiz"),
  nextQuestion: $("#next-question"),
  resultHeading: $("#result-heading"),
  resultCopy: $("#result-copy"),
  resultReview: $("#result-review"),
  newRound: $("#new-round"),
  resetProgress: $("#reset-progress"),
  progressCorrect: $("#progress-correct"),
  progressIncorrect: $("#progress-incorrect"),
  completionRate: $("#completion-rate"),
  studyTime: $("#study-time"),
  strongTopics: $("#strong-topics"),
  weakTopics: $("#weak-topics"),
  leaderboard: $("#leaderboard")
};

function loadProgress() {
  const fallback = {
    attempted: 0,
    correct: 0,
    incorrect: 0,
    xp: 0,
    streak: 0,
    bestStreak: 0,
    studySeconds: 0,
    completed: [],
    bookmarks: [],
    topicStats: {},
    history: [],
    leaderboard: []
  };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(storeKey)) };
  } catch {
    return fallback;
  }
}

function saveProgress() {
  localStorage.setItem(storeKey, JSON.stringify(state.progress));
}

function ordinal(number) {
  const n = Number(number);
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
  return `${n}${suffix}`;
}

function clean(value) {
  return Array.isArray(value) ? value.filter(Boolean).join(", ") : String(value || "None");
}

function shortName(item) {
  return `${ordinal(item.amendmentNumber)} Amendment Act, ${item.year}`;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function allTopics() {
  return unique(amendments.flatMap((item) => item.relatedTopics || [])).sort();
}

function distractors(correct, values, count = 3) {
  return shuffle(unique(values.map(String).filter((value) => value && value !== String(correct)))).slice(0, count);
}

function optionLetters(options) {
  return options.map((text, index) => ({ id: String.fromCharCode(65 + index), text }));
}

function makeExplanation(item, correct, options) {
  const analysis = options.map((option) => {
    const matching = amendments.find((amendment) => shortName(amendment) === option || String(amendment.year) === option || amendment.keyChanges === option || clean(amendment.articlesAffected) === option || clean(amendment.schedulesAffected) === option);
    if (option === correct) {
      return `${option}: Correct. It matches ${shortName(item)}.`;
    }
    if (matching) {
      return `${option}: This points to ${shortName(matching)}, which dealt with ${matching.keyChanges}`;
    }
    return `${option}: This is a plausible distractor, but it does not match the asked amendment fact.`;
  });

  return {
    brief: `${shortName(item)} ${item.keyChanges} Articles affected: ${clean(item.articlesAffected)}. Schedules affected: ${clean(item.schedulesAffected)}. Significance: ${item.constitutionalSignificance}`,
    analysis
  };
}

function buildQuestion(item, type, difficulty) {
  let prompt = "";
  let correct = "";
  let pool = [];

  if (type === "number") {
    prompt = `Which amendment is associated with: ${item.keyChanges}`;
    correct = shortName(item);
    pool = amendments.map(shortName);
  }
  if (type === "year") {
    prompt = `In which year was ${shortName(item)} enacted?`;
    correct = String(item.year);
    pool = amendments.map((a) => String(a.year));
  }
  if (type === "articles") {
    prompt = `Which article or article group is linked with ${shortName(item)}?`;
    correct = clean(item.articlesAffected);
    pool = amendments.map((a) => clean(a.articlesAffected));
  }
  if (type === "schedules") {
    prompt = `Which schedule detail is linked with ${shortName(item)}?`;
    correct = clean(item.schedulesAffected);
    pool = amendments.map((a) => clean(a.schedulesAffected));
  }
  if (type === "change") {
    prompt = `What was the key change made by ${shortName(item)}?`;
    correct = item.keyChanges;
    pool = amendments.map((a) => a.keyChanges);
  }
  if (type === "significance") {
    prompt = `What is the constitutional significance of ${shortName(item)}?`;
    correct = item.constitutionalSignificance;
    pool = amendments.map((a) => a.constitutionalSignificance);
  }
  if (type === "fact") {
    prompt = `Which exam fact belongs to ${shortName(item)}?`;
    correct = item.importantExamFacts;
    pool = amendments.map((a) => a.importantExamFacts);
  }
  if (type === "mnemonic") {
    prompt = `Which memory trick best fits ${shortName(item)}?`;
    correct = item.mnemonic;
    pool = amendments.map((a) => a.mnemonic);
  }
  if (type === "topic") {
    prompt = `Which topic is most closely related to ${shortName(item)}?`;
    correct = clean(item.relatedTopics?.slice(0, 2));
    pool = amendments.map((a) => clean(a.relatedTopics?.slice(0, 2)));
  }
  if (type === "reverse-year") {
    prompt = `Which amendment belongs to the year ${item.year} and changed: ${item.keyChanges}`;
    correct = shortName(item);
    pool = amendments.map(shortName);
  }

  const rawOptions = shuffle([correct, ...distractors(correct, pool)]).slice(0, 4);
  const options = rawOptions.length === 4 ? rawOptions : shuffle([correct, ...distractors(correct, amendments.map(shortName))]).slice(0, 4);
  return {
    id: `${item.amendmentNumber}-${type}`,
    amendmentNumber: item.amendmentNumber,
    topic: item.relatedTopics?.[0] || "General",
    difficulty,
    prompt,
    correct,
    options: optionLetters(options),
    explanation: makeExplanation(item, correct, options)
  };
}

function buildQuestionBank() {
  const types = ["number", "year", "articles", "schedules", "change", "significance", "fact", "mnemonic", "topic", "reverse-year"];
  return amendments.flatMap((item) => types.map((type, index) => buildQuestion(item, type, index < 3 ? "Easy" : index < 7 ? "Medium" : "Hard")));
}

const questionBank = buildQuestionBank();

function setView(view) {
  state.view = view;
  els.views.forEach((el) => el.classList.toggle("active", el.id === `${view}-view`));
  els.navButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.view === view));
  if (view === "learn") renderAmendments();
  if (view === "progress") renderProgress();
  if (view === "dashboard") renderDashboard();
}

function renderDashboard() {
  const accuracy = state.progress.attempted ? Math.round((state.progress.correct / state.progress.attempted) * 100) : 0;
  const completed = new Set(state.progress.completed).size;
  els.heroAccuracy.textContent = `${accuracy}%`;
  els.totalQuestions.textContent = questionBank.length;
  els.amendmentTotal.textContent = amendments.length;
  els.attempted.textContent = state.progress.attempted;
  els.xp.textContent = state.progress.xp;
  els.streak.textContent = state.progress.streak;
  els.dailyProgress.style.width = `${Math.min(100, (state.progress.attempted % 10) * 10)}%`;
  els.badges.innerHTML = "";
  [
    ["First Step", state.progress.attempted >= 1, "Attempt one question"],
    ["Half Century", state.progress.correct >= 50, "Answer 50 correctly"],
    ["Century Scholar", state.progress.correct >= 100, "Answer 100 correctly"],
    ["All 106 Explorer", completed >= 106, "Touch every amendment"],
    ["Accuracy Pro", accuracy >= 80 && state.progress.attempted >= 20, "80% accuracy"],
    ["XP 1000", state.progress.xp >= 1000, "Earn 1000 XP"],
    ["Streak 10", state.progress.bestStreak >= 10, "Ten correct in a row"],
    ["Bookmark Curator", state.progress.bookmarks.length >= 10, "Save 10 amendments"]
  ].forEach(([name, unlocked, detail]) => {
    const badge = document.createElement("div");
    badge.className = `badge ${unlocked ? "" : "locked"}`;
    badge.innerHTML = `<strong>${name}</strong><span>${unlocked ? "Unlocked" : detail}</span>`;
    els.badges.append(badge);
  });
}

function setupFilters() {
  els.topicFilter.innerHTML = `<option value="all">All topics</option>${allTopics().map((topic) => `<option value="${topic}">${topic}</option>`).join("")}`;
  els.amendmentSelect.innerHTML = amendments.map((item) => `<option value="${item.amendmentNumber}">${ordinal(item.amendmentNumber)} Amendment, ${item.year}</option>`).join("");
}

function renderAmendments() {
  const term = els.search.value.trim().toLowerCase();
  const topic = els.topicFilter.value;
  const bookmarks = new Set(state.progress.bookmarks);
  const list = amendments.filter((item) => {
    const haystack = [
      item.amendmentNumber,
      item.officialName,
      item.year,
      clean(item.articlesAffected),
      clean(item.schedulesAffected),
      item.keyChanges,
      item.constitutionalSignificance,
      item.importantExamFacts,
      item.mnemonic,
      clean(item.relatedTopics)
    ].join(" ").toLowerCase();
    return (!term || haystack.includes(term)) &&
      (topic === "all" || item.relatedTopics?.includes(topic)) &&
      (!state.bookmarksOnly || bookmarks.has(item.amendmentNumber));
  });

  els.amendmentList.innerHTML = "";
  list.forEach((item) => {
    const card = document.createElement("article");
    card.className = "amendment-card";
    const active = bookmarks.has(item.amendmentNumber);
    card.innerHTML = `
      <div class="amendment-top">
        <div>
          <span class="amendment-num">${ordinal(item.amendmentNumber)} Amendment</span>
          <h2>${item.officialName}</h2>
          <p>${item.keyChanges}</p>
        </div>
        <button class="bookmark-btn ${active ? "active" : ""}" data-bookmark="${item.amendmentNumber}" aria-label="Bookmark amendment">${active ? "Saved" : "Save"}</button>
      </div>
      <div class="meta-grid">
        <div class="meta-box"><small>Year</small>${item.year}</div>
        <div class="meta-box"><small>Articles Affected</small>${clean(item.articlesAffected)}</div>
        <div class="meta-box"><small>Schedules Affected</small>${clean(item.schedulesAffected)}</div>
        <div class="meta-box"><small>Memory Trick</small>${item.mnemonic}</div>
      </div>
      <div class="meta-box"><small>Significance</small>${item.constitutionalSignificance}</div>
      <div class="meta-box"><small>Important Exam Facts</small>${item.importantExamFacts}</div>
      <div class="topic-chips">${(item.relatedTopics || []).map((t) => `<span class="chip">${t}</span>`).join("")}</div>
    `;
    els.amendmentList.append(card);
  });
}

function pickQuestions() {
  const difficulty = els.difficulty.value;
  const length = Number(els.length.value);
  let pool = [...questionBank];
  if (difficulty !== "all") pool = pool.filter((q) => q.difficulty === difficulty);
  if (state.mode === "amendment") pool = pool.filter((q) => q.amendmentNumber === Number(els.amendmentSelect.value));
  if (state.mode === "weak") {
    const weak = weakTopics();
    pool = pool.filter((q) => weak.includes(q.topic));
  }
  if (state.mode === "revision") {
    const attempted = new Set(state.progress.history.map((h) => h.id));
    pool = pool.filter((q) => attempted.has(q.id));
  }
  if (state.mode === "daily") {
    const landmark = new Set([1, 7, 24, 25, 42, 44, 52, 61, 73, 74, 86, 91, 101, 103, 106]);
    pool = pool.filter((q) => landmark.has(q.amendmentNumber));
  }
  if (pool.length < 4) pool = [...questionBank];
  return shuffle(pool).slice(0, Math.min(length, pool.length));
}

function startQuiz(mode = state.mode) {
  state.mode = mode;
  state.questions = pickQuestions();
  state.index = 0;
  state.score = 0;
  state.selected = null;
  state.examAnswers = [];
  state.roundReview = [];
  state.roundStart = Date.now();
  els.quizSetup.classList.remove("active");
  els.resultsScreen.classList.remove("active");
  els.questionScreen.classList.add("active");
  setView("quiz");
  startTimer();
  renderQuestion();
}

function startTimer() {
  clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.roundStart) / 1000);
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const seconds = String(elapsed % 60).padStart(2, "0");
    els.timer.textContent = `${minutes}:${seconds}`;
  }, 1000);
}

function renderQuestion() {
  const q = state.questions[state.index];
  state.selected = null;
  els.explanation.classList.remove("active");
  els.explanation.innerHTML = "";
  els.nextQuestion.classList.toggle("active", state.mode === "exam");
  els.nextQuestion.textContent = state.index === state.questions.length - 1 ? (state.mode === "exam" ? "Submit" : "Finish") : "Next";
  els.quizModeLabel.textContent = `${state.mode.charAt(0).toUpperCase()}${state.mode.slice(1)} Mode`;
  els.counter.textContent = `Question ${state.index + 1} of ${state.questions.length}`;
  els.quizProgress.style.width = `${(state.index / state.questions.length) * 100}%`;
  els.difficultyPill.textContent = q.difficulty;
  els.amendmentPill.textContent = `${ordinal(q.amendmentNumber)} Amendment`;
  els.questionText.textContent = q.prompt;
  els.optionList.innerHTML = "";
  q.options.forEach((option) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = `${option.id}. ${option.text}`;
    btn.addEventListener("click", () => selectAnswer(option.text, btn));
    els.optionList.append(btn);
  });
}

function selectAnswer(answer, button) {
  const q = state.questions[state.index];
  state.selected = answer;
  if (state.mode === "exam") {
    state.examAnswers[state.index] = answer;
    $$(".option-btn").forEach((btn) => btn.classList.remove("correct"));
    button.classList.add("correct");
    return;
  }
  const correct = answer === q.correct;
  $$(".option-btn").forEach((btn) => {
    btn.disabled = true;
    if (btn.textContent.slice(3) === q.correct) btn.classList.add("correct");
  });
  if (!correct) button.classList.add("wrong");
  recordAnswer(q, answer, correct);
  renderExplanation(q, correct);
  els.nextQuestion.classList.add("active");
}

function renderExplanation(q, correct) {
  els.explanation.classList.add("active");
  els.explanation.innerHTML = `
    <h3>${correct ? "Correct Answer" : "Correct Answer: " + q.correct}</h3>
    <p><strong>Brief Explanation:</strong> ${q.explanation.brief}</p>
    <p><strong>Option-wise Analysis:</strong></p>
    <ul>${q.explanation.analysis.map((line) => `<li>${line}</li>`).join("")}</ul>
  `;
}

function recordAnswer(q, answer, correct) {
  const topic = q.topic || "General";
  const stats = state.progress.topicStats[topic] || { correct: 0, incorrect: 0 };
  state.progress.attempted += 1;
  state.progress.completed = unique([...state.progress.completed, q.amendmentNumber]);
  const reviewItem = { id: q.id, correct, answer, prompt: q.prompt, correctAnswer: q.correct, amendmentNumber: q.amendmentNumber, explanation: q.explanation.brief };
  state.roundReview.push(reviewItem);
  state.progress.history = [reviewItem, ...state.progress.history].slice(0, 250);
  if (correct) {
    state.score += 1;
    state.progress.correct += 1;
    state.progress.streak += 1;
    state.progress.bestStreak = Math.max(state.progress.bestStreak, state.progress.streak);
    state.progress.xp += q.difficulty === "Hard" ? 20 : q.difficulty === "Medium" ? 15 : 10;
    stats.correct += 1;
  } else {
    state.progress.incorrect += 1;
    state.progress.streak = 0;
    stats.incorrect += 1;
  }
  state.progress.topicStats[topic] = stats;
  saveProgress();
  renderDashboard();
}

function nextQuestion() {
  if (state.mode === "exam") {
    const q = state.questions[state.index];
    const answer = state.examAnswers[state.index] ?? "Unanswered";
    recordAnswer(q, answer, answer === q.correct);
  }
  if (state.index >= state.questions.length - 1) {
    finishQuiz();
    return;
  }
  state.index += 1;
  renderQuestion();
}

function finishQuiz() {
  clearInterval(state.timerId);
  const elapsed = Math.floor((Date.now() - state.roundStart) / 1000);
  state.progress.studySeconds += elapsed;
  state.progress.leaderboard = [{ score: state.score, total: state.questions.length, mode: state.mode, date: new Date().toLocaleDateString() }, ...state.progress.leaderboard].slice(0, 10);
  saveProgress();
  els.questionScreen.classList.remove("active");
  els.resultsScreen.classList.add("active");
  const percent = Math.round((state.score / state.questions.length) * 100);
  els.resultHeading.textContent = percent >= 85 ? "Excellent Result" : percent >= 60 ? "Good Progress" : "Review Round";
  els.resultCopy.textContent = `You scored ${state.score} out of ${state.questions.length}. Accuracy for this round: ${percent}%.`;
  els.resultReview.innerHTML = "";
  state.roundReview.forEach((hist, index) => {
    const row = document.createElement("div");
    row.className = `review-item ${hist.correct ? "" : "missed"}`;
    row.innerHTML = `<strong>${index + 1}. ${hist.correct ? "Correct" : "Missed"}: ${hist.correctAnswer}</strong><span>Your answer: ${hist.answer}. ${hist.explanation}</span>`;
    els.resultReview.append(row);
  });
  renderProgress();
}

function weakTopics() {
  return Object.entries(state.progress.topicStats)
    .filter(([, stats]) => stats.incorrect >= stats.correct)
    .map(([topic]) => topic);
}

function renderProgress() {
  const completion = Math.round((new Set(state.progress.completed).size / amendments.length) * 100);
  els.progressCorrect.textContent = state.progress.correct;
  els.progressIncorrect.textContent = state.progress.incorrect;
  els.completionRate.textContent = `${completion}%`;
  els.studyTime.textContent = `${Math.round(state.progress.studySeconds / 60)}m`;
  const sorted = Object.entries(state.progress.topicStats)
    .map(([topic, stats]) => ({ topic, total: stats.correct + stats.incorrect, accuracy: stats.correct / Math.max(1, stats.correct + stats.incorrect) }))
    .filter((item) => item.total > 0);
  renderTopics(els.strongTopics, sorted.filter((item) => item.accuracy >= 0.7));
  renderTopics(els.weakTopics, sorted.filter((item) => item.accuracy < 0.7));
  els.leaderboard.innerHTML = state.progress.leaderboard.length
    ? state.progress.leaderboard.map((row, i) => `<div class="leaderboard-row"><span>${i + 1}. ${row.mode}</span><strong>${row.score}/${row.total}</strong></div>`).join("")
    : `<p>No quiz results yet.</p>`;
}

function renderTopics(target, topics) {
  target.innerHTML = topics.length
    ? topics.map((item) => `<span class="chip">${item.topic}: ${Math.round(item.accuracy * 100)}%</span>`).join("")
    : `<span class="chip">Not enough data yet</span>`;
}

function toggleBookmark(number) {
  const bookmarks = new Set(state.progress.bookmarks);
  if (bookmarks.has(number)) bookmarks.delete(number);
  else bookmarks.add(number);
  state.progress.bookmarks = [...bookmarks];
  saveProgress();
  renderAmendments();
  renderDashboard();
}

function wireEvents() {
  els.navButtons.forEach((btn) => btn.addEventListener("click", () => setView(btn.dataset.view)));
  els.themeButtons.forEach((btn) => btn?.addEventListener("click", toggleTheme));
  $$("[data-start-mode]").forEach((btn) => btn.addEventListener("click", () => startQuiz(btn.dataset.startMode)));
  els.modeCards.forEach((card) => card.addEventListener("click", () => {
    state.mode = card.dataset.mode;
    els.modeCards.forEach((item) => item.classList.toggle("selected", item === card));
  }));
  els.search.addEventListener("input", renderAmendments);
  els.topicFilter.addEventListener("change", renderAmendments);
  els.bookmarksOnly.addEventListener("click", () => {
    state.bookmarksOnly = !state.bookmarksOnly;
    els.bookmarksOnly.textContent = state.bookmarksOnly ? "All Amendments" : "Bookmarks";
    renderAmendments();
  });
  els.amendmentList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-bookmark]");
    if (button) toggleBookmark(Number(button.dataset.bookmark));
  });
  els.startQuiz.addEventListener("click", () => startQuiz());
  els.nextQuestion.addEventListener("click", nextQuestion);
  els.quitQuiz.addEventListener("click", () => {
    clearInterval(state.timerId);
    els.questionScreen.classList.remove("active");
    els.resultsScreen.classList.remove("active");
    els.quizSetup.classList.add("active");
  });
  els.newRound.addEventListener("click", () => {
    els.resultsScreen.classList.remove("active");
    els.quizSetup.classList.add("active");
  });
  els.resetProgress.addEventListener("click", () => {
    if (!confirm("Reset local progress, bookmarks, and leaderboard?")) return;
    localStorage.removeItem(storeKey);
    state.progress = loadProgress();
    renderDashboard();
    renderProgress();
    renderAmendments();
  });
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("amendmaster.theme", next);
  els.themeButtons.forEach((btn) => { if (btn) btn.textContent = next === "dark" ? "Light Mode" : "Dark Mode"; });
}

function init() {
  if (!amendments.length) {
    document.body.innerHTML = "<main class='main'><section class='panel'><h1>Data not found</h1><p>The app needs data/amendments-data.js or data/amendments.json.</p></section></main>";
    return;
  }
  const savedTheme = localStorage.getItem("amendmaster.theme") || "light";
  document.documentElement.dataset.theme = savedTheme;
  els.themeButtons.forEach((btn) => { if (btn) btn.textContent = savedTheme === "dark" ? "Light Mode" : "Dark Mode"; });
  setupFilters();
  wireEvents();
  renderDashboard();
  renderAmendments();
  renderProgress();
  registerServiceWorker();
}

init();

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  navigator.serviceWorker.register("./sw.js").catch(() => {
    // The app remains fully usable without install/offline registration.
  });
}
