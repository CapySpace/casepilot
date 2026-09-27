import type { Metadata } from "next";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password · CasePilot",
};

export default function ForgotPasswordPage() {
  return (
    <div className="w-full rounded-2xl border border-border bg-card p-lg shadow-level-1 sm:p-xl">
      <ForgotPasswordForm />
    </div>
  );
}
