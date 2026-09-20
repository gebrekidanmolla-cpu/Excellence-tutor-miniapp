interface JobPostData {
  jobCode: string;
  gender: "MALE" | "FEMALE" | "ANY";
  grade: string;
  subject: string;
  place: string;
  salary: number;
}

function formatGender(
  gender: JobPostData["gender"]
) {
  switch (gender) {
    case "FEMALE":
      return "Female Tutor";

    case "MALE":
      return "Male Tutor";

    case "ANY":
      return "Male/Female Tutor";

    default:
      return "Tutor";
  }
}

export function generateJobPost(
  job: JobPostData
) {
  const tutorType = formatGender(job.gender);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://YOUR-DOMAIN.com";

  return `${tutorType}

Job Code: ${job.jobCode}

Grade: ${job.grade}

Subject: ${job.subject}

Place: ${job.place}

Salary: ${job.salary.toLocaleString()} ETB

Apply Here:
${appUrl}/apply/${job.jobCode}`;
}