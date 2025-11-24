const cameraPreview = document.getElementById("camera-preview");
const cameraStart = document.getElementById("camera-start");
const camera = document.getElementById("camera");

const saunaButton = document.getElementById("start-controls__sauna");
const iceBathButton = document.getElementById("start-controls__ice-bath");
const COLOR_SAUNA = "#ef0241";
const COLOR_ICE_BATH = "#378de2";
const timer = document.getElementById("timer");
const startButton = document.getElementById("start-controls__start");

// --- Initialize mode if empty ---
if (!localStorage.getItem("mode")) {
  localStorage.setItem("mode", "ice bath");
}

const storedMode = localStorage.getItem("mode");

// --- Apply stored mode on page load ---
if (storedMode === "sauna") {
  saunaButton.classList.add("selected");
  iceBathButton.classList.remove("selected");
  timer.style.background = COLOR_SAUNA;
  startButton.style.background = COLOR_SAUNA;
}

if (storedMode === "ice bath") {
  iceBathButton.classList.add("selected");
  saunaButton.classList.remove("selected");
  timer.style.background = COLOR_ICE_BATH;
  startButton.style.background = COLOR_ICE_BATH;
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
  timer.style.background = COLOR_SAUNA;
  startButton.style.background = COLOR_SAUNA;

  localStorage.setItem("mode", "sauna");
});

iceBathButton.addEventListener("click", () => {
  iceBathButton.classList.add("selected");
  saunaButton.classList.remove("selected");
  timer.style.background = COLOR_ICE_BATH;
  startButton.style.background = COLOR_ICE_BATH;

  localStorage.setItem("mode", "ice-bath");
});
