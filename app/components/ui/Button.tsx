import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant =
  | "primary"
  | "primary-lighter" // A/B test arm; see app/lib/ab.ts
  | "secondary"
  | "danger"
  | "ghost"
  | "gold";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-purple-600 text-white hover:bg-purple-500 active:bg-purple-700 " +
    "shadow-md shadow-purple-500/30 hover:shadow-lg hover:shadow-purple-500/40 " +
    "focus-visible:ring-purple-400",
  // A/B test arm — purple-500 fill with off-white text (purple-50 #faf5ff)
  // to preserve label contrast (≥4.5:1) while improving button-vs-background
  // contrast (~5.0:1 instead of ~3.7:1). Selected by getPrimaryButtonVariant().
  "primary-lighter":
    "bg-purple-500 text-purple-50 hover:bg-purple-400 active:bg-purple-600 " +
    "shadow-md shadow-purple-500/30 hover:shadow-lg hover:shadow-purple-500/40 " +
    "focus-visible:ring-purple-300",
  secondary:
    "bg-white/5 text-white border border-white/15 hover:bg-white/10 hover:border-white/25 " +
    "active:bg-white/15 focus-visible:ring-white/60",
  danger:
    "bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 " +
    "shadow-md shadow-rose-500/25 hover:shadow-lg hover:shadow-rose-500/35 " +
    "focus-visible:ring-rose-400",
  ghost:
    "bg-transparent text-white/80 hover:bg-white/10 hover:text-white " +
    "active:bg-white/15 focus-visible:ring-white/60",
  gold:
    "bg-gradient-to-r from-amber-400 to-amber-500 text-black " +
    "hover:from-amber-300 hover:to-amber-400 active:from-amber-500 active:to-amber-600 " +
    "shadow-md shadow-amber-500/30 hover:shadow-lg hover:shadow-amber-500/40 " +
    "focus-visible:ring-amber-300",
};

const BASE_CLASSES =
  "inline-flex items-center justify-center rounded-xl font-semibold whitespace-nowrap " +
  "transition-[background-color,box-shadow,transform,border-color] duration-150 " +
  "active:scale-[0.97] " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-md disabled:hover:shadow-md";

/**
 * For consumers that need Button styling on a non-button element (e.g. an
 * `<a>`/`<Link>` for navigation). The design system intentionally does NOT
 * have a polymorphic `as` prop — this helper covers the few legitimate cases
 * (upgrade links, "Edit profile" links) without forking the styling.
 */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  fullWidth = false,
): string {
  return [
    BASE_CLASSES,
    SIZE_CLASSES[size],
    VARIANT_CLASSES[variant],
    fullWidth ? "w-full" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className,
    children,
    disabled,
    type = "button",
    onClick,
    ...rest
  },
  ref,
) {
  const isInactive = disabled || loading;

  const classes = [
    BASE_CLASSES,
    SIZE_CLASSES[size],
    VARIANT_CLASSES[variant],
    fullWidth ? "w-full" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      type={type}
      disabled={isInactive}
      aria-busy={loading || undefined}
      onClick={loading ? undefined : onClick}
      className={classes}
      {...rest}
    >
      {loading ? (
        <Spinner size={size} />
      ) : (
        <>
          {leftIcon && <span className="shrink-0 inline-flex">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0 inline-flex">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

function Spinner({ size }: { size: ButtonSize }) {
  const px = size === "sm" ? 12 : size === "md" ? 14 : 16;
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
