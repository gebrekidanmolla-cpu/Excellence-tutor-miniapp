"use client";

import { useState } from "react";

export default function CopyPhone({
  phone,
}: {
  phone: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(phone);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1200);
    } catch (error) {
      console.error(
        "Failed to copy phone number:",
        error
      );
    }
  }

  return (
    <button
      type="button"
      onClick={copyPhone}
      title="Copy phone number"
      className="group text-left"
    >
      <span className="font-medium text-gray-700 transition group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white">
        {phone}
      </span>

      <span className="ml-1.5 text-[10px] text-gray-400 opacity-0 transition group-hover:opacity-100">
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}

