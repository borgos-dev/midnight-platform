import Link from "next/link";
export default function Navbar() {
    return (
        <nav className="w-full border-b border-white/10 px-8 py-4 flex items-center justify-between">
            {/* Logo */}
            <div className="text-2xl font-bold tracking-wide">
                🌙 Midnight24/7
            </div>

            <ul className="hidden md:flex space-x-8 text-sm uppercase tracking-widest text-white/80">
                <li>
                    <Link href="/" className="hover:text-purple-400">
                        Home
                    </Link>
                </li>
                <li>
                    <Link href="/explore?city=Douala" className="hover:text-purple-400">
                        Explore
                    </Link>
                </li>
                
                <li>
                    <Link href="/become-a-member" className="hover:text-purple-400">
                        Become a member
                    </Link>
                </li>
            </ul>



            <div className="flex space-x-4">
                <Link href="/login" className="text-sm text-white/80 hover:text-purple-400">
                    Login
                </Link>
                <Link
                    href="/signup"
                    className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-full text-sm font-semibold"
                >
                    Sign Up
                </Link>
            </div>

        </nav>
    );
  }