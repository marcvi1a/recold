const appTitleText = document.getElementById("app-title-text");

const APP_TITLE_SAUNA = "Brrreak your limits!";
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


// Initialize both countdown values if empty
if (!localStorage.getItem("time-countdown-sauna")) {
  localStorage.setItem("time-countdown-sauna", "600");
}

if (!localStorage.getItem("time-countdown-ice-bath")) {
  localStorage.setItem("time-countdown-ice-bath", "60");
}

const timeSlider = document.getElementById("time-slider");

function getMode() {
  return localStorage.getItem("mode") === "sauna" ? "sauna" : "ice-bath";
}

function getSliderSettings() {
  if (getMode() === "sauna") {
    return { min: 60, max: 1800, step: 60, key: "time-countdown-sauna" };
  }
  return { min: 60, max: 600, step: 10, key: "time-countdown-ice-bath" };
}

function applySliderSettings() {
  const { min, max, step, key } = getSliderSettings();
  timeSlider.min = min;
  timeSlider.max = max;
  timeSlider.step = step;
  timeSlider.value = localStorage.getItem(key) || step;
  timeDisplay.textContent = formatTime(parseInt(timeSlider.value, 10));
}

function updateSliderColor() {
  const mode = getMode();
  const color = mode === "sauna" ? COLOR_SAUNA : COLOR_ICE_BATH;
  timeSlider.style.setProperty("--slider-color", color);
}

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
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
  applySliderSettings();
});

iceBathButton.addEventListener("click", () => {
  iceBathButton.classList.add("selected");
  saunaButton.classList.remove("selected");
  timeDisplay.style.background = COLOR_ICE_BATH;
  startButton.style.background = COLOR_ICE_BATH;
  appTitleText.textContent = APP_TITLE_ICE_BATH;
  appTitleText.style.color = COLOR_ICE_BATH;

  localStorage.setItem("mode", "ice-bath");
  applySliderSettings();
});


timeSlider.addEventListener("input", () => {
  const { key } = getSliderSettings();
  localStorage.setItem(key, timeSlider.value);
  timeDisplay.textContent = formatTime(parseInt(timeSlider.value, 10));
});




applySliderSettings();
