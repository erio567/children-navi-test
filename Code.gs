const SPREADSHEET_ID = "ここにスプレッドシートIDを入れてください";
const SHEET_NAME = "results";
const START_NUMBER = 1;

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || "{}");
  const sheet = getSheet_();
  const certificateNo = payload.passed === "合格" ? issueCertificateNo_(sheet) : "未発行";

  sheet.appendRow([
    new Date(),
    payload.name || "",
    payload.email || "",
    payload.school || "",
    payload.attemptNo || "",
    payload.score || "",
    payload.passed || "",
    certificateNo,
    payload.questionIds || "",
    payload.answers || "",
    payload.correctAnswers || "",
    payload.correctness || "",
    payload.remainingTime || ""
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, certificateNo }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "受験日時", "氏名", "メールアドレス", "教室名", "受験回数", "点数", "合否", "認定番号",
      "出題された問題番号", "各問題の回答", "各問題の正解", "各問題の正誤", "残り時間"
    ]);
  }
  return sheet;
}

function issueCertificateNo_(sheet) {
  const lastRow = sheet.getLastRow();
  let count = 0;
  if (lastRow >= 2) {
    const values = sheet.getRange(2, 8, lastRow - 1, 1).getValues().flat();
    count = values.filter(value => String(value).startsWith("SDN-2026-")).length;
  }
  const next = START_NUMBER + count;
  return "SDN-2026-" + String(next).padStart(4, "0");
}
