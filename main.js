/* =========================================
   SCORM & Form Logic
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
  var ethicsError = document.getElementById("ethicsError");


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

function setInteractionAt(index, id, type, response, result) {
  if (!lmsConnected) return;

  scorm.set("cmi.interactions." + index + ".id", id);
  scorm.set("cmi.interactions." + index + ".type", type);
  scorm.set("cmi.interactions." + index + ".student_response", String(response));
  scorm.set("cmi.interactions." + index + ".result", result || "neutral");
}

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
  var ethicsOk = ethicalCheck.checked; // חדש



  return nameOk && q2Ok && q3Ok && radioOk && ethicsOk;
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

  function updateEthicsUI() {
  if (ethicalCheck.checked) {
    if (ethicsError) ethicsError.classList.add("d-none");
    ethicalCheck.classList.remove("is-invalid");
  } else {
    if (ethicsError) ethicsError.classList.remove("d-none");
    ethicalCheck.classList.add("is-invalid");
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


  function getCheckedOccupationValue() {
  var radios = document.getElementsByName("q1");
  for (var i = 0; i < radios.length; i++) {
    if (radios[i].checked) return radios[i].value;
  }
  return "";
}

  // -----------------------
  // שמירת טופס ל-LMS (submit)
  // -----------------------
function saveToLMS() {
  if (!lmsConnected) return;

  var data = getSuspendObject();

  data.form = {
    participant_name: fullName.value.trim(),
    occupation: getCheckedOccupationValue(),
    experience: q2.value,
    availability: q3.value,
    ethics_approved: ethicalCheck.checked,
    submission_time: new Date().toLocaleString()
  };

  saveSuspendObject(data);

  // רק set, בלי commit
  scorm.set("cmi.core.lesson_status", "completed");

  console.log("Prepared for save:", data.form);
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
  updateEthicsUI();
  updateSubmitState();
});




  // -----------------------
// Bootstrap Modal handling
// -----------------------
var modalElement = document.getElementById("modal-submit");
var submitModal = modalElement ? new bootstrap.Modal(modalElement) : null;
var stateLoading = document.getElementById("state-loading");
var stateSuccess = document.getElementById("state-success");


function showLoadingState() {
  if (!submitModal || !stateLoading || !stateSuccess) return;
  stateLoading.classList.remove("d-none");
  stateSuccess.classList.add("d-none");
  submitModal.show();
}

function showSuccessState() {
  if (!submitModal || !stateLoading || !stateSuccess) return;
  stateLoading.classList.add("d-none");
  stateSuccess.classList.remove("d-none");
}

form.addEventListener("submit", function (e) {
  e.preventDefault();

  if (!checkFormValidity()) {
    updateNameUI();
    updateEthicsUI();
    updateSubmitState();
    return;
  }

  showLoadingState();

  setTimeout(function () {

    // 1) interactions
    setInteractionAt(0, "ethics_approved", "true-false", ethicalCheck.checked ? "true" : "false", "neutral");
    setInteractionAt(1, "full_name", "fill-in", fullName.value.trim(), "neutral");
    setInteractionAt(2, "occupation", "choice", getCheckedOccupationValue(), "neutral");
    setInteractionAt(3, "experience", "choice", q2.value, "neutral");
    setInteractionAt(4, "availability", "choice", q3.value, "neutral");

    // 2) suspend_data + lesson_status (בלי commit)
    saveToLMS();

    // 3) ✅ commit אחד לכל מה שנצבר
    if (lmsConnected) scorm.save();

    showSuccessState();
  }, 300);
});




  // מצב התחלתי
  updateNameUI();
  updateEthicsUI();
  updateSubmitState();
  
});

// ניתוק בטוח מה-LMS בסגירת חלון
window.onunload = function () {
  if (lmsConnected) {
    scorm.quit();
  }
};

