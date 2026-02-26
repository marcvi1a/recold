import { dom } from "./config.js";

let deferredPrompt    = null;
let pwaAlreadyInstalled = false;

// ─── Detection helpers ────────────────────────────────────────────────────────

export function isRunningInBrowser() {
  return !window.matchMedia("(display-mode: standalone)").matches
    && navigator.standalone !== true;
}

export function isAndroidChrome() {
  return /Android/.test(navigator.userAgent) && /Chrome/.test(navigator.userAgent);
}

export function isIOSChrome() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && /CriOS/.test(navigator.userAgent);
}

export function isIOSSafari() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    && !window.MSStream
    && !(/CriOS|FxiOS|OPiOS|mercury/.test(navigator.userAgent));
}

export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// ─── Banner text ──────────────────────────────────────────────────────────────

function updateInstallBannerText() {
  if (pwaAlreadyInstalled) {
    dom.installBannerText.textContent = "ReCold is already installed on your phone";
    dom.installBanner.style.cursor    = "default";
  }
}

// ─── Already-installed check (Android Chrome only) ────────────────────────────

async function checkIfInstalled() {
  if (!isAndroidChrome()) return;
  try {
    if ("getInstalledRelatedApps" in navigator) {
      const apps = await navigator.getInstalledRelatedApps();
      if (apps.length > 0) {
        pwaAlreadyInstalled = true;
        updateInstallBannerText();
      }
    }
  } catch (_) {
    // API unavailable — silently ignore
  }
}

// ─── Banner ───────────────────────────────────────────────────────────────────

function showInstallBanner() {
  updateInstallBannerText();
  dom.installBanner.classList.remove("hidden");
  dom.installBanner.style.display = "";
  checkIfInstalled();
}

// ─── iOS popup ────────────────────────────────────────────────────────────────

function openIOSPopup(mode) {
  dom.iosInstallPopup.setAttribute("data-mode", mode === "chrome" ? "chrome" : "safari");
  dom.iosInstallPopup.classList.remove("hidden");
  dom.iosInstallOverlay.classList.remove("hidden");
}

function closeIOSPopup() {
  dom.iosInstallPopup.classList.add("hidden");
  dom.iosInstallOverlay.classList.add("hidden");
}

// ─── Install trigger ─────────────────────────────────────────────────────────

async function triggerInstall() {
  if (pwaAlreadyInstalled) return;

  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (outcome === "accepted") {
      dom.installBannerText.textContent = "Installing ReCold...";
      pwaAlreadyInstalled = true;
      setTimeout(updateInstallBannerText, 4000);
    }
  } else if (isIOSSafari()) {
    openIOSPopup("safari");
  } else if (isIOSChrome()) {
    openIOSPopup("chrome");
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initInstall() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt          = e;
    pwaAlreadyInstalled     = false;
    updateInstallBannerText();
  });

  dom.iosInstallPopupClose.addEventListener("click", (e) => {
    e.stopPropagation();
    closeIOSPopup();
  });

  dom.iosInstallOverlay.addEventListener("click", closeIOSPopup);
  dom.installBanner.addEventListener("click", triggerInstall);

  if (isRunningInBrowser()) {
    setTimeout(showInstallBanner, 1000);
  }
}
