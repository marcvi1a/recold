const appTitleText = document.getElementById("app-title-text");

const APP_TITLE_SAUNA = "Brrreak your limits!";
const APP_TITLE_ICE_BATH = "Brrreak your limits!";


const cameraPreview = document.getElementById("camera-preview");
const cameraStart = document.getElementById("camera-start");
const camera = document.getElementById("camera");


const bulletTitle = document.getElementById("bullet-title");
const bulletPoint1 = document.getElementById("bullet-point-1");
const bulletPoint2 = document.getElementById("bullet-point-2");
const bulletPoint3 = document.getElementById("bullet-point-3");
const bulletPoint4 = document.getElementById("bullet-point-4");
const bulletPoint5 = document.getElementById("bullet-point-5");
const bulletPoint6 = document.getElementById("bullet-point-6");

const BULLET_TITLE_SAUNA = "Sauna";
const BULLET_TITLE_ICE_BATH = "Gelo";
const BULLET_POINT_1_SAUNA = "Temperatura acima de 60 ºC";
const BULLET_POINT_1_ICE_BATH = "Água abaixo de 15 ºC";
const BULLET_POINT_2_SAUNA = "p2";
const BULLET_POINT_2_ICE_BATH = "Min 1 min para aumentar adrenalina e dopamina";
const BULLET_POINT_3_SAUNA = "p3";
const BULLET_POINT_3_ICE_BATH = "Max 3 min de imersão completa até o pescoço";
const BULLET_POINT_4_SAUNA = "p4";
const BULLET_POINT_4_ICE_BATH = "Até 10 min só pernas para recuperação muscular";
const BULLET_POINT_5_SAUNA = "p5";
const BULLET_POINT_5_ICE_BATH = "11 min totais por semana com 3 a 5 mergulhos.";
const BULLET_POINT_6_SAUNA = "p6";
const BULLET_POINT_6_ICE_BATH = "<a href='https://gelohealth.com.br/primeiro' target='_blank'>Dicas primeiro mergulho</a>";


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
  bulletTitle.textContent = BULLET_TITLE_SAUNA;
  bulletPoint1.textContent = BULLET_POINT_1_SAUNA;
  bulletPoint2.textContent = BULLET_POINT_2_SAUNA;
  bulletPoint3.textContent = BULLET_POINT_3_SAUNA;
  bulletPoint4.textContent = BULLET_POINT_4_SAUNA;
  bulletPoint5.textContent = BULLET_POINT_5_SAUNA;
  bulletPoint6.innerHTML = BULLET_POINT_6_SAUNA;
}

if (storedMode === "ice-bath") {
  timeDisplay.style.color = COLOR_ICE_BATH;
  startButton.style.background = COLOR_ICE_BATH;
  appTitleText.textContent = APP_TITLE_ICE_BATH;
  appTitleText.style.color = COLOR_ICE_BATH;
  bulletTitle.textContent = BULLET_TITLE_ICE_BATH;
  bulletPoint1.textContent = BULLET_POINT_1_ICE_BATH;
  bulletPoint2.textContent = BULLET_POINT_2_ICE_BATH;
  bulletPoint3.textContent = BULLET_POINT_3_ICE_BATH;
  bulletPoint4.textContent = BULLET_POINT_4_ICE_BATH;
  bulletPoint5.textContent = BULLET_POINT_5_ICE_BATH;
  bulletPoint6.innerHTML = BULLET_POINT_6_ICE_BATH;
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


saunaButton.addEventListener("click", () => {
  timeDisplay.style.color = COLOR_SAUNA;
  startButton.style.background = COLOR_SAUNA;
  appTitleText.textContent = APP_TITLE_SAUNA;
  appTitleText.style.color = COLOR_SAUNA;
  bulletTitle.textContent = BULLET_TITLE_SAUNA;
  bulletPoint1.textContent = BULLET_POINT_1_SAUNA;
  bulletPoint2.textContent = BULLET_POINT_2_SAUNA;
  bulletPoint3.textContent = BULLET_POINT_3_SAUNA;
  bulletPoint4.textContent = BULLET_POINT_4_SAUNA;
  bulletPoint5.textContent = BULLET_POINT_5_SAUNA;
  bulletPoint6.innerHTML = BULLET_POINT_6_SAUNA;

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
  bulletTitle.textContent = BULLET_TITLE_ICE_BATH;
  bulletPoint1.textContent = BULLET_POINT_1_ICE_BATH;
  bulletPoint2.textContent = BULLET_POINT_2_ICE_BATH;
  bulletPoint3.textContent = BULLET_POINT_3_ICE_BATH;
  bulletPoint4.textContent = BULLET_POINT_4_ICE_BATH;
  bulletPoint5.textContent = BULLET_POINT_5_ICE_BATH;
  bulletPoint6.innerHTML = BULLET_POINT_6_ICE_BATH;

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
