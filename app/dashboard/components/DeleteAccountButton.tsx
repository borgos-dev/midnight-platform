"use client";

import { useTransition } from "react";
import { deleteAccount } from "../actions/deleteAccount";

export default function DeleteAccountButton() {
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    const confirmed = confirm(
      "This will permanently delete your account and all data. This action cannot be undone. Continue?"
    );

    if (!confirmed) return;

    startTransition(async () => {
      await deleteAccount();
    });
  };

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
    >
      {pending ? "Deleting..." : "Delete Account"}
    </button>
  );
}