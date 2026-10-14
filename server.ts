import express from "express";
import dotenv from "dotenv";
import path from "path";
import { lalamoveRouter } from "./server/lalamove";
import { stripeRouter } from "./server/stripe";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

app.use("/api/lalamove", lalamoveRouter);
app.use("/api/shipping/lalamove", lalamoveRouter);
app.use("/api/stripe", stripeRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await import("vite");
    const viteDevServer = await vite.createServer({
      server: { middlewareMode: true, port: PORT, host: "0.0.0.0" },
      appType: "spa",
    });
    app.use(viteDevServer.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
