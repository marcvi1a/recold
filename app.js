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
  menuMessage.textContent = tr.menuMessage;
}


const TIMED_MESSAGES = {
  sauna: {
    3: "Solid start!",
    4: "Heat kicking in",
    5: "Focus on breathing",
    6: "You’re getting stronger",
    9: "Stay with it",
    12: "Great endurance!",
  },
  ice: {
    3: "Solid start!",
    4: "Relax your shoulders",
    5: "Slow breathing helps",
    6: "Mind over body",
    9: "You're doing amazing",
    12: "Stay calm, stay still",
  }
};


const COLOR_SAUNA = "#ef0241";
const COLOR_ICE = "#378de2";


const cameraPreview = document.getElementById("camera-preview");
const camera = document.getElementById("camera");

const bulletPoints = document.getElementById("bullet-points");
const bulletTitle = document.getElementById("bullet-title");
const bulletPoint1 = document.getElementById("bullet-point-1");
const bulletPoint2 = document.getElementById("bullet-point-2");
const bulletPoint3 = document.getElementById("bullet-point-3");
const bulletPoint4 = document.getElementById("bullet-point-4");
const bulletPoint5 = document.getElementById("bullet-point-5");
const bulletPoint6 = document.getElementById("bullet-point-6");

const cameraStart = document.getElementById("camera-start");
const timeContainer = document.getElementById("time-container");

const timeDisplay = document.getElementById("time-display");
const timeCountdown = document.getElementById("time-countdown");
const timeControls = document.getElementById("time-controls");

const liveMessages = document.getElementById("live-messages");

const menuControls = document.getElementById("menu-controls");
const saunaButton = document.getElementById("menu-controls__sauna");
const iceButton = document.getElementById("menu-controls__ice");
const startButton = document.getElementById("menu-controls__start");
const menuMessage = document.getElementById("menu-message");

let mediaRecorder = null;
let recordedChunks = [];
let recordingBlob = null;




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

    timeContainer.style.marginTop = "auto";
    cameraStart.style.display = "none";
    camera.style.display = "block";
    cameraPreview.style.display = "none";

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


function pushLiveMessage(text) {
  const msg = document.createElement("div");
  msg.className = "live-message";
  msg.textContent = text;

  // Step 1 — add to DOM
  liveMessages.appendChild(msg);

  // Step 2 — ensure the entry animation finishes
  // (forces the browser to apply initial animation)
  void msg.offsetWidth;

  // Step 3 — schedule removal
  setTimeout(() => {

    // apply fade-out animation
    msg.style.animation = "chatOut 0.4s ease-out forwards";

    // wait for fade-out to finish before removing
    setTimeout(() => {
      msg.remove();
    }, 400);

  }, 4000);

  // Safety: avoid infinite stacking
  if (liveMessages.children.length > 10) {
    liveMessages.removeChild(liveMessages.firstChild);
  }
}


let state = "idle"; // idle | countdown | running
let countdownInterval;
let mainInterval;
let time = 0;

startButton.addEventListener("click", handleStartStop);

function handleStartStop() {
  if (state === "idle") startCountdown();
  else if (state === "running") stopSession();
}

function startCountdown() {
  state = "countdown";

  hideMainUI();
  menuMessage.style.display = "flex";
  menuControls.style.display = "none";
  startButton.textContent = "STOP";
  menuControls.classList.add('one-button');

  let countdown = 3;
  timeCountdown.textContent = countdown;

  countdownInterval = setInterval(() => {
    countdown--;
    timeCountdown.textContent = countdown;

    if (countdown <= 0) {
      clearInterval(countdownInterval);
      // show 00:00 immediately and start main timer
      timeCountdown.textContent = formatTime(0); // "00:00"
      beginMainTimer();
    }
  }, 1000);
}

function beginMainTimer() {
  state = "running";

  startRecording();

  menuMessage.style.display = "none";
  menuControls.style.display = "flex";

  time = 0;
  const endTime = parseInt(timeSlider.value, 10);
  let finishedMark = false;

  mainInterval = setInterval(() => {
    time++;
    timeCountdown.textContent = formatTime(time);

    // Chat messages at exact times
    const mode = getMode();
    if (TIMED_MESSAGES[mode][time]) {
      pushLiveMessage(TIMED_MESSAGES[mode][time]);
    }

    const fill = (time / endTime) * 100;  // percentage 0 → 100
    const baseColor = getMode() === "sauna" ? COLOR_SAUNA : COLOR_ICE;

    if (!finishedMark) {
      // update fill from left to right
      timeCountdown.style.background = `
        linear-gradient(90deg,
          ${color80(baseColor)} ${fill}%,
          #f5f5f780 ${fill}%)
      `;
    }

    if (!finishedMark && time >= endTime) {
      finishedMark = true;

      pushLiveMessage(`Goal reached: ${formatTime(endTime)}`);
      setTimeout(() => {
          pushLiveMessage(`Congrats! 🥳🥳`);
      }, 500);

      timeCountdown.style.background = baseColor;
    }
  }, 1000);
}

function startRecording() {
  const stream = camera.srcObject;

  if (!stream) {
    console.warn("No camera stream available for recording.");
    return;
  }

  recordedChunks = [];

  try {
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9"
    });
  } catch (e) {
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm"
    });
  }

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) recordedChunks.push(event.data);
  };

  mediaRecorder.onstop = () => {
    recordingBlob = new Blob(recordedChunks, { type: "video/webm" });

    const url = URL.createObjectURL(recordingBlob);
    const preview = document.getElementById("recording-preview");

    preview.src = url;
    preview.style.display = "block";

    camera.style.display = "none";
    cameraPreview.style.display = "none";
  };

  mediaRecorder.start();
}

function stopSession() {
  state = "idle";

  clearInterval(countdownInterval);
  clearInterval(mainInterval);

  liveMessages.innerHTML = "";  // reset messages

  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }

  showMainUI();
  startButton.textContent = "Download video and exit";
  startButton.onclick = downloadAndExit;
  menuControls.classList.remove('one-button');

  const baseColor = getMode() === "sauna" ? COLOR_SAUNA : COLOR_ICE;

  timeCountdown.style.background = `
    linear-gradient(90deg,
      ${color80(baseColor)} 0%,
      #f5f5f780 0%)
  `;
}

function color80(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.8)`;
}

function downloadAndExit() {
  if (!recordingBlob) return;

  const url = URL.createObjectURL(recordingBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "recold-session.webm";
  a.click();

  // Try to save to gallery on mobile (best available approach)
  if (navigator.canShare && navigator.canShare({ files: [new File([recordingBlob], "recold-session.webm", { type: "video/webm" })] })) {
    const file = new File([recordingBlob], "recold-session.webm", { type: "video/webm" });
    navigator.share({ files: [file], title: "ReCold Video" });
  }

  // Reset UI back to initial screen
  resetApp();
}

function resetApp() {
  // Hide preview
  document.getElementById("recording-preview").style.display = "none";

  // Show camera start button
  cameraStart.style.display = "block";

  // Reset camera preview
  cameraPreview.style.display = "block";

  // Reset start button
  startButton.textContent = "START";
  startButton.onclick = handleStartStop;

  // Reset states
  recordingBlob = null;
  recordedChunks = [];
  mediaRecorder = null;

  showMainUI();
}


function hideMainUI() {
  timeDisplay.style.display = "none";
  timeControls.style.pointerEvents = "none";
  timeControls.style.opacity = "0";
  timeCountdown.style.display = "block";
  saunaButton.style.display = "none";
  iceButton.style.display = "none";
}

function showMainUI() {
  timeDisplay.style.display = "block";
  timeControls.style.pointerEvents = "";
  timeControls.style.opacity = "";
  timeCountdown.style.display = "none";
  saunaButton.style.display = "block";
  iceButton.style.display = "block";
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
