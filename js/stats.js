import { COLOR_ICE } from "./config.js";
import { getModeLabel } from "./i18n.js";

/**
 * Generates a transparent-background PNG stats card for one or more rounds.
 *
 * @param {Array<{mode: "sauna"|"ice", elapsedSeconds: number}>} rounds
 * @returns {Promise<Blob>}
 */
export async function generateStatsImage(rounds) {
  const W        = 720;
  const ROUND_H  = 200;  // height per round row
  const LOGO_H   = 100;  // space for the ReCold logo at the bottom
  const H        = rounds.length * ROUND_H + LOGO_H;

  const canvas = document.createElement("canvas");
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // ── Background: fully transparent ───────────────────────────────────────────
  ctx.clearRect(0, 0, W, H);

  // ── Draw each round ────────────────────────────────────────────────────────
  for (let i = 0; i < rounds.length; i++) {
    const { mode, elapsedSeconds } = rounds[i];
    const y       = i * ROUND_H;
    const centreY = y + ROUND_H / 2;

    // Subtle separator line between rounds (skip first)
    if (i > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(W - 60, y);
      ctx.stroke();
    }

    // Mode label — localised, always white, Montserrat
    const modeLabel = await getModeLabel(mode);
    ctx.fillStyle    = "#ffffff";
    ctx.font         = "bold 44px 'Montserrat', sans-serif";
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(modeLabel, W / 2, centreY - 30);

    // Time stamp — always white, Montserrat
    const m         = Math.floor(elapsedSeconds / 60);
    const s         = elapsedSeconds % 60;
    const timeLabel = m > 0 ? `${m}m ${s}s` : `${s}s`;
    ctx.font = "bold 72px 'Montserrat', sans-serif";
    ctx.fillText(timeLabel, W / 2, centreY + 42);
  }

  // ── ReCold logo: favicon + wordmark, always COLOR_ICE ─────────────────────
  const LOGO_Y        = H - LOGO_H / 2;
  const ICON_SIZE     = 44;
  const WORDMARK_FONT = "bold 52px 'Poppins', sans-serif";
  const GAP           = 12;

  // Set font + baseline before measuring so metrics are accurate
  ctx.font         = WORDMARK_FONT;
  ctx.textBaseline = "middle";
  ctx.textAlign    = "left";

  const metrics               = ctx.measureText("ReCold");
  const textW                 = metrics.width;
  // Visual centre offset: difference between alphabetic-baseline "middle" anchor
  // and the true optical centre of the glyphs
  const textVisualCentreOffset = (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;

  const totalW = ICON_SIZE + GAP + textW;
  const startX = W / 2 - totalW / 2;

  // Icon Y: align its centre to the same optical centre as the text
  const iconY = LOGO_Y - textVisualCentreOffset - ICON_SIZE / 2;

  // Draw favicon (load once, ignore errors gracefully)
  try {
    const icon = await loadImage("assets/favicon.png");
    ctx.drawImage(icon, startX, iconY, ICON_SIZE, ICON_SIZE);
  } catch (_) {
    // favicon not available — skip icon, text will still render centred
  }

  // Draw wordmark
  ctx.fillStyle = COLOR_ICE;
  ctx.fillText("ReCold", startX + ICON_SIZE + GAP, LOGO_Y);

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
