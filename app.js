const CONFIG = {
  passScore: 25,
  totalQuestions: 30,
  timeLimitSeconds: 60 * 60,
  certificatePrefix: "SDN-2026-",
  appsScriptUrl: "" // Google Apps ScriptのWebアプリURLを入れると結果送信できます。APIキーは不要です。
};

const state = {
  student: null,
  attemptNo: 1,
  questions: [],
  answers: {},
  currentIndex: 0,
  remainingSeconds: CONFIG.timeLimitSeconds,
  timerId: null,
  result: null
};

const $ = (selector) => document.querySelector(selector);
const letters = ["A", "B", "C", "D"];

function storageKey(email) {
  return `sdnExam:${String(email || "guest").trim().toLowerCase()}`;
}

function readProfile(email) {
  return JSON.parse(localStorage.getItem(storageKey(email)) || "{}");
}

function writeProfile(email, profile) {
  localStorage.setItem(storageKey(email), JSON.stringify(profile));
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === id));
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getAttemptInfo(email) {
  const profile = readProfile(email);
  const completedAttempts = Number(profile.completedAttempts || 0);
  const passed = Boolean(profile.passed);
  const retestsUsed = Math.max(0, completedAttempts - 1);
  const retestsLeft = Math.max(0, 3 - retestsUsed);
  return { profile, completedAttempts, passed, retestsUsed, retestsLeft };
}

function startExam(student) {
  const info = getAttemptInfo(student.email);
  if (info.passed) {
    alert("このメールアドレスでは、すでに合格済みです。必要に応じて前回の認定証をご確認ください。");
  }
  if (info.completedAttempts >= 4) {
    alert("再テスト可能回数の上限に達しました。");
    return;
  }

  state.student = student;
  state.attemptNo = info.completedAttempts + 1;
  state.currentIndex = 0;
  state.answers = {};
  state.remainingSeconds = CONFIG.timeLimitSeconds;
  state.questions = state.attemptNo === 1
    ? QUESTION_BANK.slice(0, CONFIG.totalQuestions)
    : shuffle(QUESTION_BANK).slice(0, CONFIG.totalQuestions);

  showScreen("examView");
  renderQuestion();
  startTimer();
}

function startTimer() {
  clearInterval(state.timerId);
  updateTimer();
  state.timerId = setInterval(() => {
    state.remainingSeconds -= 1;
    updateTimer();
    if (state.remainingSeconds <= 0) finishExam(true);
  }, 1000);
}

function updateTimer() {
  const min = Math.max(0, Math.floor(state.remainingSeconds / 60));
  const sec = Math.max(0, state.remainingSeconds % 60);
  $("#timer").textContent = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function renderQuestion() {
  const question = state.questions[state.currentIndex];
  const selected = state.answers[question.id];
  $("#questionCounter").textContent = `${state.currentIndex + 1} / ${state.questions.length}`;
  $("#answeredCounter").textContent = `回答済み ${Object.keys(state.answers).length} / ${state.questions.length}`;
  $("#questionNumber").textContent = `問題 ${question.id}`;
  $("#questionText").textContent = question.text;
  $("#choices").innerHTML = question.choices.map((choice, index) => {
    const letter = letters[index];
    const checked = selected === letter ? "checked" : "";
    return `<label class="choice"><input type="radio" name="answer" value="${letter}" ${checked}><span><strong>${letter}.</strong> ${choice}</span></label>`;
  }).join("");
  $("#prevBtn").disabled = state.currentIndex === 0;
  $("#nextBtn").textContent = state.currentIndex === state.questions.length - 1 ? "試験を終了する" : "次へ";
}

function finishExam(timeUp = false) {
  if (!timeUp) {
    const unanswered = state.questions.length - Object.keys(state.answers).length;
    if (unanswered > 0 && !confirm(`未回答が${unanswered}問あります。未回答は不正解になります。このまま終了しますか？`)) return;
  }
  clearInterval(state.timerId);

  const details = state.questions.map((question) => {
    const userAnswer = state.answers[question.id] || "未回答";
    const correct = userAnswer === question.answer;
    return { question, userAnswer, correct };
  });
  const score = details.filter((item) => item.correct).length;
  const passed = score >= CONFIG.passScore;
  const certNo = passed ? issueLocalCertificateNumber() : "未発行";

  state.result = {
    date: new Date().toLocaleString("ja-JP"),
    score,
    passed,
    certNo,
    remainingTime: $("#timer").textContent,
    details
  };

  const profile = readProfile(state.student.email);
  profile.completedAttempts = state.attemptNo;
  profile.lastResult = { date: state.result.date, score, passed, certNo };
  profile.passed = Boolean(profile.passed || passed);
  writeProfile(state.student.email, profile);

  renderResult();
  sendResultToSheet();
  showScreen("resultView");
}

function issueLocalCertificateNumber() {
  const year = new Date().getFullYear();
  const key = `sdnCertificateCounter:${year}`;
  const current = Number(localStorage.getItem(key) || "0") + 1;
  localStorage.setItem(key, String(current));
  return `${CONFIG.certificatePrefix}${String(current).padStart(4, "0")}`;
}

function renderResult() {
  const result = state.result;
  $("#scoreText").textContent = result.score;
  $("#resultTitle").textContent = result.passed ? "合格です" : "結果のお知らせ";
  $("#resultMessage").textContent = result.passed
    ? "おめでとうございます。Step by step 発達ナビゲーター認定試験に合格しました。下のボタンから修了証を保存してください。"
    : "おつかれさまでした。今回は合格点に届きませんでしたが、復習して再チャレンジできます。再テストは3回まで受験できます。";

  $("#certificateArea").classList.toggle("hidden", !result.passed);
  $("#certificateButtons").classList.toggle("hidden", !result.passed);
  if (result.passed) {
    $("#certName").textContent = `${state.student.name} 様`;
    $("#certDate").textContent = result.date;
    $("#certScore").textContent = `${result.score} / 30`;
    $("#certNumber").textContent = result.certNo;
  }

  const info = getAttemptInfo(state.student.email);
  const canRetry = !result.passed && info.completedAttempts < 4;
  $("#retryBtn").classList.toggle("hidden", !canRetry);
  if (!result.passed && !canRetry) {
    $("#resultMessage").textContent += " 再テスト可能回数の上限に達しました。";
  }

  $("#reviewList").innerHTML = result.details.map(({ question, userAnswer, correct }) => {
    const userText = userAnswer === "未回答" ? "未回答" : `${userAnswer}. ${question.choices[letters.indexOf(userAnswer)]}`;
    const answerText = `${question.answer}. ${question.choices[letters.indexOf(question.answer)]}`;
    return `<article class="review-card ${correct ? "correct" : "wrong"}"><p class="label">問題 ${question.id} ${correct ? "正解" : "不正解"}</p><h3>${question.text}</h3><p><strong>あなたの回答：</strong>${userText}</p><p><strong>正解：</strong>${answerText}</p><p><strong>解説：</strong>${question.explanation}</p></article>`;
  }).join("");
}

async function sendResultToSheet() {
  if (!CONFIG.appsScriptUrl) {
    $("#saveStatus").textContent = "結果はこの端末に保存されました。Googleスプレッドシート連携は未設定です。";
    return;
  }
  const payload = buildResultPayload();
  try {
    const response = await fetch(CONFIG.appsScriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    $("#saveStatus").textContent = "受験結果を送信しました。";
  } catch (error) {
    $("#saveStatus").textContent = "受験結果の保存に失敗しました。通信環境をご確認のうえ、必要に応じて画面をスクリーンショットで保存してください。";
  }
}

function buildResultPayload() {
  return {
    submittedAt: state.result.date,
    name: state.student.name,
    email: state.student.email,
    school: state.student.school,
    attemptNo: state.attemptNo,
    score: state.result.score,
    passed: state.result.passed ? "合格" : "不合格",
    certificateNo: state.result.certNo,
    questionIds: state.questions.map((q) => q.id).join(","),
    answers: state.result.details.map((d) => `${d.question.id}:${d.userAnswer}`).join(","),
    correctAnswers: state.result.details.map((d) => `${d.question.id}:${d.question.answer}`).join(","),
    correctness: state.result.details.map((d) => `${d.question.id}:${d.correct ? "○" : "×"}`).join(","),
    remainingTime: state.result.remainingTime
  };
}

function saveCertificateImage() {
  const cert = $("#certificateArea");
  const width = 1100;
  const height = 820;
  const html = new XMLSerializer().serializeToString(cert.cloneNode(true));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;background:#fffdf7;padding:24px;box-sizing:border-box;font-family:Yu Gothic,Meiryo,sans-serif;">${html}</div></foreignObject></svg>`;
  const image = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fffdf7";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0);
    URL.revokeObjectURL(url);
    const link = document.createElement("a");
    link.download = `${state.result.certNo}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  image.src = url;
}

$("#startForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const student = {
    name: $("#studentName").value.trim(),
    email: $("#studentEmail").value.trim(),
    school: $("#schoolName").value.trim()
  };
  if (!student.name || !student.email || !student.school || !$("#consent").checked) return;
  startExam(student);
});

$("#choices").addEventListener("change", (event) => {
  if (event.target.name !== "answer") return;
  const question = state.questions[state.currentIndex];
  state.answers[question.id] = event.target.value;
  $("#answeredCounter").textContent = `回答済み ${Object.keys(state.answers).length} / ${state.questions.length}`;
});

$("#prevBtn").addEventListener("click", () => {
  if (state.currentIndex > 0) {
    state.currentIndex -= 1;
    renderQuestion();
  }
});

$("#nextBtn").addEventListener("click", () => {
  if (state.currentIndex === state.questions.length - 1) {
    finishExam(false);
    return;
  }
  state.currentIndex += 1;
  renderQuestion();
});

$("#retryBtn").addEventListener("click", () => startExam(state.student));
$("#printPdfBtn").addEventListener("click", () => window.print());
$("#saveImageBtn").addEventListener("click", saveCertificateImage);

$("#studentEmail").addEventListener("input", (event) => {
  const email = event.target.value.trim();
  if (!email) {
    $("#attemptInfo").textContent = "";
    return;
  }
  const info = getAttemptInfo(email);
  $("#attemptInfo").textContent = `このブラウザでの受験済み回数：${info.completedAttempts}回 / 再テスト残り：${info.retestsLeft}回`;
});
