"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteAccount } from "../actions/deleteAccount";

/**
 * Permanently soft-deletes the calling creator's account.
 *
 * Soft-delete details: the `deletedAt` column is set, the password hash
 * is overwritten with a sentinel value, and any outstanding reset /
 * verification tokens are wiped (see actions/deleteAccount.ts). The
 * authorize() callback in auth.ts then rejects the email forever — a
 * banned creator can't re-register with the same address. The server
 * action redirects to "/" after deletion.
 *
 * Browser confirm() is intentional here, not a styled modal — it's
 * universal, accessible without our own focus-trap implementation, and
 * has just enough friction that an accidental click can't destroy the
 * account.
 */
export default function DeleteAccountButton() {
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    const confirmed = confirm(
      "Permanently delete your account?\n\n" +
        "This wipes your profile, posts, links, and analytics history.\n" +
        "You won't be able to re-register with the same email.\n\n" +
        "This action CANNOT be undone."
    );
    if (!confirmed) return;

    startTransition(async () => {
      await deleteAccount();
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg border border-rose-500/50 bg-rose-500/10 hover:bg-rose-500/20 hover:border-rose-500/70 px-4 py-2.5 text-[12.5px] font-semibold text-rose-200 transition disabled:opacity-50 disabled:cursor-wait"
    >
      <Trash2 size={14} strokeWidth={2.2} />
      {pending ? "Deleting…" : "Delete my account"}
    </button>
  );
}
