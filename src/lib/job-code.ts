import { prisma } from "@/lib/prisma";

const JOB_CODE_PREFIX = "E";
const JOB_CODE_START = 1000;

const JOB_CODE_PATTERN = new RegExp(
  `^${JOB_CODE_PREFIX}(\\d+)$`
);

function parseJobCodeNumber(jobCode: string) {
  const match = JOB_CODE_PATTERN.exec(jobCode);

  return match ? Number(match[1]) : null;
}

export async function generateNextJobCode() {
  const jobs = await prisma.job.findMany({
    where: {
      jobCode: {
        startsWith: JOB_CODE_PREFIX,
      },
    },
    select: {
      jobCode: true,
    },
  });

  let maxNumber = JOB_CODE_START - 1;

  for (const job of jobs) {
    const value = parseJobCodeNumber(job.jobCode);

    if (value !== null && value > maxNumber) {
      maxNumber = value;
    }
  }

  return `${JOB_CODE_PREFIX}${maxNumber + 1}`;
}
