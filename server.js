import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import fs from "fs";
import { spawn } from "child_process";

const app = express();
app.use(helmet());
app.use(morgan("tiny"));

const PORT = process.env.PORT || 8080;

/* Health check */
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

/* Función genérica para ejecutar yt-dlp */
function runYtDlp(url, useAndroid = false) {
  const args = [
    "--no-warnings",
    "--geo-bypass",
    "--user-agent", "Mozilla/5.0",
    "--add-header", "Accept-Language: en-US,en;q=0.9",
    "-g", // get direct audio url
    "-f", "bestaudio/best",
  ];

  // Usa cookies locales si existen
  if (fs.existsSync("./cookies.txt")) {
    args.push("--cookies", "./cookies.txt");
  }

  // Modo alternativo: Android client (salta bloqueos)
  if (useAndroid) {
    args.push("--extractor-args", "youtube:player_client=android");
  }

  args.push(url);

  return new Promise((resolve) => {
    const proc = spawn("yt-dlp", args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    const timeout = setTimeout(() => { try { proc.kill("SIGKILL"); } catch {} }, 30000);
    proc.stdout.on("data", d => (out += d.toString()));
    proc.stderr.on("data", d => (err += d.toString()));
    proc.on("close", code => {
      clearTimeout(timeout);
      resolve({ code, out: out.trim(), err: err.slice(0, 1500) });
    });
  });
}

/* Endpoint principal */
app.get("/direct", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "missing url" });

  // Primer intento: normal + cookies
  let r = await runYtDlp(url, false);
  if (r.code === 0 && r.out) return res.status(200).json({ url: r.out });

  // Segundo intento: modo Android client
  r = await runYtDlp(url, true);
  if (r.code === 0 && r.out) return res.status(200).json({ url: r.out });

  // Fallo total
  return res.status(502).json({ error: "yt-dlp_failed", stderr: r.err });
});

/* Manejo de 404 */
app.use((req, res) =>
  res.status(404).json({ error: "not found", path: req.originalUrl })
);

/* Iniciar servidor */
app.listen(PORT, () => console.log(`✅ media-proxy running on ${PORT}`));
