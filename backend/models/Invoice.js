const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    paypalInvoiceId: { type: String, required: true, unique: true },
    invoiceNumber: String,
    clientName: String,
    clientEmail: String,
    description: String,
    amount: Number,
    currency: String,
    dueDate: Date,
    status: { type: String, default: "SENT" },
    paidAt: Date,
    processedEvents: [String], // webhook event IDs, prevents double-processing
      reminders: [
      {
        sentAt: Date,
        tone: String,
        message: String,
      },
    ],
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Invoice", invoiceSchema);