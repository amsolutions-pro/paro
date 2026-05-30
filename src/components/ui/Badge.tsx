import { type ReactNode } from "react";

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "armenien" | "success" | "warning";
}) {
  const cls = {
    default: "bg-grege-200 text-encre-soft",
    armenien: "bg-armenien-soft text-armenien",
    success: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-800",
  }[variant];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}
