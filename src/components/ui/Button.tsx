import { type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-lavande-500 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-lavande-500 text-white hover:bg-lavande-700",
    outline: "border border-lavande-300 text-lavande-700 hover:bg-lavande-100",
    ghost: "text-encre-soft hover:bg-grege-200",
  }[variant];
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5",
  }[size];
  return (
    <button className={`${base} ${variants} ${sizes} ${className}`} {...props}>
      {children}
    </button>
  );
}
