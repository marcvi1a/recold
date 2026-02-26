import { dom } from "./config.js";

export function getMode() {
  return localStorage.getItem("mode") === "sauna" ? "sauna" : "ice";
}

export async function loadTranslations(lang) {
  const response = await fetch(`./translations/${lang}.json`);
  return await response.json();
}

export async function applyLanguage() {
  const lang = localStorage.getItem("lang") || "en";
  const tr = await loadTranslations(lang);

  dom.installBannerText.textContent = tr.installBannerText;
  dom.cameraStart.textContent       = tr.cameraStart;
  dom.saunaButton.textContent       = tr.saunaButton;
  dom.iceButton.textContent         = tr.iceButton;
  dom.startButton.textContent       = tr.startButton;
  dom.stopButton.textContent        = tr.stopButton;
  dom.exitButton.textContent        = tr.exitButton;
  dom.menuMessage.textContent       = tr.menuMessage;
}

/**
 * Returns the localised display label for the given mode,
 * e.g. "Sauna" / "Ice bath" in EN, "Sauna" / "Banho de gelo" in PT.
 */
export async function getModeLabel(mode) {
  const lang = localStorage.getItem("lang") || "en";
  const tr   = await loadTranslations(lang);
  return mode === "sauna" ? tr.saunaLabel : tr.iceBathLabel;
}

/**
 * Returns a single localised string by key.
 * Supports {{placeholder}} interpolation, e.g. getTranslation("goalReached", { time: "1m 30s" })
 */
export async function getTranslation(key, replacements = {}) {
  const lang = localStorage.getItem("lang") || "en";
  const tr   = await loadTranslations(lang);
  let str    = tr[key] ?? key;
  for (const [token, value] of Object.entries(replacements)) {
    str = str.replace(`{{${token}}}`, value);
  }
  return str;
}
  if (!localStorage.getItem("lang")) {
    localStorage.setItem("lang", "en");
  }

  dom.langSelect.value = localStorage.getItem("lang");

  dom.langSelect.addEventListener("change", async (e) => {
    localStorage.setItem("lang", e.target.value);
    await applyLanguage();
  });
}
