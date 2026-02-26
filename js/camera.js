import { dom, HIGH_RES_CONSTRAINTS } from "./config.js";
import { isIOS } from "./install.js";

// ─── State ────────────────────────────────────────────────────────────────────

export let cameraPermissions  = false;
let hasMultipleCameras = false;
export let currentFacingMode  = "user";

let mediaRecorder       = null;
let recordedChunks      = [];
export let recordingStartTime = null;

export let capturedPhotos = [];
export let capturedVideo  = null;

// Pre-computed at camera-init time
let bestVideoMimeType = "";
let recorderOptions   = {};
let photoCanvas       = null;
let photoCtx          = null;
let photoDrawW        = 0;
let photoDrawH        = 0;

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

export function prepareMediaTools(stream) {
  // Pick best video codec once
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

  // Allocate canvas once, correcting for iOS orientation
  const streamW = dom.camera.videoWidth;
  const streamH = dom.camera.videoHeight;

  const streamIsLandscape = streamW > streamH;
  const screenIsPortrait  = window.screen.width < window.screen.height
                          || window.innerWidth   < window.innerHeight;
  const needsRotation = streamIsLandscape && screenIsPortrait;

  photoDrawW = streamW;
  photoDrawH = streamH;

  photoCanvas        = document.createElement("canvas");
  photoCanvas.width  = needsRotation ? streamH : streamW;
  photoCanvas.height = needsRotation ? streamW : streamH;
  photoCtx = photoCanvas.getContext("2d", { willReadFrequently: false });

  if (needsRotation) {
    photoCtx.translate(streamH, 0);
    photoCtx.rotate(Math.PI / 2);
  } else if (currentFacingMode === "user") {
    photoCtx.translate(streamW, 0);
    photoCtx.scale(-1, 1);
  }
}

// ─── Camera access ────────────────────────────────────────────────────────────

export async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: HIGH_RES_CONSTRAINTS,
    });

    dom.camera.srcObject = stream;
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

  currentFacingMode = currentFacingMode === "user" ? "environment" : "user";

  if (dom.camera.srcObject) {
    dom.camera.srcObject.getTracks().forEach(t => t.stop());
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { ...HIGH_RES_CONSTRAINTS, facingMode: currentFacingMode },
    });

    dom.camera.srcObject = stream;
    dom.camera.addEventListener("loadedmetadata", () => prepareMediaTools(stream), { once: true });
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

    if (getState() === "running" || getState() === "countdown") {
      stopSession();
    }

    try {
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
  recordedChunks    = [];
  recordingStartTime = new Date();
  mediaRecorder = new MediaRecorder(dom.camera.srcObject, recorderOptions);
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };
  mediaRecorder.start();
}

export function stopRecording(onStop) {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    onStop();
    return;
  }

  mediaRecorder.onstop = () => {
    const mimeType = mediaRecorder.mimeType || bestVideoMimeType || "video/webm";
    const ext      = mimeType.includes("mp4") ? "mp4" : "webm";
    const blob     = new Blob(recordedChunks, { type: mimeType });
    const d        = recordingStartTime;
    capturedVideo  = {
      blob, mimeType,
      filename: `ReCold_session_${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.${ext}`,
    };
    onStop();
  };

  mediaRecorder.stop();
}

export function resetCapturedMedia() {
  capturedPhotos = [];
  capturedVideo  = null;
}

// ─── Photo capture ────────────────────────────────────────────────────────────

export function capturePhoto() {
  photoCtx.save();
  if (currentFacingMode === "user") {
    photoCtx.scale(-1, 1);
    photoCtx.drawImage(dom.camera, -photoDrawW, 0, photoDrawW, photoDrawH);
  } else {
    photoCtx.drawImage(dom.camera, 0, 0, photoDrawW, photoDrawH);
  }
  photoCtx.restore();

  photoCanvas.toBlob((blob) => {
    capturedPhotos.push(blob);
  }, "image/jpeg", 1.0);
}

// ─── Media display ────────────────────────────────────────────────────────────

function createMediaItem({ href, blob, mimeType, filename, emoji, label }) {
  const li = document.createElement("li");

  if (isIOS() && navigator.share) {
    const btn = document.createElement("button");
    btn.textContent  = `${emoji} ${label}`;
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
    const a      = document.createElement("a");
    a.href       = href;
    a.download   = filename;
    a.textContent = `${emoji} ${filename}`;
    li.appendChild(a);
  }

  return li;
}

export function displayMedia() {
  dom.mediaLinksList.innerHTML = "";

  if (capturedVideo) {
    const { blob, mimeType, filename } = capturedVideo;
    const href = URL.createObjectURL(blob);
    dom.mediaLinksList.appendChild(
      createMediaItem({ href, blob, mimeType, filename, emoji: "⬇️", label: "Save video to gallery" })
    );
  }

  capturedPhotos.forEach((blob, i) => {
    const d        = recordingStartTime;
    const filename = `ReCold_photo-${i+1}_${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.jpg`;
    const href     = URL.createObjectURL(blob);
    dom.mediaLinksList.appendChild(
      createMediaItem({ href, blob, mimeType: "image/jpeg", filename, emoji: "📷", label: `Save photo ${i+1} to gallery` })
    );
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, "0"); }
