import Link from "next/link";

export default function WelcomePage() {
    return (
        <main style={{ maxWidth: 520, margin: "60px auto", padding: 16 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>Account created ✅</h1>
            <p style={{ marginTop: 12, opacity: 0.85 }}>
                Your account has been created successfully.
            </p>

            <p style={{ marginTop: 8, opacity: 0.85 }}>
                Next step: login to access your creator dashboard and complete your profile.
            </p>

            <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
                <Link
                    href="/login"
                    className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
                >
                    Go to Login
                </Link>

                <Link
                    href="/"
                    className="rounded-md border border-white/20 px-4 py-2 text-white/90 hover:bg-white/10"
                >
                    Back Home
                </Link>
            </div>
        </main>
    );
}
