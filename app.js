async function loadTranslations(lang) {
  const response = await fetch(`./translations/${lang}.json`);
  return await response.json();
}

async function applyLanguage() {
  const lang = localStorage.getItem("lang") || "en";
  const tr = await loadTranslations(lang);

  const mode = getMode();

  cameraStart.textContent = tr.cameraStart;

  saunaButton.textContent = tr.saunaButton;
  iceButton.textContent = tr.iceButton;
  startButton.textContent = tr.startButton;
  stopButton.textContent = tr.stopButton;
  exitButton.textContent = tr.exitButton;
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

const cameraContainer = document.getElementById("camera-container");
const cameraPreview = document.getElementById("camera-preview");
const camera = document.getElementById("camera");

const cameraStart = document.getElementById("camera-start");
const timeContainer = document.getElementById("time-container");

const flipCameraButton = document.getElementById("flip-camera");

const timeDisplay = document.getElementById("time-display");
const timeCountdown = document.getElementById("time-countdown");
const timeControls = document.getElementById("time-controls");

const liveMessages = document.getElementById("live-messages");

const mediaLinks = document.getElementById("media-links");
const mediaLinksTitle = document.getElementById("media-links__title");
const mediaLinksList = document.getElementById("media-links__list");

const menuControls = document.getElementById("menu-controls");
const saunaButton = document.getElementById("menu-controls__sauna");
const iceButton = document.getElementById("menu-controls__ice");
const startButton = document.getElementById("menu-controls__start");
const stopButton = document.getElementById("menu-controls__stop");
const exitButton = document.getElementById("menu-controls__exit");
const menuMessage = document.getElementById("menu-message");


let cameraPermissions = false;

let hasMultipleCameras = false;
let currentFacingMode = "user";

let mediaRecorder = null;
let recordedChunks = [];
let recordingStartTime = null;

let photoInterval = null;
let capturedPhotos = [];




// --- Initialize mode if empty ---
if (!localStorage.getItem("mode")) {
  localStorage.setItem("mode", "ice");
}

const storedMode = localStorage.getItem("mode");

// --- Apply stored mode on page load ---
if (storedMode === "sauna") {
  timeDisplay.style.color = COLOR_SAUNA;
  startButton.style.background = COLOR_SAUNA;
  stopButton.style.background = COLOR_SAUNA;
  applyLanguage();
}

if (storedMode === "ice") {
  timeDisplay.style.color = COLOR_ICE;
  startButton.style.background = COLOR_ICE;
  stopButton.style.background = COLOR_ICE;
  applyLanguage();
}

function getBaseColor() {
  return cameraPermissions
    ? "rgba(245, 245, 247, 0.5)"
    : "rgba(5, 5, 7, 0.1)";
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


flipCameraButton.addEventListener("click", async () => {
  // Desktop: check if only one camera available
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === "videoinput");

    if (videoDevices.length < 2) {
      alert("No rear camera found on this device.");
      return;
    }
  } catch (err) {
    alert("Unable to access camera devices.");
    return;
  }

  // Toggle facing mode
  currentFacingMode = currentFacingMode === "user" ? "environment" : "user";

  // Stop existing stream
  if (camera.srcObject) {
    camera.srcObject.getTracks().forEach(track => track.stop());
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentFacingMode }
    });

    camera.srcObject = stream;

    // Mirror front camera, un-mirror rear camera
    camera.style.transform = currentFacingMode === "user" ? "scaleX(-1)" : "scaleX(1)";
  } catch (err) {
    alert("Could not switch camera: " + err.message);
    console.error(err);
  }
});

async function showFlipCameraButton() {
  if (cameraPermissions) {
    if (hasMultipleCameras) {
      flipCameraButton.style.display = "block";
      return;
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === "videoinput");
    if (videoDevices.length > 1) {
      hasMultipleCameras = true;
      flipCameraButton.style.display = "block";
    }
  }
};

function hideFlipCameraButton() {
  flipCameraButton.style.display = "none";
};


cameraStart.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }
    });

    camera.srcObject = stream;

    cameraPermissions = true;

    timeContainer.style.marginTop = "auto";
    cameraStart.style.display = "none";
    camera.style.display = "block";
    cameraPreview.style.display = "none";
    showFlipCameraButton();

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
  stopButton.style.background = COLOR_SAUNA;

  localStorage.setItem("mode", "sauna");
  applySliderSettings();
  updateSliderColor();
  updateSliderFill();
  applyLanguage();
});

iceButton.addEventListener("click", () => {
  timeDisplay.style.color = COLOR_ICE;
  startButton.style.background = COLOR_ICE;
  stopButton.style.background = COLOR_ICE;

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


function beginRecording() {
  recordedChunks = [];
  recordingStartTime = new Date();
  mediaRecorder = new MediaRecorder(camera.srcObject);
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };
  mediaRecorder.start();
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === "inactive") return;

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const li = document.createElement("li");
    const a = document.createElement("a");

    const d = recordingStartTime;
    const filename = `ReCold_session-${mediaLinksList.children.length + 1}_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}_${String(d.getHours()).padStart(2,"0")}${String(d.getMinutes()).padStart(2,"0")}.webm`;

    a.href = url;
    a.download = filename;
    a.textContent = `⬇️ ${filename}`;

    li.appendChild(a);
    mediaLinksList.appendChild(li);
  };

  mediaRecorder.stop();
}

// function capturePhoto() {
//   const canvas = document.createElement("canvas");
//   canvas.width = camera.videoWidth;
//   canvas.height = camera.videoHeight;
//   const ctx = canvas.getContext("2d");
//
//   if (currentFacingMode === "user") {
//     ctx.translate(canvas.width, 0);
//     ctx.scale(-1, 1);
//   }
//
//   ctx.drawImage(camera, 0, 0, canvas.width, canvas.height);
//   capturedPhotos.push(canvas.toDataURL("image/jpeg", 0.8));
// }

function capturePhoto() {
  const scale = 2; // render at 2x for sharpness
  const canvas = document.createElement("canvas");
  canvas.width = camera.videoWidth * scale;
  canvas.height = camera.videoHeight * scale;
  const ctx = canvas.getContext("2d");

  ctx.scale(scale, scale);

  if (currentFacingMode === "user") {
    ctx.translate(camera.videoWidth, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(camera, 0, 0, camera.videoWidth, camera.videoHeight);

  // Reset transform before watermark
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const fontSize = Math.round(camera.videoWidth * 0.06);
  const iconSize = fontSize * 0.8;
  const padding = 40;
  const gap = fontSize * 0.3;

  ctx.font = `bold ${fontSize}px Poppins, sans-serif`;
  ctx.textBaseline = "middle";

  const x = padding;
  const y = padding;

  const icon = new Image();
  icon.src = "assets/favicon.png";
  icon.onload = () => {
    ctx.globalAlpha = 1; // Reduce for transparency
    ctx.drawImage(icon, x, y, iconSize, iconSize);
    ctx.fillStyle = "#378de2";
    ctx.fillText("ReCold", x + iconSize + gap, y + iconSize / 2);

    ctx.globalAlpha = 1; // Reset to full opacity
    capturedPhotos.push(canvas.toDataURL("image/jpeg", 0.9)); // also bump quality
  };
}

function displayPhotos() {
  capturedPhotos.forEach((dataUrl, i) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    const d = recordingStartTime;
    const filename = `ReCold_photo-${i + 1}_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}_${String(d.getHours()).padStart(2,"0")}${String(d.getMinutes()).padStart(2,"0")}.jpg`;
    a.href = dataUrl;
    a.download = filename;
    a.textContent = `📷 ${filename}`;
    li.appendChild(a);
    mediaLinksList.appendChild(li);
  });
}


let state = "idle"; // idle | countdown | running
let countdownInterval;
let mainInterval;
let time = 0;

startButton.addEventListener("click", startCountdown);
stopButton.addEventListener("click", stopSession);
exitButton.addEventListener("click", exitSession);

function startCountdown() {
  state = "countdown";

  applyStopUI();
  menuMessage.style.display = "flex";
  menuControls.style.display = "none";

  // reset photos on new session
  capturedPhotos = [];

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
      beginRecording();
    }
  }, 1000);
}

function beginMainTimer() {
  state = "running";

  if (cameraPermissions) {
    capturePhoto(); // capture immediately at t=0
    photoInterval = setInterval(capturePhoto, 10000);
  }

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
    const themeColor = getMode() === "sauna" ? COLOR_SAUNA : COLOR_ICE;

    if (!finishedMark) {
      // update fill from left to right
      timeCountdown.style.background = `
        linear-gradient(90deg,
          ${color80(themeColor)} ${fill}%,
          ${getBaseColor()} ${fill}%)
      `;
    }

    if (!finishedMark && time >= endTime) {
      finishedMark = true;

      pushLiveMessage(`Goal reached: ${formatTime(endTime)}`);
      setTimeout(() => {
          pushLiveMessage(`Congrats! 🥳🥳`);
      }, 500);

      timeCountdown.style.background = themeColor;
    }
  }, 1000);
}

function stopSession() {
  state = "idle";

  stopRecording();
  clearInterval(photoInterval);

  clearInterval(countdownInterval);
  clearInterval(mainInterval);

  liveMessages.innerHTML = "";  // reset messages

  applyExitUI();

  const themeColor = getMode() === "sauna" ? COLOR_SAUNA : COLOR_ICE;  // exitButton

  timeCountdown.style.background = `
    linear-gradient(90deg,
      ${color80(themeColor)} 0%,
      ${getBaseColor()} 0%)
  `;
}

function color80(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.8)`;
}

function exitSession() {
  applyStartUI();
}


function applyStopUI() {
  timeDisplay.style.display = "none";
  timeControls.style.pointerEvents = "none";
  timeControls.style.opacity = "0";

  if (!cameraPermissions) {
    cameraPreview.style.display = "none";
    cameraStart.style.display = "none";
    timeContainer.style.marginTop = "auto";
  }
  hideFlipCameraButton();

  timeCountdown.style.background = getBaseColor();

  timeCountdown.style.display = "block";
  saunaButton.style.display = "none";
  iceButton.style.display = "none";
  startButton.style.display = "none";
  stopButton.style.display = "block";
}

function applyExitUI() {
  cameraContainer.style.display = "none";
  cameraStart.style.display = "none";

  timeCountdown.style.display = "none";
  timeContainer.style.display = "none";

  displayPhotos();
  mediaLinks.style.display = "block";

  stopButton.style.display = "none";
  exitButton.style.display = "block";
}

function applyStartUI() {
  mediaLinks.style.display = "none";
  timeContainer.style.display = "block";

  cameraContainer.style.display = "block";
  if (!cameraPermissions) {
    cameraPreview.style.display = "block";
    cameraStart.style.display = "block";
    timeContainer.style.marginTop = "";
  }
  showFlipCameraButton();

  timeDisplay.style.display = "block";
  timeControls.style.pointerEvents = "";
  timeControls.style.opacity = "";
  exitButton.style.display = "none";
  saunaButton.style.display = "block";
  iceButton.style.display = "block";
  startButton.style.display = "block";
}


applySliderSettings();
updateSliderColor();
applyLanguage();




// lang-select is currently hidden
const langSelect = document.getElementById("lang-select");

if (!localStorage.getItem("lang")) {
  localStorage.setItem("lang", "en");
}

langSelect.value = localStorage.getItem("lang");

langSelect.addEventListener("change", async (e) => {
  localStorage.setItem("lang", e.target.value);
  await applyLanguage();
});
