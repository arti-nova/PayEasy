require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { getAccessToken } = require("./paypal");
const invoiceRoutes = require("./routes/invoices");
const webhookRoutes = require("./routes/webhooks");
const forecastRoutes = require("./routes/forecast");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get("/api/paypal/test", async (req, res) => {
  try {
    const token = await getAccessToken();
    res.json({ success: true, tokenReceived: Boolean(token) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
});

app.use("/api/invoices", invoiceRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/forecast", forecastRoutes);

// Serve the built React app when it exists (production)
const dist = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(dist, "index.html"));
  });
}

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection failed:", err.message));