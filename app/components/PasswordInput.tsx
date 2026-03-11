"use client"

import { useState } from "react"

type Props = {
    name?: string
    placeholder?: string
    required?: boolean
    minLength?: number
}

export default function PasswordInput({
    name = "password",
    placeholder = "Password",
    required = true,
    minLength,
}: Props) {
    const [show, setShow] = useState(false)

    return (
        <div className="relative">
            <input
                name={name}
                type={show ? "text" : "password"}
                placeholder={placeholder}
                required={required}
                minLength={minLength}
                className="w-full rounded-md border border-white/20 bg-transparent px-3 py-2 pr-16"
            />

            <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-sm text-white/70 hover:text-white"
                aria-label={show ? "Hide password" : "Show password"}
            >
                {show ? "Hide" : "Show"}
            </button>
        </div>
    )
}
