const appTitleText = document.getElementById("app-title-text");

const APP_TITLE_SAUNA = "Beauty and the heat";
const APP_TITLE_ICE_BATH = "Brrreak your limits!";


const cameraPreview = document.getElementById("camera-preview");
const cameraStart = document.getElementById("camera-start");
const camera = document.getElementById("camera");


const saunaButton = document.getElementById("start-controls__sauna");
const iceBathButton = document.getElementById("start-controls__ice-bath");
const COLOR_SAUNA = "#ef0241";
const COLOR_ICE_BATH = "#378de2";
const timeDisplay = document.getElementById("time-display");
const startButton = document.getElementById("start-controls__start");

// --- Initialize mode if empty ---
if (!localStorage.getItem("mode")) {
  localStorage.setItem("mode", "ice-bath");
}

const storedMode = localStorage.getItem("mode");

// --- Apply stored mode on page load ---
if (storedMode === "sauna") {
  saunaButton.classList.add("selected");
  iceBathButton.classList.remove("selected");
  timeDisplay.style.background = COLOR_SAUNA;
  startButton.style.background = COLOR_SAUNA;
  appTitleText.textContent = APP_TITLE_SAUNA;
  appTitleText.style.color = COLOR_SAUNA;
}

if (storedMode === "ice-bath") {
  iceBathButton.classList.add("selected");
  saunaButton.classList.remove("selected");
  timeDisplay.style.background = COLOR_ICE_BATH;
  startButton.style.background = COLOR_ICE_BATH;
  appTitleText.textContent = APP_TITLE_ICE_BATH;
  appTitleText.style.color = COLOR_ICE_BATH;
}


// --- Time settings ---

const TIME_TIMER = 0; // always 0

const SINGLE_STEP_SAUNA = 60;
const SINGLE_STEP_ICE_BATH = 10;

const DOUBLE_STEP_SAUNA = 180;
const DOUBLE_STEP_ICE_BATH = 40;

const MAX_SAUNA = 3600;
const MAX_ICE_BATH = 600;

// Initialize both countdown values if empty
if (!localStorage.getItem("time-countdown-sauna")) {
  localStorage.setItem("time-countdown-sauna", "600");
}

if (!localStorage.getItem("time-countdown-ice-bath")) {
  localStorage.setItem("time-countdown-ice-bath", "60");
}

const buttonTimer = document.getElementById("time-controls__timer");
const buttonCountdown = document.getElementById("time-controls__countdown");

const buttonLess = document.getElementById("time-controls__less");
const buttonMore = document.getElementById("time-controls__more");

function getMode() {
  return localStorage.getItem("mode") === "sauna" ? "sauna" : "ice-bath";
}

function getActiveCountdown() {
  const mode = getMode();
  if (mode === "sauna") {
    return parseInt(localStorage.getItem("time-countdown-sauna"), 10);
  } else {
    return parseInt(localStorage.getItem("time-countdown-ice-bath"), 10);
  }
}

function setActiveCountdown(value) {
  const mode = getMode();
  if (mode === "sauna") {
    localStorage.setItem("time-countdown-sauna", value);
  } else {
    localStorage.setItem("time-countdown-ice-bath", value);
  }
}

function getSingleStep() {
  return getMode() === "sauna"
    ? SINGLE_STEP_SAUNA
    : SINGLE_STEP_ICE_BATH;
}

function getDoubleStep() {
  return getMode() === "sauna"
    ? DOUBLE_STEP_SAUNA
    : DOUBLE_STEP_ICE_BATH;
}

function getMaxTime() {
  return getMode() === "sauna" ? MAX_SAUNA : MAX_ICE_BATH;
}

function updateTimeControls() {
  if (buttonTimer.classList.contains("selected")) {
    // Timer mode → always 0
    timeDisplay.textContent = formatTime(TIME_TIMER);
    buttonLess.disabled = true;
    buttonMore.disabled = true;
  } else {
    // Countdown mode for the selected mode (sauna / ice bath)
    timeDisplay.textContent = formatTime(getActiveCountdown());
    buttonLess.disabled = false;
    buttonMore.disabled = false;
  }
}

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// --- Initialize time mode (timer or countdown) ---
if (!localStorage.getItem("time-mode")) {
  localStorage.setItem("time-mode", "countdown");
}

const storedTimeMode = localStorage.getItem("time-mode");

// Apply stored time mode
if (storedTimeMode === "timer") {
  buttonTimer.classList.add("selected");
  buttonCountdown.classList.remove("selected");
} else {
  // default: countdown
  buttonCountdown.classList.add("selected");
  buttonTimer.classList.remove("selected");
}




cameraStart.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }
    });

    camera.srcObject = stream;

    cameraPreview.style.display = "none";
    camera.style.display = "block";

    document.getElementById("camera-controls__invert").disabled = false;
    document.getElementById("camera-controls__video").disabled = false;
    document.getElementById("camera-controls__photos").disabled = false;

    document.getElementById("camera-controls__video").classList.add("selected");

  } catch (err) {
    alert("Camera permission denied or unavailable.");
    console.error(err);
  }
});


saunaButton.addEventListener("click", () => {
  saunaButton.classList.add("selected");
  iceBathButton.classList.remove("selected");
  timeDisplay.style.background = COLOR_SAUNA;
  startButton.style.background = COLOR_SAUNA;
  appTitleText.textContent = APP_TITLE_SAUNA;
  appTitleText.style.color = COLOR_SAUNA;

  localStorage.setItem("mode", "sauna");
  updateTimeControls();
});

iceBathButton.addEventListener("click", () => {
  iceBathButton.classList.add("selected");
  saunaButton.classList.remove("selected");
  timeDisplay.style.background = COLOR_ICE_BATH;
  startButton.style.background = COLOR_ICE_BATH;
  appTitleText.textContent = APP_TITLE_ICE_BATH;
  appTitleText.style.color = COLOR_ICE_BATH;

  localStorage.setItem("mode", "ice-bath");
  updateTimeControls();
});


buttonTimer.addEventListener("click", () => {
  buttonTimer.classList.add("selected");
  buttonCountdown.classList.remove("selected");
  localStorage.setItem("time-mode", "timer");
  updateTimeControls();
});

buttonCountdown.addEventListener("click", () => {
  buttonCountdown.classList.add("selected");
  buttonTimer.classList.remove("selected");
  localStorage.setItem("time-mode", "countdown");
  updateTimeControls();
});

buttonLess.addEventListener("click", () => {
  let value = getActiveCountdown();
  value = Math.max(0, value - getSingleStep());
  setActiveCountdown(value);
  updateTimeControls();
});

buttonLess.addEventListener("dblclick", () => {
  let value = getActiveCountdown();
  value = Math.max(0, value - getDoubleStep());
  setActiveCountdown(value);
  updateTimeControls();
});

buttonMore.addEventListener("click", () => {
  let value = getActiveCountdown();
  value = Math.min(getMaxTime(), value + getSingleStep());
  setActiveCountdown(value);
  updateTimeControls();
});

buttonMore.addEventListener("dblclick", () => {
  let value = getActiveCountdown();
  value = Math.min(getMaxTime(), value + getDoubleStep());
  setActiveCountdown(value);
  updateTimeControls();
});




updateTimeControls();
