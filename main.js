/* =========================================
   SCORM & Form Logic - גרסה תואמת חומר נלמד
   ========================================= */

// אובייקט SCORM של pipwerks
var scorm = pipwerks.SCORM;
var lmsConnected = false;

document.addEventListener("DOMContentLoaded", function () {

  // 1) אתחול חיבור ל-LMS
  lmsConnected = scorm.init();
  if (lmsConnected) {
    console.log("SCORM: Connected to LMS.");
  } else {
    console.log("SCORM: LMS not found, working locally.");
  }

  // 2) הגדרת אלמנטים
  var form = document.getElementById("quiz-form");
  var fullName = document.getElementById("fullName");
  var nameError = document.getElementById("nameError");
  var q2 = document.getElementById("q2select");
  var q3 = document.getElementById("q3select");
  var submitBtn = document.getElementById("submitBtn");
  var ethicalCheck = document.getElementById("checkDefault");

// =======================
// מנגנון חיפוש + הסתרת FORM
// =======================
var searchInput = document.getElementById("searchInput");
var searchBtn = document.getElementById("searchBtn");

var formSection = document.getElementById("form");
var contentSection = document.getElementById("contentUnits");
var cards = contentSection.getElementsByClassName("card");

function applySearch() {
  var q = searchInput.value.trim().toLowerCase();

  // 1) להסתיר/להראות את סקשן הטופס לפי האם יש חיפוש
  if (q !== "") {
    formSection.classList.add("d-none");      // מסתיר את הטופס
    contentSection.classList.remove("d-none"); // מוודא שתוצאות מוצגות
  } else {
    formSection.classList.remove("d-none");   // מחזיר את הטופס
  }

  // 2) סינון כרטיסים
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];

    var titleEl = card.getElementsByClassName("card-title")[0];
    var titleText = titleEl ? titleEl.textContent.toLowerCase() : "";

    var textEl = card.getElementsByClassName("card-text")[0];
    var descText = textEl ? textEl.textContent.toLowerCase() : "";

    var match = (q === "") || (titleText.indexOf(q) !== -1) || (descText.indexOf(q) !== -1);

    var wrapper = card.closest('[class*="col-"]');

    if (wrapper) {
      if (match) wrapper.classList.remove("d-none");
      else wrapper.classList.add("d-none");
    }
  }

  // 3) אם יש חיפוש – קופצים לתוצאות כדי שיופיעו מיד אחרי
  if (q !== "") {
    contentSection.scrollIntoView({ behavior: "smooth" });
  }
}

searchInput.addEventListener("input", function () {
  applySearch();
});

searchBtn.addEventListener("click", function () {
  applySearch();
});

searchInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    applySearch();
  }
});



  // -----------------------
  // SCORM suspend_data helpers
  // -----------------------
  function getSuspendObject() {
    if (!lmsConnected) return {};

    var raw = scorm.get("cmi.suspend_data");
    if (!raw) return {};

    try {
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  }

  function saveSuspendObject(obj) {
    if (!lmsConnected) return;

    scorm.set("cmi.suspend_data", JSON.stringify(obj));
    scorm.save();
  }

  // -----------------------
  // פונקציות אימות (Validation)
  // -----------------------

  function isAllowedNameChar(ch) {
    var code = ch.charCodeAt(0);

    // רווח / מקף / גרש
    if (ch === " " || ch === "-" || ch === "'") return true;

    // English A-Z
    if (code >= 65 && code <= 90) return true;

    // English a-z
    if (code >= 97 && code <= 122) return true;

    // Hebrew (טווח בסיסי)
    if (code >= 0x0590 && code <= 0x05FF) return true;

    return false;
  }

  function isNameValid() {
    var value = fullName.value.trim();
    if (value.length < 2) return false;

    for (var i = 0; i < value.length; i++) {
      if (!isAllowedNameChar(value.charAt(i))) return false;
    }
    return true;
  }

  function isRadioChecked() {
    var radios = document.getElementsByName("q1");
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].checked) return true;
    }
    return false;
  }

  function checkFormValidity() {
    var nameOk = isNameValid();
    var q2Ok = (q2.value !== "");
    var q3Ok = (q3.value !== "");
    var radioOk = isRadioChecked();

    return nameOk && q2Ok && q3Ok && radioOk;
  }

  // -----------------------
  // UI: שגיאה/הצלחה לשם
  // -----------------------
  function updateNameUI() {
    var ok = isNameValid();

    if (ok) {
      nameError.classList.add("d-none");
      fullName.classList.remove("is-invalid");
      fullName.classList.add("is-valid");
    } else {
      if (fullName.value.trim() !== "") {
        nameError.classList.remove("d-none");
        fullName.classList.add("is-invalid");
        fullName.classList.remove("is-valid");
      } else {
        nameError.classList.add("d-none");
        fullName.classList.remove("is-invalid");
        fullName.classList.remove("is-valid");
      }
    }
  }

  function updateSubmitState() {
    var ready = checkFormValidity();
    submitBtn.disabled = !ready;

    if (ready) submitBtn.classList.remove("btn-disabled");
    else submitBtn.classList.add("btn-disabled");
  }

  // -----------------------
  // תהליך נפרד: שמירת checkbox ל-LMS
  // -----------------------
  function saveEthicsToLMS() {
    if (!lmsConnected) return;

    var data = getSuspendObject();

    data.ethics = {
      approved: ethicalCheck.checked,
      time: new Date().toLocaleString()
    };

    saveSuspendObject(data);
    console.log("Ethics saved:", data.ethics);
  }

  function restoreEthicsFromLMS() {
    if (!lmsConnected) return;

    var data = getSuspendObject();
    if (data.ethics && typeof data.ethics.approved === "boolean") {
      ethicalCheck.checked = data.ethics.approved;
    }
  }

  // -----------------------
  // שמירת טופס ל-LMS (submit)
  // -----------------------
  function getCheckedOccupationValue() {
    var radios = document.getElementsByName("q1");
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].checked) return radios[i].value;
    }
    return "";
  }

  function saveToLMS() {
    if (!lmsConnected) return;

    // כדי לא לדרוס ethics, נבנה על אובייקט קיים
    var data = getSuspendObject();

    data.form = {
      participant_name: fullName.value.trim(),
      occupation: getCheckedOccupationValue(),
      experience: q2.value,
      availability: q3.value,
      submission_time: new Date().toLocaleString()
    };

    // שמירה ב-suspend_data
    saveSuspendObject(data);

    // סטטוס "completed" רק של הטופס
    scorm.set("cmi.core.lesson_status", "completed");
    scorm.save();

    console.log("Form saved:", data.form);
  }

  // -----------------------
  // אירועים (Events)
  // -----------------------
  fullName.addEventListener("input", function () {
    updateNameUI();
    updateSubmitState();
  });

  q2.addEventListener("change", function () {
    updateSubmitState();
  });

  q3.addEventListener("change", function () {
    updateSubmitState();
  });

  var radios = document.getElementsByName("q1");
  for (var i = 0; i < radios.length; i++) {
    radios[i].addEventListener("change", function () {
      updateSubmitState();
    });
  }

  ethicalCheck.addEventListener("change", function () {
    saveEthicsToLMS(); // תהליך נפרד
  });

  // -----------------------
// Bootstrap Modal handling
// -----------------------
var modalElement = document.getElementById("modal-submit");
var submitModal = new bootstrap.Modal(modalElement);

var stateLoading = document.getElementById("state-loading");
var stateSuccess = document.getElementById("state-success");

function showLoadingState() {
  stateLoading.classList.remove("d-none");
  stateSuccess.classList.add("d-none");
  submitModal.show();
}

function showSuccessState() {
  stateLoading.classList.add("d-none");
  stateSuccess.classList.remove("d-none");
}


form.addEventListener("submit", function (e) {
  e.preventDefault();

  if (!checkFormValidity()) {
    updateNameUI();
    updateSubmitState();
    return;
  }

  // 1) פתיחת מודאל + מצב טעינה
  showLoadingState();

  // 2) סימולציה של שליחה (כמו LMS אמיתי)
  setTimeout(function () {
    saveToLMS();

    // 3) מעבר למצב הצלחה
    showSuccessState();
  }, 1200);
});

  // מצב התחלתי
  restoreEthicsFromLMS();
  updateNameUI();
  updateSubmitState();
});

// ניתוק בטוח מה-LMS בסגירת חלון
window.onunload = function () {
  if (lmsConnected) {
    scorm.quit();
  }
};
