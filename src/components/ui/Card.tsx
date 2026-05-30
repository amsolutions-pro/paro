import { type ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border-grege-300 bg-grege-50 rounded-xl border p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
