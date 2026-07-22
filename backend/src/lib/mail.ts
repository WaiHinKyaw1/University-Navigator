import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});

transporter.verify((error) => {
  if (error) {
    console.log("SMTP ERROR:", error.message);
  } else {
    console.log("SMTP READY");
  }
});

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string,
) {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  // const url = `${process.env.BACKEND_URL}/api/auth/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"University Advisor"`,
    to: email,
    subject: "Verify your account",
    html: `
      <h2>Hello ${name}</h2>

      <p>Please verify your email address.</p>

      <a 
        href="${url}"
        style="
          background:#2563eb;
          color:white;
          padding:10px 20px;
          text-decoration:none;
          border-radius:5px;
        "
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
) {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: `"University Advisor"`,

    to: email,

    subject: "Reset your password",

    html: `

      <h2>Hello ${name}</h2>

      <p>
      Click below to reset your password.
      </p>


       <a href="${url}"
  style="
  background:#2563eb;
  color:white;
  padding:12px 20px;
  border-radius:5px;
  text-decoration:none;
  ">
  Reset Password
  </a>


      <p>
      This link expires in 1 hour.
      </p>

    `,
  });
}
