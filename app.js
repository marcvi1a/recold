const appTitleText = document.getElementById("app-title-text");

const APP_TITLE_SAUNA = "Brrreak your limits!";
const APP_TITLE_ICE_BATH = "Brrreak your limits!";


const cameraPreview = document.getElementById("camera-preview");
const cameraStart = document.getElementById("camera-start");
const camera = document.getElementById("camera");

let currentFacingMode = "user";
let cameraStream = null;


const saunaButton = document.getElementById("menu-controls__sauna");
const iceBathButton = document.getElementById("menu-controls__ice-bath");
const COLOR_SAUNA = "#ef0241";
const COLOR_ICE_BATH = "#378de2";
const timeDisplay = document.getElementById("time-display");
const startButton = document.getElementById("menu-controls__start");

// --- Initialize mode if empty ---
if (!localStorage.getItem("mode")) {
  localStorage.setItem("mode", "ice-bath");
}

const storedMode = localStorage.getItem("mode");

// --- Apply stored mode on page load ---
if (storedMode === "sauna") {
  timeDisplay.style.color = COLOR_SAUNA;
  startButton.style.background = COLOR_SAUNA;
  appTitleText.textContent = APP_TITLE_SAUNA;
  appTitleText.style.color = COLOR_SAUNA;
}

if (storedMode === "ice-bath") {
  timeDisplay.style.color = COLOR_ICE_BATH;
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
  updateSliderFill();
}

function updateSliderColor() {
  const mode = getMode();
  const color = mode === "sauna" ? COLOR_SAUNA : COLOR_ICE_BATH;
  timeSlider.style.setProperty("--slider-color", color);
}

function updateSliderFill() {
  const value = (timeSlider.value - timeSlider.min) / (timeSlider.max - timeSlider.min) * 100;

  // mode color already coming from CSS variable
  const color = getMode() === "sauna" ? COLOR_SAUNA : COLOR_ICE_BATH;

  timeSlider.style.background = `
    linear-gradient(90deg,
      ${color} ${value}%,
      #dfdfdf ${value}%)
  `;
}

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}




async function startCamera() {
  // Stop old stream
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentFacingMode },
      audio: false,
    });

    cameraStream = stream;
    camera.srcObject = stream;

    cameraPreview.style.display = "none";
    camera.style.display = "block";

    // Show the reverse-camera button once camera is active
    switchCameraBtn.style.display = "flex";
  } catch (err) {
    alert("Camera permission denied or unavailable.");
    console.error(err);

    // Hide button if camera fails
    switchCameraBtn.style.display = "none";
  }
}

cameraStart.addEventListener("click", startCamera);

switchCameraBtn.addEventListener("click", async () => {
  currentFacingMode =
    currentFacingMode === "user" ? "environment" : "user";
  await startCamera();
});


saunaButton.addEventListener("click", () => {
  timeDisplay.style.color = COLOR_SAUNA;
  startButton.style.background = COLOR_SAUNA;
  appTitleText.textContent = APP_TITLE_SAUNA;
  appTitleText.style.color = COLOR_SAUNA;

  localStorage.setItem("mode", "sauna");
  applySliderSettings();
  updateSliderColor();
  updateSliderFill();
});

iceBathButton.addEventListener("click", () => {
  timeDisplay.style.color = COLOR_ICE_BATH;
  startButton.style.background = COLOR_ICE_BATH;
  appTitleText.textContent = APP_TITLE_ICE_BATH;
  appTitleText.style.color = COLOR_ICE_BATH;

  localStorage.setItem("mode", "ice-bath");
  applySliderSettings();
  updateSliderColor();
  updateSliderFill();
});


timeSlider.addEventListener("input", () => {
  const { key } = getSliderSettings();
  localStorage.setItem(key, timeSlider.value);
  timeDisplay.textContent = formatTime(parseInt(timeSlider.value, 10));
  updateSliderFill();
});




applySliderSettings();
updateSliderColor();
