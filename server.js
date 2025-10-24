import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { spawn } from "child_process";

const app = express();
app.use(helmet());
app.use(morgan("tiny"));

const PORT = process.env.PORT || 8080;

// Endpoint de salud
app.get("/healthz", (_req, res) => res.send("ok"));

// Endpoint que devuelve URL directa del audio (sin descargar)
app.get("/direct", (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "missing url" });

  const proc = spawn("yt-dlp", ["-g", "-f", "bestaudio", url]);
  let output = "";
  proc.stdout.on("data", (d) => (output += d.toString()));
  proc.on("close", () => {
    if (!output.trim()) return res.status(500).json({ error: "failed" });
    res.json({ url: output.trim() });
  });
});

// Puerto
app.listen(PORT, () => console.log(`✅ media-proxy running on ${PORT}`));
