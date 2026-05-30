import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Midnight <noreply@midnight24.cam>";
const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

/**
 * Send a password-reset email with a one-time link.
 */
export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${BASE_URL}/reset-password?token=${token}`;

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Reset your Midnight password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0a0a12;border-radius:12px;color:#fff">
        <h2 style="color:#a855f7;margin-top:0">Password Reset</h2>
        <p style="color:#ccc;line-height:1.6">
          You requested a password reset for your Midnight account.
          Click the button below to choose a new password. This link expires in <strong>15 minutes</strong>.
        </p>
        <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Reset Password
        </a>
        <p style="color:#666;font-size:12px;margin-top:24px">
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend API error: ${error.message}`);
  }

  return data;
}

/**
 * Send an email-verification link after signup.
 */
export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${BASE_URL}/verify-email?token=${token}`;

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Verify your Midnight email",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0a0a12;border-radius:12px;color:#fff">
        <h2 style="color:#a855f7;margin-top:0">Welcome to Midnight</h2>
        <p style="color:#ccc;line-height:1.6">
          Thanks for signing up! Verify your email address to activate your account.
          This link expires in <strong>24 hours</strong>.
        </p>
        <a href="${verifyUrl}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Verify Email
        </a>
        <p style="color:#666;font-size:12px;margin-top:24px">
          If you did not create an account, ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend API error: ${error.message}`);
  }

  return data;
}
