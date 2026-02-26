import { dom, COLOR_SAUNA, COLOR_ICE, TIMED_MESSAGES } from "./config.js";
import { getMode, applyLanguage, getTranslation } from "./i18n.js";
import {
  cameraPermissions, capturePhoto, beginRecording, stopRecording,
  resetCapturedMedia, displayMedia, showFlipCameraButton, hideFlipCameraButton,
} from "./camera.js";

// ─── Session state ────────────────────────────────────────────────────────────

let state = "idle"; // idle | countdown | running
export function getState() { return state; }

let countdownInterval = null;
let mainInterval      = null;
let photoInterval     = null;
let time              = 0;

// ─── Slider helpers ───────────────────────────────────────────────────────────

export function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function getSliderSettings() {
  if (getMode() === "sauna") {
    return { min: 60, max: 1800, step: 60, key: "time-countdown-sauna" };
  }
  return { min: 60, max: 600, step: 10, key: "time-countdown-ice" };
}

export function applySliderSettings() {
  const { min, max, step, key } = getSliderSettings();
  dom.timeSlider.min   = min;
  dom.timeSlider.max   = max;
  dom.timeSlider.step  = step;
  dom.timeSlider.value = localStorage.getItem(key) || step;
  dom.timeDisplay.textContent = formatTime(parseInt(dom.timeSlider.value, 10));
  updateSliderFill();
}

export function updateSliderColor() {
  const color = getMode() === "sauna" ? COLOR_SAUNA : COLOR_ICE;
  dom.timeSlider.style.setProperty("--slider-color", color);
}

export function updateSliderFill() {
  const pct   = (dom.timeSlider.value - dom.timeSlider.min)
              / (dom.timeSlider.max   - dom.timeSlider.min) * 100;
  const color = getMode() === "sauna" ? COLOR_SAUNA : COLOR_ICE;
  dom.timeSlider.style.background = `linear-gradient(90deg, ${color} ${pct}%, #dfdfdf ${pct}%)`;
}

// ─── Base color helper ────────────────────────────────────────────────────────

function getBaseColor() {
  return cameraPermissions
    ? "rgba(245, 245, 247, 0.5)"
    : "rgba(5, 5, 7, 0.1)";
}

function color80(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.8)`;
}

// ─── Live messages ────────────────────────────────────────────────────────────

export function pushLiveMessage(text) {
  const msg = document.createElement("div");
  msg.className   = "live-message";
  msg.textContent = text;
  dom.liveMessages.appendChild(msg);
  void msg.offsetWidth;

  setTimeout(() => {
    msg.style.animation = "chatOut 0.4s ease-out forwards";
    setTimeout(() => msg.remove(), 400);
  }, 4000);

  if (dom.liveMessages.children.length > 10) {
    dom.liveMessages.removeChild(dom.liveMessages.firstChild);
  }
}

// ─── UI states ────────────────────────────────────────────────────────────────

function applyStopUI() {
  dom.timeDisplay.style.display           = "none";
  dom.timeControls.style.pointerEvents    = "none";
  dom.timeControls.style.opacity          = "0";

  if (!cameraPermissions) {
    dom.cameraPreview.style.display       = "none";
    dom.cameraStart.style.display         = "none";
    dom.timeContainer.style.marginTop     = "auto";
  }
  hideFlipCameraButton();

  dom.timeCountdown.style.background = getBaseColor();
  dom.timeCountdown.style.display    = "block";
  dom.saunaButton.style.display      = "none";
  dom.iceButton.style.display        = "none";
  dom.startButton.style.display      = "none";
  dom.stopButton.style.display       = "block";
}

function applyExitUI() {
  dom.cameraContainer.style.display  = "none";
  dom.cameraStart.style.display      = "none";
  dom.timeCountdown.style.display    = "none";
  dom.timeContainer.style.display    = "none";

  displayMedia();
  dom.mediaLinks.style.display       = "block";

  dom.stopButton.style.display       = "none";
  dom.exitButton.style.display       = "block";
}

function applyStartUI() {
  dom.mediaLinks.style.display       = "none";
  dom.timeContainer.style.display    = "block";
  dom.cameraContainer.style.display  = "block";

  if (!cameraPermissions) {
    dom.cameraPreview.style.display  = "block";
    dom.cameraStart.style.display    = "block";
    dom.timeContainer.style.marginTop = "";
  }
  showFlipCameraButton();

  dom.timeDisplay.style.display      = "block";
  dom.timeControls.style.pointerEvents = "";
  dom.timeControls.style.opacity     = "";
  dom.exitButton.style.display       = "none";
  dom.saunaButton.style.display      = "block";
  dom.iceButton.style.display        = "block";
  dom.startButton.style.display      = "block";
}

// ─── Session flow ─────────────────────────────────────────────────────────────

function startCountdown() {
  state = "countdown";

  applyStopUI();
  dom.menuMessage.style.display  = "flex";
  dom.menuControls.style.display = "none";

  resetCapturedMedia();

  let countdown = 3;
  dom.timeCountdown.textContent = countdown;

  countdownInterval = setInterval(() => {
    countdown--;
    dom.timeCountdown.textContent = countdown;

    if (countdown <= 0) {
      clearInterval(countdownInterval);
      dom.timeCountdown.textContent = formatTime(0);
      beginMainTimer();
      beginRecording();
    }
  }, 1000);
}

function beginMainTimer() {
  state = "running";

  if (cameraPermissions) {
    capturePhoto();
    photoInterval = setInterval(capturePhoto, 10000);
  }

  dom.menuMessage.style.display  = "none";
  dom.menuControls.style.display = "flex";

  time = 0;
  const endTime     = parseInt(dom.timeSlider.value, 10);
  let finishedMark  = false;
  const themeColor  = () => getMode() === "sauna" ? COLOR_SAUNA : COLOR_ICE;

  mainInterval = setInterval(() => {
    time++;
    dom.timeCountdown.textContent = formatTime(time);

    const mode = getMode();
    if (TIMED_MESSAGES[mode][time]) {
      pushLiveMessage(TIMED_MESSAGES[mode][time]);
    }

    const fill = (time / endTime) * 100;
    const tc   = themeColor();

    if (!finishedMark) {
      dom.timeCountdown.style.background = `linear-gradient(90deg, ${color80(tc)} ${fill}%, ${getBaseColor()} ${fill}%)`;
    }

    if (!finishedMark && time >= endTime) {
      finishedMark = true;
      getTranslation("goalReached", { time: formatTime(endTime) }).then(pushLiveMessage);
      setTimeout(() => getTranslation("congrats").then(pushLiveMessage), 500);
      dom.timeCountdown.style.background = tc;
    }
  }, 1000);
}

export function stopSession() {
  state = "idle";

  stopRecording(applyExitUI, { mode: getMode(), elapsedSeconds: time });
  clearInterval(photoInterval);
  clearInterval(countdownInterval);
  clearInterval(mainInterval);

  dom.liveMessages.innerHTML = "";

  const tc = getMode() === "sauna" ? COLOR_SAUNA : COLOR_ICE;
  dom.timeCountdown.style.background = `linear-gradient(90deg, ${color80(tc)} 0%, ${getBaseColor()} 0%)`;
}

function exitSession() {
  applyStartUI();
}

// ─── Mode buttons ─────────────────────────────────────────────────────────────

function applyMode(color) {
  dom.timeDisplay.style.color    = color;
  dom.startButton.style.background = color;
  dom.stopButton.style.background  = color;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initTimer() {
  // Ensure defaults
  if (!localStorage.getItem("time-countdown-sauna")) localStorage.setItem("time-countdown-sauna", "600");
  if (!localStorage.getItem("time-countdown-ice"))   localStorage.setItem("time-countdown-ice",   "60");
  if (!localStorage.getItem("mode"))                  localStorage.setItem("mode", "ice");

  // Apply stored mode colours
  const mode = getMode();
  applyMode(mode === "sauna" ? COLOR_SAUNA : COLOR_ICE);

  // Slider events
  dom.timeSlider.addEventListener("input", () => {
    const { key } = getSliderSettings();
    localStorage.setItem(key, dom.timeSlider.value);
    dom.timeDisplay.textContent = formatTime(parseInt(dom.timeSlider.value, 10));
    updateSliderFill();
  });

  // Mode buttons
  dom.saunaButton.addEventListener("click", () => {
    applyMode(COLOR_SAUNA);
    localStorage.setItem("mode", "sauna");
    applySliderSettings();
    updateSliderColor();
    updateSliderFill();
    applyLanguage();
  });

  dom.iceButton.addEventListener("click", () => {
    applyMode(COLOR_ICE);
    localStorage.setItem("mode", "ice");
    applySliderSettings();
    updateSliderColor();
    updateSliderFill();
    applyLanguage();
  });

  // Session controls
  dom.startButton.addEventListener("click", startCountdown);
  dom.stopButton.addEventListener("click",  stopSession);
  dom.exitButton.addEventListener("click",  exitSession);
  dom.cameraStart.addEventListener("click", () => import("./camera.js").then(m => m.startCamera()));
  dom.flipCameraButton.addEventListener("click", () => import("./camera.js").then(m => m.flipCamera()));

  applySliderSettings();
  updateSliderColor();
}
