const mongoose = require("mongoose");
const webhookRoutes = require("./routes/webhooks");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { getAccessToken } = require("./paypal");
const invoiceRoutes = require("./routes/invoices");
const forecastRoutes = require("./routes/forecast");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("PayEasy backend running"));

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

// --- Serve Frontend in Production ---
app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
// ----------------------------------

const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection failed:", err.message));