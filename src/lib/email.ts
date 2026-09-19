import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(
  email: string,
  code: string
) {
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: [email],
    subject: "Verify your Excellence Tutor email",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Excellence Tutor</h2>

        <p>Thank you for registering as a tutor.</p>

        <p>Your email verification code is:</p>

        <div style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          margin: 24px 0;
        ">
          ${code}
        </div>

        <p>This code expires in 10 minutes.</p>

        <p>If you did not request this code, you can safely ignore this email.</p>

        <p>
          — Excellence Tutor Team
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}