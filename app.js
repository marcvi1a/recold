import { applyLanguage, initLanguage } from "./js/i18n.js";
import { initInstall }                  from "./js/install.js";
import { initCameraVisibilityRecovery } from "./js/camera.js";
import { initTimer, getState, stopSession } from "./js/timer.js";

// Boot order matters:
//   1. Timer (sets up DOM, mode colours, slider)
//   2. Language (populates all text)
//   3. Install banner
//   4. Camera recovery listener
initTimer();
initLanguage();
initInstall();
initCameraVisibilityRecovery(getState, stopSession);
applyLanguage();
