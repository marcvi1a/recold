const cameraPreview = document.getElementById("camera-preview");
const cameraStart = document.getElementById("camera-start");
const camera = document.getElementById("camera");

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
