const cameraPreview = document.getElementById("camera-preview");
const cameraStart = document.getElementById("camera-start");
const camera = document.getElementById("camera");

cameraStart.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }
    });

    camera.srcObject = stream;

    // Remove overlay but DO NOT resize camera
    cameraPreview.style.display = "none";

  } catch (err) {
    alert("Camera permission denied or unavailable.");
    console.error(err);
  }
});
