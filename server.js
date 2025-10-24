import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import fs from "fs";
import { spawn } from "child_process";

const app = express();
app.use(helmet());
app.use(morgan("tiny"));

const PORT = process.env.PORT || 8080;

app.get("/healthz", (_req, res) => res.status(200).send("ok"));

app.get("/direct", (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "missing url" });

  const args = [
    "--no-warnings",
    "--geo-bypass",
    "--user-agent", "Mozilla/5.0",
    "--add-header", "Accept-Language: en-US,en;q=0.9",
    "-g", // dump direct URL
    "-f", "bestaudio/best",
  ];

  // Cookies locales si existen (raíz del repo).
  if (fs.existsSync("./cookies.txt")) {
    args.push("--cookies", "./cookies.txt");
  }

  args.push(url);

  const proc = spawn("yt-dlp", args, { stdio: ["ignore", "pipe", "pipe"] });

  let out = "", err = "";
  proc.stdout.on("data", d => (out += d.toString()));
  proc.stderr.on("data", d => (err += d.toString()));

  // Timeout defensivo
  const t = setTimeout(() => { try { proc.kill("SIGKILL"); } catch {} }, 30000);

  proc.on("close", code => {
    clearTimeout(t);
    const direct = out.trim();
    if (code !== 0 || !direct) {
      return res.status(502).json({ error: "yt-dlp_failed", code, stderr: err.slice(0, 1000) });
    }
    return res.status(200).json({ url: direct });
  });
});

// 404 controlado
app.use((req, res) => res.status(404).json({ error: "not found", path: req.originalUrl }));

app.listen(PORT, () => console.log(`✅ media-proxy running on ${PORT}`));

