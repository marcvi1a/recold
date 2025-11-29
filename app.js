async function loadTranslations(lang) {
  const response = await fetch(`./translations/${lang}.json`);
  return await response.json();
}

async function applyLanguage() {
  const lang = localStorage.getItem("lang") || "en";
  const tr = await loadTranslations(lang);

  const mode = getMode();

  cameraStart.textContent = tr.cameraStart;

  bulletTitle.textContent = mode === "sauna"
    ? tr.bulletTitle_sauna
    : tr.bulletTitle_ice;

  bulletPoint1.textContent = mode === "sauna"
    ? tr.bulletPoint1_sauna
    : tr.bulletPoint1_ice;

  bulletPoint2.textContent = mode === "sauna"
    ? tr.bulletPoint2_sauna
    : tr.bulletPoint2_ice;

  bulletPoint3.textContent = mode === "sauna"
    ? tr.bulletPoint3_sauna
    : tr.bulletPoint3_ice;

  bulletPoint4.textContent = mode === "sauna"
    ? tr.bulletPoint4_sauna
    : tr.bulletPoint4_ice;

  bulletPoint5.textContent = mode === "sauna"
    ? tr.bulletPoint5_sauna
    : tr.bulletPoint5_ice;

  // contains HTML in both PT + EN
  bulletPoint6.innerHTML = mode === "sauna"
    ? tr.bulletPoint6_sauna
    : tr.bulletPoint6_ice;

  saunaButton.textContent = tr.saunaButton;
  iceButton.textContent = tr.iceButton;
  startButton.textContent = tr.startButton;
}


const COLOR_SAUNA = "#ef0241";
const COLOR_ICE = "#378de2";


const cameraPreview = document.getElementById("camera-preview");
const cameraStart = document.getElementById("camera-start");
const camera = document.getElementById("camera");


const bulletPoints = document.getElementById("bullet-points");
const bulletTitle = document.getElementById("bullet-title");
const bulletPoint1 = document.getElementById("bullet-point-1");
const bulletPoint2 = document.getElementById("bullet-point-2");
const bulletPoint3 = document.getElementById("bullet-point-3");
const bulletPoint4 = document.getElementById("bullet-point-4");
const bulletPoint5 = document.getElementById("bullet-point-5");
const bulletPoint6 = document.getElementById("bullet-point-6");


const timeDisplay = document.getElementById("time-display");
const timeCountdown = document.getElementById("time-countdown");
const timeControls = document.getElementById("time-controls");

const saunaButton = document.getElementById("menu-controls__sauna");
const iceButton = document.getElementById("menu-controls__ice");
const startButton = document.getElementById("menu-controls__start");




// --- Initialize mode if empty ---
if (!localStorage.getItem("mode")) {
  localStorage.setItem("mode", "ice");
}

const storedMode = localStorage.getItem("mode");

// --- Apply stored mode on page load ---
if (storedMode === "sauna") {
  timeDisplay.style.color = COLOR_SAUNA;
  startButton.style.background = COLOR_SAUNA;
  applyLanguage();
}

if (storedMode === "ice") {
  timeDisplay.style.color = COLOR_ICE;
  startButton.style.background = COLOR_ICE;
  applyLanguage();
}


// Initialize both countdown values if empty
if (!localStorage.getItem("time-countdown-sauna")) {
  localStorage.setItem("time-countdown-sauna", "600");
}

if (!localStorage.getItem("time-countdown-ice")) {
  localStorage.setItem("time-countdown-ice", "60");
}

const timeSlider = document.getElementById("time-slider");

function getMode() {
  return localStorage.getItem("mode") === "sauna" ? "sauna" : "ice";
}

function getSliderSettings() {
  if (getMode() === "sauna") {
    return { min: 60, max: 1800, step: 60, key: "time-countdown-sauna" };
  }
  return { min: 60, max: 600, step: 10, key: "time-countdown-ice" };
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
  const color = mode === "sauna" ? COLOR_SAUNA : COLOR_ICE;
  timeSlider.style.setProperty("--slider-color", color);
}

function updateSliderFill() {
  const value = (timeSlider.value - timeSlider.min) / (timeSlider.max - timeSlider.min) * 100;

  // mode color already coming from CSS variable
  const color = getMode() === "sauna" ? COLOR_SAUNA : COLOR_ICE;

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




cameraStart.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }
    });

    camera.srcObject = stream;

    cameraPreview.style.display = "none";
    camera.style.display = "block";

  } catch (err) {
    alert("Camera permission denied or unavailable.");
    console.error(err);
  }
});


timeSlider.addEventListener("input", () => {
  const { key } = getSliderSettings();
  localStorage.setItem(key, timeSlider.value);
  timeDisplay.textContent = formatTime(parseInt(timeSlider.value, 10));
  updateSliderFill();
});


saunaButton.addEventListener("click", () => {
  timeDisplay.style.color = COLOR_SAUNA;
  startButton.style.background = COLOR_SAUNA;

  localStorage.setItem("mode", "sauna");
  applySliderSettings();
  updateSliderColor();
  updateSliderFill();
  applyLanguage();
});

iceButton.addEventListener("click", () => {
  timeDisplay.style.color = COLOR_ICE;
  startButton.style.background = COLOR_ICE;

  localStorage.setItem("mode", "ice");
  applySliderSettings();
  updateSliderColor();
  updateSliderFill();
  applyLanguage();
});


startButton.addEventListener("click", startSession);

function startSession() {
  // hide existing UI
  bulletPoints.style.display = "none";
  timeDisplay.style.display = "none";
  timeControls.style.display = "none";
  timeCountdown.style.display = "flex";

  let countdown = 10;
  timeCountdown.textContent = countdown;

  const countdownInterval = setInterval(() => {
    countdown--;
    timeCountdown.textContent = countdown;

    if (countdown <= 0) {
      clearInterval(countdownInterval);
      beginMainTimer();
    }
  }, 1000);
}

function beginMainTimer() {
  let time = 0;
  const endTime = parseInt(timeSlider.value, 10);
  let finishedMark = false;

  timeCountdown.textContent = formatTime(time);

  const mainInterval = setInterval(() => {
    time++;

    timeCountdown.textContent = formatTime(time);

    // When reaches goal time, change color but keep counting
    if (!finishedMark && time >= endTime) {
      finishedMark = true;
      timeCountdown.style.color = "red";
    }
  }, 1000);

  // Replace the Start button with STOP
  startButton.textContent = "STOP";

  startButton.onclick = () => {
    clearInterval(mainInterval);
    resetToMainScreen();
  };
}

function resetToMainScreen() {
  bulletPoints.style.display = "flex";
  timeDisplay.style.display = "flex";
  timeControls.style.display = "flex";
  timeCountdown.style.display = "none";

  startButton.textContent = "Start";
  timeCountdown.style.color = "#171a1c";
}




applySliderSettings();
updateSliderColor();
applyLanguage();




const langSelect = document.getElementById("lang-select");

if (!localStorage.getItem("lang")) {
  localStorage.setItem("lang", "en");
}

langSelect.value = localStorage.getItem("lang");

langSelect.addEventListener("change", async (e) => {
  localStorage.setItem("lang", e.target.value);
  await applyLanguage();
});
