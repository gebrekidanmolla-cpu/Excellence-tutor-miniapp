"use client";

import { generateJobPost } from "@/lib/job-post";
import { CopyButton } from "@/components/shared/CopyButton";

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

export default function JobPostPreview({ job }: JobPostPreviewProps) {
  const post = generateJobPost(job);

  return (
    <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading font-medium">Telegram post</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Ready-to-copy job advertisement.
          </p>
        </div>

        <CopyButton
          value={post}
          size="lg"
          successMessage="Job post copied"
          className="shrink-0"
        >
          Copy post
        </CopyButton>
      </div>

      <pre className="mt-5 overflow-x-auto rounded-lg bg-muted p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap">
        {post}
      </pre>
    </section>
  );
}
