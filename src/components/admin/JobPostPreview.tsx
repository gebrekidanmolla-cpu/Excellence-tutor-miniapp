"use client";

import { useState } from "react";
import { generateJobPost } from "@/lib/job-post";

interface JobPostPreviewProps {
  job: {
    jobCode: string;
    gender: "MALE" | "FEMALE" | "ANY";
    grade: string;
    subject: string;
    place: string;
    salary: number;
  };
}

export default function JobPostPreview({
  job,
}: JobPostPreviewProps) {
  const [copied, setCopied] =
    useState(false);

  const post = generateJobPost(job);

  async function copyPost() {
    try {
      await navigator.clipboard.writeText(
        post
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        "Failed to copy:",
        error
      );
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">

      <div className="flex items-center justify-between gap-4">

        <div>
          <h2 className="text-lg font-bold">
            Telegram Post
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Ready-to-copy job advertisement
          </p>
        </div>

        <button
          type="button"
          onClick={copyPost}
          className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          {copied
            ? "Copied!"
            : "Copy Post"}
        </button>

      </div>

      <div className="mt-6 rounded-xl bg-gray-50 p-5">

        <pre className="whitespace-pre-wrap font-sans text-sm leading-7">
          {post}
        </pre>

      </div>

    </div>
  );
}