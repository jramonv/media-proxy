import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { spawn } from "child_process";

const app = express();
app.use(helmet());
app.use(morgan("tiny"));

const PORT = process.env.PORT || 8080;

// Salud
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// Helper simple
const isValidUrl = (u) => {
  try { const x = new URL(u); return x.protocol === "http:" || x.protocol === "https:"; }
  catch { return false; }
};

// 1) /direct -> obtiene URL directa del bestaudio (sin descargar archivo)
app.get("/direct", (req, res) => {
  const { url } = req.query;
  if (!url || !isValidUrl(url)) return res.status(400).json({ error: "invalid url" });

  const proc = spawn("yt-dlp", ["-g", "-f", "bestaudio", url], { stdio: ["ignore","pipe","pipe"] });
  let out = "", err = "";

  // timeout de seguridad
  const killTimer = setTimeout(() => { try { proc.kill("SIGKILL"); } catch {} }, 15000);

  proc.stdout.on("data", (d) => (out += d.toString()));
  proc.stderr.on("data", (d) => (err += d.toString()));
  proc.on("close", (code) => {
    clearTimeout(killTimer);
    const direct = out.trim();
    if (code !== 0 || !direct) {
      return res.status(502).json({ error: "yt-dlp_failed", code, stderr: err.trim() });
    }
    return res.status(200).json({ url: direct });
  });
});

// 2) /mp3 -> transcodifica y streamea MP3 (para enviar binario a Deepgram si prefieres)
app.get("/mp3", (req, res) => {
  const { url } = req.query;
  if (!url || !isValidUrl(url)) return res.status(400).json({ error: "invalid url" });

  // yt-dlp: saca audio en formato bestaudio y lo pasa por stdout a ffmpeg
  const ytdlp = spawn("yt-dlp", ["-f", "bestaudio", "-o", "-", url], { stdio: ["ignore","pipe","pipe"] });
  const ffmpeg = spawn("ffmpeg", ["-i", "pipe:0", "-f", "mp3", "-acodec", "libmp3lame", "-b:a", "192k", "pipe:1"],
    { stdio: ["pipe","pipe","pipe"] });

  // encadenar streams
  ytdlp.stdout.pipe(ffmpeg.stdin);

  // headers de streaming
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "no-store");

  ffmpeg.stdout.pipe(res);

  // manejo de errores
  let errY = "", errF = "";
  ytdlp.stderr.on("data", d => errY += d.toString());
  ffmpeg.stderr.on("data", d => errF += d.toString());

  const endWith = (status, payload) => {
    try { res.headersSent ? res.end() : res.status(status).json(payload); } catch {}
  };

  // timeouts (30s)
  const t = setTimeout(() => { try { ytdlp.kill("SIGKILL"); ffmpeg.kill("SIGKILL"); } catch {} }, 30000);

  ytdlp.on("close", (code) => {
    if (code !== 0) {
      clearTimeout(t);
      endWith(502, { error: "yt-dlp_failed", code, stderr: errY.trim() });
    }
  });
  ffmpeg.on("close", (code) => {
    clearTimeout(t);
    if (code !== 0) endWith(502, { error: "ffmpeg_failed", code, stderr: errF.trim() });
  });

  req.on("close", () => { try { ytdlp.kill("SIGKILL"); ffmpeg.kill("SIGKILL"); } catch {} });
});

// 404 visible en logs
app.use((req, res) => {
  console.error("404:", req.method, req.originalUrl);
  res.status(404).json({ error: "not found", path: req.originalUrl });
});

app.listen(PORT, () => console.log(`✅ media-proxy running on ${PORT}`));


