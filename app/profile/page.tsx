import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function ProfilePage() {
    const session = await auth()

    if (!session?.user) {
        redirect("/login")
    }

    return (
        <main className="mx-auto mt-10 max-w-[900px] px-4">
            <h1 className="text-xl font-semibold">Your Profile</h1>

            <p className="mt-2 text-sm text-white/70">
                Logged in as: {session.user.email ?? session.user.name ?? "Unknown"}
            </p>

            <section className="mt-8 rounded-lg border border-white/10 p-4">
                <h2 className="font-medium">Creator Editor (next)</h2>
                <p className="mt-2 text-sm text-white/70">
                    This is where you&apos;ll edit bio, services, location, price, and upload media.
                </p>
            </section>
        </main>
    )
}
