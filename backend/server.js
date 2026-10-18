require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { getAccessToken } = require("./paypal");
const invoiceRoutes = require("./routes/invoices");

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));