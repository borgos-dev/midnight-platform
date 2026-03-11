"use client";

import { useState } from "react";
import { savePhoneAndOpenWhatsApp } from "./server-actions";

export default function PaymentProofPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!phone) {
      alert("Enter the phone number used to pay.");
      return;
    }

    setLoading(true);

    // call server action → saves phone in DB
    const whatsappUrl = await savePhoneAndOpenWhatsApp(phone);

    // open WhatsApp
    window.location.href = whatsappUrl;
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-zinc-900 p-6 rounded-2xl space-y-5">
        <h1 className="text-xl font-semibold">Send payment proof</h1>

        {/* Phone number */}
        <input
          type="tel"
          placeholder="Phone number used to pay"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="w-full rounded-lg bg-black border border-white/20 px-3 py-2"
        />

        {/* Info text */}
        <p className="text-sm text-white/60">
          After clicking the button below, WhatsApp will open.  
          Please attach your payment screenshot and send it to the admin.
        </p>

        {/* Send to WhatsApp */}
        <button
          onClick={handleSend}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? "Opening WhatsApp..." : "Send proof via WhatsApp"}
        </button>
      </div>
    </div>
  );
}