import { COLOR_SAUNA, COLOR_ICE } from "./config.js";

/**
 * Generates a transparent-background PNG stats card and returns it as a Blob.
 *
 * @param {object} opts
 * @param {"sauna"|"ice"} opts.mode
 * @param {number}        opts.elapsedSeconds  – raw seconds from clock start to STOP
 * @returns {Promise<Blob>}
 */
export function generateStatsImage({ mode, elapsedSeconds }) {
  const W = 720;
  const H = 480;

  const canvas = document.createElement("canvas");
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // ── Background: fully transparent ───────────────────────────────────────────
  ctx.clearRect(0, 0, W, H);

  // ── Theme colour ─────────────────────────────────────────────────────────────
  const themeColor = mode === "sauna" ? COLOR_SAUNA : COLOR_ICE;

  // ── Subtle rounded card ──────────────────────────────────────────────────────
  const pad = 40;
  roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 32);
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fill();

  // ── Thin accent border ───────────────────────────────────────────────────────
  roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 32);
  ctx.strokeStyle = themeColor;
  ctx.lineWidth   = 3;
  ctx.stroke();

  // ── Mode label: SAUNA / ICE ──────────────────────────────────────────────────
  ctx.fillStyle  = themeColor;
  ctx.font       = "bold 72px 'Poppins', 'Montserrat', sans-serif";
  ctx.textAlign  = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(mode.toUpperCase(), W / 2, H / 2 - 60);

  // ── Time stamp ───────────────────────────────────────────────────────────────
  const m = Math.floor(elapsedSeconds / 60);
  const s = elapsedSeconds % 60;
  const timeLabel = m > 0 ? `${m}m ${s}s` : `${s}s`;

  ctx.fillStyle  = "#ffffff";
  ctx.font       = "bold 96px 'Roboto Mono', monospace";
  ctx.fillText(timeLabel, W / 2, H / 2 + 52);

  // ── ReCold logo (wordmark) ───────────────────────────────────────────────────
  ctx.font       = "700 30px 'Poppins', 'Montserrat', sans-serif";
  ctx.fillStyle  = themeColor;
  ctx.globalAlpha = 0.9;
  ctx.fillText("ReCold", W / 2, H - pad - 28);
  ctx.globalAlpha = 1;

  // ── Return as PNG blob ───────────────────────────────────────────────────────
  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/png");
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
