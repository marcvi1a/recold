import { dom, HIGH_RES_CONSTRAINTS } from "./config.js";
import { isIOS } from "./install.js";
import { generateStatsImage } from "./stats.js";

// ─── State ────────────────────────────────────────────────────────────────────

export let cameraPermissions  = false;
let hasMultipleCameras = false;
export let currentFacingMode  = "user";

let mediaRecorder      = null;
let recordedChunks     = [];
let recordingStartTime = null;

// ── Multi-round session storage ───────────────────────────────────────────────
// Each round: { mode, elapsedSeconds, video, photos, startTime }
let rounds = [];

export function getRounds() { return rounds; }

// Stats blob for the whole session (regenerated after each round)
export let capturedStats = null;

// Pre-computed at camera-init time so beginRecording / capturePhoto have zero setup cost
let bestVideoMimeType = "";
let recorderOptions   = {};
let photoCanvas       = null;   // reused across captures — no allocation per photo
let photoCtx          = null;
let photoDrawW        = 0;      // native stream width  — what capturePhoto draws at
let photoDrawH        = 0;      // native stream height — what capturePhoto draws at

// ─── Flip-camera button ───────────────────────────────────────────────────────

export async function showFlipCameraButton() {
  if (!cameraPermissions) return;
  if (hasMultipleCameras) {
    dom.flipCameraButton.classList.remove("hidden");
    return;
  }
  const devices      = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter(d => d.kind === "videoinput");
  if (videoDevices.length > 1) {
    hasMultipleCameras = true;
    dom.flipCameraButton.classList.remove("hidden");
  }
}

export function hideFlipCameraButton() {
  dom.flipCameraButton.classList.add("hidden");
}

// ─── Prepare canvas / codec after getUserMedia succeeds ──────────────────────
// Called once after getUserMedia succeeds. Pre-computes everything so
// beginRecording() and capturePhoto() have zero decision-making at session start.

export function prepareMediaTools(stream) {
  // --- Video: pick best supported codec once ---
  const candidates = [
    "video/mp4;codecs=avc1",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  bestVideoMimeType = candidates.find(m => MediaRecorder.isTypeSupported(m)) || "";
  recorderOptions   = { videoBitsPerSecond: 16_000_000 };
  if (bestVideoMimeType) recorderOptions.mimeType = bestVideoMimeType;

  // --- Photo: allocate canvas once, correcting for iOS orientation ---
  // Called from loadedmetadata, so camera.videoWidth/Height are always valid here.
  const streamW = dom.camera.videoWidth;
  const streamH = dom.camera.videoHeight;

  // iOS reports the physical sensor's landscape dimensions even in portrait mode.
  // When drawn to canvas, the browser does NOT apply the display rotation,
  // so we must rotate manually.
  const streamIsLandscape = streamW > streamH;
  const screenIsPortrait  = window.screen.width < window.screen.height
                          || window.innerWidth   < window.innerHeight;
  const needsRotation = streamIsLandscape && screenIsPortrait;

  // Store native draw dimensions for capturePhoto
  photoDrawW = streamW;
  photoDrawH = streamH;

  // Canvas output: portrait when rotating (swap dims), native otherwise
  photoCanvas        = document.createElement("canvas");
  photoCanvas.width  = needsRotation ? streamH : streamW;
  photoCanvas.height = needsRotation ? streamW : streamH;
  photoCtx = photoCanvas.getContext("2d", { willReadFrequently: false });

  // Bake transforms once. Key insight after rotation:
  // the coordinate space is transposed — the drawable width becomes streamH,
  // not streamW. So the mirror translate must use streamH.
  //
  // iOS front camera stream pixels are already left-right mirrored by the OS.
  // The CSS scaleX(-1) on <video> corrects this for display, but drawImage()
  // gets the raw mirrored pixels. So for iOS (needsRotation) front camera we
  // do NOT add an extra mirror — the rotation alone produces a correct portrait.
  // For non-iOS front camera (no rotation needed) we DO mirror.
  if (needsRotation) {
    // iOS: rotate 90° CW to turn landscape sensor frame into portrait.
    // Front camera mirroring is already baked into the iOS pixel data — skip it.
    photoCtx.translate(streamH, 0);
    photoCtx.rotate(Math.PI / 2);
  } else if (currentFacingMode === "user") {
    // Non-iOS front camera: mirror horizontally
    photoCtx.translate(streamW, 0);
    photoCtx.scale(-1, 1);
  }
  // Rear camera, no rotation: identity transform
}

// ─── Camera access ────────────────────────────────────────────────────────────

export async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: HIGH_RES_CONSTRAINTS,
    });

    dom.camera.srcObject = stream;

    // Dimensions are only reliable after loadedmetadata fires.
    // prepareMediaTools reads videoWidth/Height so it must wait for this event.
    dom.camera.addEventListener("loadedmetadata", () => prepareMediaTools(stream), { once: true });

    cameraPermissions = true;

    dom.timeContainer.style.marginTop = "auto";
    dom.cameraStart.style.display     = "none";
    dom.camera.style.display          = "block";
    dom.cameraPreview.style.display   = "none";
    showFlipCameraButton();
  } catch (err) {
    alert("Camera permission denied or unavailable.");
    console.error(err);
  }
}

export async function flipCamera() {
  // Desktop: check if only one camera available
  try {
    const devices      = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === "videoinput");
    if (videoDevices.length < 2) {
      alert("No rear camera found on this device.");
      return;
    }
  } catch (_) {
    alert("Unable to access camera devices.");
    return;
  }

  // Toggle facing mode
  currentFacingMode = currentFacingMode === "user" ? "environment" : "user";

  // Stop existing stream
  if (dom.camera.srcObject) {
    dom.camera.srcObject.getTracks().forEach(t => t.stop());
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { ...HIGH_RES_CONSTRAINTS, facingMode: currentFacingMode },
    });

    dom.camera.srcObject = stream;
    dom.camera.addEventListener("loadedmetadata", () => prepareMediaTools(stream), { once: true });

    // Mirror front camera, un-mirror rear camera
    dom.camera.style.transform = currentFacingMode === "user" ? "scaleX(-1)" : "scaleX(1)";
  } catch (err) {
    alert("Could not switch camera: " + err.message);
    console.error(err);
  }
}

// ─── Camera recovery on app resume ───────────────────────────────────────────

export function initCameraVisibilityRecovery(getState, stopSession) {
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState !== "visible") return;
    if (!cameraPermissions) return;

    // Stop session if recording or countdown was in progress
    if (getState() === "running" || getState() === "countdown") {
      stopSession();
    }

    // Always restart the stream on resume — some browsers/OS suspend frame
    // delivery without formally ending the track, so readyState checks are unreliable
    try {
      // Stop existing tracks first to release the camera
      if (dom.camera.srcObject) {
        dom.camera.srcObject.getTracks().forEach(t => t.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { ...HIGH_RES_CONSTRAINTS, facingMode: currentFacingMode },
      });
      dom.camera.srcObject = newStream;
      dom.camera.addEventListener("loadedmetadata", () => prepareMediaTools(newStream), { once: true });
    } catch (err) {
      console.error("Could not restart camera:", err);
    }
  });
}

// ─── Recording ────────────────────────────────────────────────────────────────

export function beginRecording() {
  recordedChunks     = [];
  recordingStartTime = new Date();
  if (!cameraPermissions) return; // no camera — still track time, just no video
  mediaRecorder = new MediaRecorder(dom.camera.srcObject, recorderOptions);
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };
  mediaRecorder.start();
}

/**
 * Stops the current round recording, saves it to the rounds array,
 * regenerates the stats card for all rounds so far, then calls onStop.
 */
export function stopRecording(onStop, { mode, elapsedSeconds } = {}) {
  const currentPhotos     = [...currentRoundPhotos];
  currentRoundPhotos.length = 0;

  const finaliseRound = (videoObj) => {
    rounds.push({
      mode,
      elapsedSeconds,
      video:     videoObj,
      photos:    currentPhotos,
      startTime: recordingStartTime,
    });

    // Regenerate stats for all rounds accumulated so far
    generateStatsImage(rounds.map(r => ({ mode: r.mode, elapsedSeconds: r.elapsedSeconds })))
      .then(blob => {
        capturedStats = blob;
        onStop();
      });
  };

  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    finaliseRound(null);
    return;
  }

  mediaRecorder.onstop = () => {
    const mimeType = mediaRecorder.mimeType || bestVideoMimeType || "video/webm";
    const ext      = mimeType.includes("mp4") ? "mp4" : "webm";
    const blob     = new Blob(recordedChunks, { type: mimeType });
    const d        = recordingStartTime;
    finaliseRound({
      blob, mimeType,
      filename: `ReCold_round${rounds.length + 1}_${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.${ext}`,
    });
  };

  mediaRecorder.stop();
}

export function resetAllRounds() {
  rounds     = [];
  capturedStats = null;
  currentRoundPhotos.length = 0;
}

// ─── Photo capture ────────────────────────────────────────────────────────────

// Accumulates photos for the round currently in progress
const currentRoundPhotos = [];

export function capturePhoto() {
  photoCtx.save();

  // Flip photo horizontally if preview is mirrored
  if (currentFacingMode === "user") {
    // Undo the CSS mirror applied to the video preview
    photoCtx.scale(-1, 1);
    photoCtx.drawImage(dom.camera, -photoDrawW, 0, photoDrawW, photoDrawH);
  } else {
    photoCtx.drawImage(dom.camera, 0, 0, photoDrawW, photoDrawH);
  }

  photoCtx.restore();

  photoCanvas.toBlob((blob) => {
    currentRoundPhotos.push(blob);
  }, "image/jpeg", 1.0);
}

// ─── Media display ────────────────────────────────────────────────────────────

// ─── Round row helpers ────────────────────────────────────────────────────────

function formatElapsed(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function modeLabel(mode) {
  return mode === "sauna" ? "Sauna" : "Ice";
}

function buildSummaryRow(round, roundIndex) {
  const ri = roundIndex + 1;
  const tr = document.createElement("tr");
  tr.className = "round-row";

  const tdMode = document.createElement("td");
  tdMode.className = `col-mode mode--${round.mode}`;
  tdMode.textContent = modeLabel(round.mode);
  tr.appendChild(tdMode);

  const tdTime = document.createElement("td");
  tdTime.className = "col-time";
  tdTime.textContent = formatElapsed(round.elapsedSeconds);
  tr.appendChild(tdTime);

  const tdTemp = document.createElement("td");
  tdTemp.className = "col-temp col-temp--disabled";
  tdTemp.textContent = "\u2014";
  tdTemp.title = "Temperature coming soon";
  tr.appendChild(tdTemp);

  const tdVideo = document.createElement("td");
  tdVideo.className = "col-dl-video";
  if (round.video) {
    tdVideo.appendChild(buildDlButton({
      blob: round.video.blob,
      mimeType: round.video.mimeType,
      filename: round.video.filename,
      emoji: "\u2b07\ufe0f",
      label: `Round ${ri} video`,
    }));
  } else {
    tdVideo.textContent = "\u2014";
  }
  tr.appendChild(tdVideo);

  const tdPhotos = document.createElement("td");
  tdPhotos.className = "col-dl-photos";
  if (round.photos.length > 0) {
    tdPhotos.appendChild(buildPhotosButton(round, ri));
  } else {
    tdPhotos.textContent = "\u2014";
  }
  tr.appendChild(tdPhotos);

  return tr;
}

function buildPreviewRow(round) {
  const tr = document.createElement("tr");
  tr.className = "round-row round-row--preview";

  const tdMode = document.createElement("td");
  tdMode.className = `col-mode mode--${round.mode}`;
  tdMode.textContent = modeLabel(round.mode);
  tr.appendChild(tdMode);

  const tdTime = document.createElement("td");
  tdTime.className = "col-time";
  tdTime.textContent = formatElapsed(round.elapsedSeconds);
  tr.appendChild(tdTime);

  const tdTemp = document.createElement("td");
  tdTemp.className = "col-temp col-temp--disabled";
  tdTemp.textContent = "\u2014";
  tr.appendChild(tdTemp);

  return tr;
}

function buildDlButton({ blob, mimeType, filename, emoji, label }) {
  if (isIOS() && navigator.share) {
    const btn = document.createElement("button");
    btn.className   = "dl-btn";
    btn.textContent = emoji;
    btn.title       = label;
    btn.addEventListener("click", async () => {
      try {
        const file = new File([blob], filename, { type: mimeType });
        await navigator.share({ files: [file], title: "ReCold" });
      } catch (err) {
        if (err.name !== "AbortError") {
          const win = window.open();
          win.document.write(`<img src="${URL.createObjectURL(blob)}" style="max-width:100%" />`);
          win.document.title = filename;
        }
      }
    });
    return btn;
  }
  const a       = document.createElement("a");
  a.className   = "dl-btn";
  a.href        = URL.createObjectURL(blob);
  a.download    = filename;
  a.textContent = emoji;
  a.title       = label;
  return a;
}

function buildPhotosButton(round, roundNum) {
  const count = round.photos.length;
  const d     = round.startTime;

  const btn = document.createElement("button");
  btn.className = "dl-btn dl-btn--photos";
  btn.title     = `Download ${count} photo${count > 1 ? "s" : ""}`;
  btn.innerHTML = `<span class="photo-icon">&#128247;</span><span class="photo-count">${count}</span>`;

  btn.addEventListener("click", async () => {
    if (isIOS() && navigator.share) {
      try {
        const files = round.photos.map((blob, pi) => {
          const fname = `ReCold_round${roundNum}_photo${pi+1}_${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.jpg`;
          return new File([blob], fname, { type: "image/jpeg" });
        });
        await navigator.share({ files, title: "ReCold" });
      } catch (err) {
        if (err.name !== "AbortError") console.error(err);
      }
      return;
    }
    round.photos.forEach((blob, pi) => {
      const fname = `ReCold_round${roundNum}_photo${pi+1}_${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.jpg`;
      const a     = document.createElement("a");
      a.href      = URL.createObjectURL(blob);
      a.download  = fname;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 1000);
    });
  });

  return btn;
}

// ─── Media display ────────────────────────────────────────────────────────────

export function displayMedia() {
  dom.roundsTableBody.innerHTML = "";
  dom.roundsTableFoot.innerHTML = "";

  rounds.forEach((round, ri) => {
    dom.roundsTableBody.appendChild(buildSummaryRow(round, ri));
  });

  if (capturedStats) {
    const d        = rounds[0]?.startTime || new Date();
    const filename = `ReCold_stats_${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.png`;

    const tr      = document.createElement("tr");
    const tdEmpty = document.createElement("td");
    tdEmpty.colSpan = 3;
    tr.appendChild(tdEmpty);

    const tdStats     = document.createElement("td");
    tdStats.colSpan   = 2;
    tdStats.className = "col-stats-dl";

    const btn = document.createElement("button");
    btn.className   = "stats-dl-btn";
    btn.textContent = "Download stats";
    btn.addEventListener("click", () => {
      const a    = document.createElement("a");
      a.href     = URL.createObjectURL(capturedStats);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 1000);
    });
    tdStats.appendChild(btn);
    tr.appendChild(tdStats);
    dom.roundsTableFoot.appendChild(tr);
  }

  dom.summary.style.display = "block";
}

export function renderRoundsPreview() {
  dom.roundsPreviewBody.innerHTML = "";
  rounds.forEach(round => {
    dom.roundsPreviewBody.appendChild(buildPreviewRow(round));
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, "0"); }
