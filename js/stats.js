import { COLOR_ICE } from "./config.js";
import { getModeLabel } from "./i18n.js";

/**
 * Generates a transparent-background PNG stats card and returns it as a Blob.
 *
 * @param {object} opts
 * @param {"sauna"|"ice"} opts.mode
 * @param {number}        opts.elapsedSeconds  – raw seconds from clock start to STOP
 * @returns {Promise<Blob>}
 */
export async function generateStatsImage({ mode, elapsedSeconds }) {
  const W = 720;
  const H = 480;

  const canvas = document.createElement("canvas");
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // ── Background: fully transparent ───────────────────────────────────────────
  ctx.clearRect(0, 0, W, H);

  const cardPad = 40;

  // ── Mode label — localised, always white, Montserrat ────────────────────────
  const modeLabel = await getModeLabel(mode);

  ctx.fillStyle    = "#ffffff";
  ctx.font         = "bold 48px 'Montserrat', sans-serif";
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(modeLabel, W / 2, H / 2 - 60);

  // ── Time stamp — always white, Montserrat ────────────────────────────────────
  const m = Math.floor(elapsedSeconds / 60);
  const s = elapsedSeconds % 60;
  const timeLabel = m > 0 ? `${m}m ${s}s` : `${s}s`;

  ctx.fillStyle = "#ffffff";
  ctx.font      = "bold 96px 'Montserrat', sans-serif";
  ctx.fillText(timeLabel, W / 2, H / 2 + 52);

  // ── ReCold logo: favicon + wordmark, always COLOR_ICE ───────────────────────
  const LOGO_Y        = H - cardPad - 28;
  const ICON_SIZE     = 48;
  const WORDMARK_FONT = "bold 52px 'Poppins', sans-serif";
  const GAP           = 14;

  // Measure wordmark width so we can centre icon + text together
  ctx.font = WORDMARK_FONT;
  const textW  = ctx.measureText("ReCold").width;
  const totalW = ICON_SIZE + GAP + textW;
  const startX = W / 2 - totalW / 2;

  // Draw favicon (load once, ignore errors gracefully)
  try {
    const icon = await loadImage("assets/favicon.png");
    ctx.drawImage(icon, startX, LOGO_Y - ICON_SIZE / 2, ICON_SIZE, ICON_SIZE);
  } catch (_) {
    // favicon not available — skip icon, text will still render centred
  }

  // Draw wordmark to the right of the icon
  ctx.font         = WORDMARK_FONT;
  ctx.fillStyle    = COLOR_ICE;
  ctx.textAlign    = "left";
  ctx.textBaseline = "middle";
  ctx.globalAlpha  = 0.9;
  ctx.fillText("ReCold", startX + ICON_SIZE + GAP, LOGO_Y);
  ctx.globalAlpha  = 1;

  // ── Return as PNG blob ───────────────────────────────────────────────────────
  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
}

// ─── Helper: load an image as a promise ──────────────────────────────────────
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src     = src;
  });
}

// ─── Helper: rounded rectangle path ──────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
