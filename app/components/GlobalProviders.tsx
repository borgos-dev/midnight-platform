"use client";

import { MotionConfig } from "framer-motion";

/**
 * Single client-side provider wrapper for the app shell.
 *
 * Currently:
 *  - MotionConfig with reducedMotion="user" so every Framer animation in
 *    the tree honors the OS-level prefers-reduced-motion setting.
 *
 * Add new global providers (toast, modal portal, query client, etc.)
 * here so the layout.tsx stays a server component.
 */
export function GlobalProviders({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
    </MotionConfig>
  );
}
