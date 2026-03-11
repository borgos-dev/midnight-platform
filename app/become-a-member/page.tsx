"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BecomeAMemberPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setPending(true);

    const form = e.currentTarget;
    const fd = new FormData(form);

    const res = await fetch("/api/become-a-member", { method: "POST", body: fd });
    const data = await res.json();
    setPending(false);

    if (!res.ok) {
      setErrorMessage(data?.error ?? "Failed to create account");
      return;
    }

    router.replace(data?.redirect ?? "/login");
  }

  return (
    <main className="max-w-[420px] mx-auto mt-10">
      <h1 className="text-2xl font-semibold text-white">Become a member</h1>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
        {/* NAME */}
        <input
          name="name"
          placeholder="Name (optional)"
          className="w-full rounded-md border border-gray-300 bg-white/90 text-black px-3 py-2 placeholder:text-gray-500"
        />

        {/* EMAIL */}
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="w-full rounded-md border border-gray-300 bg-white/90 text-black px-3 py-2 placeholder:text-gray-500"
        />

        {/* PASSWORD WITH SHOW/HIDE */}
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password (min 6)"
            required
            minLength={6}
            className="w-full rounded-md border border-gray-300 bg-white/90 text-black px-3 py-2 pr-16 placeholder:text-gray-500"
          />

          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-purple-600 font-medium"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {/* ERROR */}
        {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

        {/* SUBMIT */}
        <button type="submit" disabled={pending} className="mt-2 rounded-md bg-purple-600 px-3 py-2 text-white hover:bg-purple-700 disabled:opacity-60">
          {pending ? "Creating..." : "Create account"}
        </button>

        {/* LOGIN LINK */}
        <p className="text-sm text-white/70 mt-3">
          Already have an account?{" "}
          <a href="/login" className="text-purple-300 underline">
            Login
          </a>
        </p>
      </form>
    </main>
  );
}