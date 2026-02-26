// ─── Theme colours ───────────────────────────────────────────────────────────
export const COLOR_SAUNA = "#ef0241";
export const COLOR_ICE   = "#378de2";

// ─── Camera constraints ──────────────────────────────────────────────────────
export const HIGH_RES_CONSTRAINTS = {
  facingMode: "user",
  width:     { ideal: 3840 },
  height:    { ideal: 2160 },
  frameRate: { ideal: 60 },
};

// ─── Motivational messages shown during sessions ─────────────────────────────
export const TIMED_MESSAGES = {
  sauna: {
    3:  "Solid start!",
    4:  "Heat kicking in",
    5:  "Focus on breathing",
    6:  "You're getting stronger",
    9:  "Stay with it",
    12: "Great endurance!",
  },
  ice: {
    3:  "Solid start!",
    4:  "Relax your shoulders",
    5:  "Slow breathing helps",
    6:  "Mind over body",
    9:  "You're doing amazing",
    12: "Stay calm, stay still",
  },
};

// ─── DOM references ───────────────────────────────────────────────────────────
export const dom = {
  // Camera
  cameraContainer: document.getElementById("camera-container"),
  cameraPreview:   document.getElementById("camera-preview"),
  camera:          document.getElementById("camera"),
  cameraStart:     document.getElementById("camera-start"),
  flipCameraButton:document.getElementById("flip-camera"),

  // Timer
  timeContainer:   document.getElementById("time-container"),
  timeDisplay:     document.getElementById("time-display"),
  timeCountdown:   document.getElementById("time-countdown"),
  timeControls:    document.getElementById("time-controls"),
  timeSlider:      document.getElementById("time-slider"),

  // Live messages
  liveMessages:    document.getElementById("live-messages"),

  // Media download links
  mediaLinks:      document.getElementById("media-links"),
  mediaLinksTitle: document.getElementById("media-links__title"),
  mediaLinksList:  document.getElementById("media-links__list"),

  // Menu
  menuControls:    document.getElementById("menu-controls"),
  saunaButton:     document.getElementById("menu-controls__sauna"),
  iceButton:       document.getElementById("menu-controls__ice"),
  startButton:     document.getElementById("menu-controls__start"),
  stopButton:      document.getElementById("menu-controls__stop"),
  exitButton:      document.getElementById("menu-controls__exit"),
  menuMessage:     document.getElementById("menu-message"),

  // Install banner
  installBanner:        document.getElementById("install-banner"),
  installBannerText:    document.getElementById("install-banner__text"),
  iosInstallOverlay:    document.getElementById("ios-install-overlay"),
  iosInstallPopup:      document.getElementById("ios-install-popup"),
  iosInstallPopupClose: document.getElementById("ios-install-popup__close"),

  // Language
  langSelect: document.getElementById("lang-select"),
};
