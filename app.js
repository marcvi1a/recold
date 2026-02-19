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
let capturedVideo = null;

// Pre-computed at camera-init time so beginRecording / capturePhoto have zero setup cost
let bestVideoMimeType = "";
let recorderOptions = {};
let photoCanvas = null;   // reused across captures — no allocation per photo
let photoCtx = null;
let photoDrawW = 0;       // native stream width  — what capturePhoto draws at
let photoDrawH = 0;       // native stream height — what capturePhoto draws at




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
      video: { ...HIGH_RES_CONSTRAINTS, facingMode: currentFacingMode }
    });

    camera.srcObject = stream;
    prepareMediaTools(stream);

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


const HIGH_RES_CONSTRAINTS = {
  facingMode: "user",
  width: { ideal: 3840 },   // request up to 4K; browser caps at device max
  height: { ideal: 2160 },
  frameRate: { ideal: 60 }, // 60fps where supported, fallback to 30
};

cameraStart.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: HIGH_RES_CONSTRAINTS
    });

    camera.srcObject = stream;
    prepareMediaTools(stream);

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


// Called once after getUserMedia succeeds. Pre-computes everything so
// beginRecording() and capturePhoto() have zero decision-making at session start.
function prepareMediaTools(stream) {
  // --- Video: pick best supported codec once ---
  const candidates = [
    "video/mp4;codecs=avc1",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  bestVideoMimeType = candidates.find(m => MediaRecorder.isTypeSupported(m)) || "";
  recorderOptions = { videoBitsPerSecond: 16_000_000 };
  if (bestVideoMimeType) recorderOptions.mimeType = bestVideoMimeType;

  // --- Photo: allocate canvas once, correcting for iOS orientation ---
  const track = stream.getVideoTracks()[0];
  const { width: trackW, height: trackH } = track.getSettings();
  const streamW = trackW || camera.videoWidth;
  const streamH = trackH || camera.videoHeight;

  // iOS reports the sensor's native landscape dimensions even in portrait mode.
  // Detect this: stream is wider than tall, but the screen is taller than wide.
  const streamIsLandscape = streamW > streamH;
  const screenIsPortrait = window.screen.width < window.screen.height ||
                           window.innerWidth < window.innerHeight;
  const needsRotation = streamIsLandscape && screenIsPortrait;

  // Canvas output dimensions: swap w/h when rotating so the photo is portrait
  photoDrawW = streamW;   // always draw at the stream's native dimensions
  photoDrawH = streamH;
  photoCanvas = document.createElement("canvas");
  photoCanvas.width  = needsRotation ? streamH : streamW;
  photoCanvas.height = needsRotation ? streamW : streamH;
  photoCtx = photoCanvas.getContext("2d", { willReadFrequently: false });

  // Bake all transforms in once.
  //
  // After a 90° CW rotation the canvas coordinate space has effectively been
  // transposed: what was streamW becomes the height axis and streamH becomes
  // the width axis. So the mirror translate must use streamH (the new width),
  // NOT streamW.
  //
  // Proof for rotation case (canvas = streamH × streamW):
  //   translate(streamH, 0) → rotate(90°CW)
  //   → draw origin is now at top-left of the portrait canvas ✓
  //   To also mirror: translate(streamH, 0) again (the post-rotation width)
  //   then scale(-1, 1) ✓
  if (needsRotation && currentFacingMode === "user") {
    // Rotate 90° CW, then mirror
    photoCtx.translate(streamH, 0);
    photoCtx.rotate(Math.PI / 2);
    photoCtx.translate(streamH, 0);   // streamH is the width after rotation
    photoCtx.scale(-1, 1);
  } else if (needsRotation) {
    // Rotate 90° CW only (rear camera)
    photoCtx.translate(streamH, 0);
    photoCtx.rotate(Math.PI / 2);
  } else if (currentFacingMode === "user") {
    // No rotation needed, just mirror
    photoCtx.translate(streamW, 0);
    photoCtx.scale(-1, 1);
  }
  // else: rear camera, no rotation — identity transform
}


function beginRecording() {
  recordedChunks = [];
  recordingStartTime = new Date();
  mediaRecorder = new MediaRecorder(camera.srcObject, recorderOptions);
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };
  mediaRecorder.start();
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    applyExitUI();  // no recording in progress, go straight to exit UI
    return;
  }

  mediaRecorder.onstop = () => {
    const mimeType = mediaRecorder.mimeType || bestVideoMimeType || "video/webm";
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const blob = new Blob(recordedChunks, { type: mimeType });
    const d = recordingStartTime;
    capturedVideo = {
      blob,
      mimeType,
      filename: `ReCold_session_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}_${String(d.getHours()).padStart(2,"0")}${String(d.getMinutes()).padStart(2,"0")}.${ext}`
    };
    applyExitUI();
  };

  mediaRecorder.stop();
}

function capturePhoto() {
  // Canvas, dimensions and transforms are all pre-warmed in prepareMediaTools().
  // Always draw at the stream's native dimensions — the pre-baked transform
  // handles rotation and mirroring without any per-call overhead.
  photoCtx.drawImage(camera, 0, 0, photoDrawW, photoDrawH);

  // toBlob is async — hands encoding off so the main thread stays free.
  // JPEG 0.95 is visually lossless and ~10x faster to encode than PNG.
  photoCanvas.toBlob((blob) => {
    capturedPhotos.push(blob);
  }, "image/jpeg", 0.95);
}

// Capture photo with watermark
// function capturePhoto() {
//   const scale = 2; // render at 2x for sharpness
//   const canvas = document.createElement("canvas");
//   canvas.width = camera.videoWidth * scale;
//   canvas.height = camera.videoHeight * scale;
//   const ctx = canvas.getContext("2d");
//
//   ctx.scale(scale, scale);
//
//   if (currentFacingMode === "user") {
//     ctx.translate(camera.videoWidth, 0);
//     ctx.scale(-1, 1);
//   }
//
//   ctx.drawImage(camera, 0, 0, camera.videoWidth, camera.videoHeight);
//
//   // Reset transform before watermark
//   ctx.setTransform(scale, 0, 0, scale, 0, 0);
//
//   const fontSize = Math.round(camera.videoWidth * 0.06);
//   const iconSize = fontSize * 0.8;
//   const padding = 10;
//   const gap = fontSize * 0.3;
//
//   ctx.font = `bold ${fontSize}px Poppins, sans-serif`;
//   ctx.textBaseline = "middle";
//
//   const x = padding;
//   const y = padding;
//
//   const icon = new Image();
//   icon.src = "assets/favicon.png";
//   icon.onload = () => {
//     ctx.globalAlpha = 0.9; // Reduce for transparency
//     ctx.drawImage(icon, x, y, iconSize, iconSize);
//     ctx.fillStyle = "#378de2";
//     ctx.fillText("ReCold", x + iconSize + gap, y + iconSize / 2 + 5);
//
//     ctx.globalAlpha = 1; // Reset to full opacity
//     capturedPhotos.push(canvas.toDataURL("image/jpeg", 1.0)); // also bump quality
//   };
// }

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function createMediaItem({ href, blob, mimeType, filename, emoji, label }) {
  const li = document.createElement("li");

  if (isIOS() && navigator.share) {
    const btn = document.createElement("button");
    btn.textContent = `${emoji} ${label}`;
    btn.style.cssText = "background:none;border:1px solid #0969da;color:#0969da;border-radius:8px;padding:6px 12px;font-family:inherit;font-size:0.9rem;cursor:pointer;margin:4px 0;";
    btn.addEventListener("click", async () => {
      try {
        const file = new File([blob], filename, { type: mimeType });
        await navigator.share({ files: [file], title: "ReCold" });
      } catch (err) {
        if (err.name !== "AbortError") {
          const win = window.open();
          win.document.write(`<img src="${href}" style="max-width:100%" />`);
          win.document.title = filename;
        }
      }
    });
    li.appendChild(btn);
  } else {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.textContent = `${emoji} ${filename}`;
    li.appendChild(a);
  }

  return li;
}

function displayMedia() {
  // Video first
  if (capturedVideo) {
    const { blob, mimeType, filename } = capturedVideo;
    const href = URL.createObjectURL(blob);
    mediaLinksList.appendChild(createMediaItem({ href, blob, mimeType, filename, emoji: "⬇️", label: "Save video to gallery" }));
  }

  // Then photos
  capturedPhotos.forEach((blob, i) => {
    const d = recordingStartTime;
    const filename = `ReCold_photo-${i + 1}_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}_${String(d.getHours()).padStart(2,"0")}${String(d.getMinutes()).padStart(2,"0")}.jpg`;
    const href = URL.createObjectURL(blob);
    mediaLinksList.appendChild(createMediaItem({ href, blob, mimeType: "image/jpeg", filename, emoji: "📷", label: `Save photo ${i + 1} to gallery` }));
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

  // reset photos/video on new session
  capturedPhotos = [];
  capturedVideo = null;

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

  stopRecording();  // applyExitUI is called from inside mediaRecorder.onstop
  clearInterval(photoInterval);

  clearInterval(countdownInterval);
  clearInterval(mainInterval);

  liveMessages.innerHTML = "";  // reset messages

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

  displayMedia();
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
