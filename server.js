import express from "express";
import helmet from "helmet";
import morgan from "morgan";

const app = express();
app.use(helmet());
app.use(morgan("tiny"));

const PORT = process.env.PORT || 8080;

app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// 🔎 Test: responde 200 y devuelve la URL recibida (sin yt-dlp)
app.get("/direct", (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "missing url" });
  return res.status(200).json({ received: url });
});

// 404 controlado para ver en logs
app.use((req, res) => {
  console.error("404:", req.method, req.originalUrl);
  res.status(404).json({ error: "not found", path: req.originalUrl });
});

app.listen(PORT, () => console.log(`✅ media-proxy running on ${PORT}`));

