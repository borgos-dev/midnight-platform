// client/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import PasswordInput from "../components/PasswordInput";

export default function LoginPage() {
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
  
    const form = e.currentTarget;
    const fd = new FormData(form);
  
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
  
    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl: "/dashboard",
    });
  
    setPending(false);
  
    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }
  
    if (result?.url) {
      router.push(result.url);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto" }}>
      <h1>Login</h1>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="w-full rounded-md border border-white/20 bg-transparent px-3 py-2"
        />

        <PasswordInput
          name="password"
          placeholder="Password"
          minLength={6}
          required
        />

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-purple-600 px-3 py-2 text-white hover:bg-purple-700 disabled:opacity-60"
        >
          {pending ? "Logging in..." : "Login"}
        </button>

        <p className="text-sm text-white/70 mt-3">
          Don&apos;t have an account?{" "}
          <a href="/become-a-member" className="text-purple-300 underline">
            Become a member
          </a>
        </p>
      </form>
    </main>
  );
}