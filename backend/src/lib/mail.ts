import nodemailer, { type SendMailOptions } from "nodemailer";

const smtpUser = process.env.GMAIL_USER;
const smtpPassword = process.env.GMAIL_PASSWORD;
const hasSmtpCredentials = Boolean(smtpUser && smtpPassword);

const transporter = hasSmtpCredentials
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    })
  : null;

if (transporter) {
  transporter.verify((error) => {
    if (error) {
      console.warn("SMTP unavailable:", error.message);
    } else {
      console.log("SMTP READY");
    }
  });
} else {
  console.warn("SMTP is not configured; verification and reset emails will be skipped.");
}

async function sendEmail(options: SendMailOptions): Promise<void> {
  if (!transporter) return;
  await transporter.sendMail(options);
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string,
): Promise<void> {
  const url = `${process.env.FRONTEND_URL ?? ""}/verify-email?token=${token}`;

  await sendEmail({
    from: smtpUser ? `"University Advisor" <${smtpUser}>` : '"University Advisor"',
    to: email,
    subject: "Verify your account",
    html: `
      <h2>Hello ${name}</h2>
      <p>Please verify your email address.</p>
      <a
        href="${url}"
        style="background:#2563eb;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;"
      >
        Verify Email
      </a>
      <p>This link expires in 1 hour.</p>
    `,
  });
}

export async function sendResetPasswordEmail(
  email: string,
  name: string,
  token: string,
): Promise<void> {
  const url = `${process.env.FRONTEND_URL ?? ""}/reset-password?token=${token}`;

  await sendEmail({
    from: smtpUser ? `"University Advisor" <${smtpUser}>` : '"University Advisor"',
    to: email,
    subject: "Reset your password",
    html: `
      <h2>Hello ${name}</h2>
      <p>Click below to reset your password.</p>
      <a
        href="${url}"
        style="background:#2563eb;color:white;padding:12px 20px;border-radius:5px;text-decoration:none;"
      >
        Reset Password
      </a>
      <p>This link expires in 1 hour.</p>
    `,
  });
}
