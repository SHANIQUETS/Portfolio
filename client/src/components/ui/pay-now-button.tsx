
"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

interface PayNowButtonProps {
  tier: "sole_trader" | "small_clinic" | "standard_clinic" | "enterprise";
  customAmount?: number; // For enterprise tier
}

export function PayNowButton({ tier, customAmount }: PayNowButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clinic/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tier,
          ...(tier === "enterprise" && customAmount && { amount: customAmount }),
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout session creation failed", data);
        alert("Unable to start checkout. Please try again later.");
      }
    } catch (error) {
      console.error("Error starting checkout:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleCheckout} disabled={loading}>
      {loading ? "Redirecting..." : "Pay Now"}
    </Button>
  );
}
