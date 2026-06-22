import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-white/12 bg-[#123145]/86 text-card-foreground shadow-[0_16px_44px_rgba(0,0,0,0.16)] backdrop-blur",
        className
      )}
      {...props}
    />
  );
}

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-gradient-to-r from-[#30d5c8] to-[#087b8c] text-white shadow-lg shadow-[#30d5c8]/10 hover:from-[#5fe1d8] hover:to-[#0a8fa1]",
        variant === "secondary" &&
          "border border-white/14 bg-white/8 text-foreground hover:border-[#30d5c8]/35 hover:bg-white/13",
        variant === "ghost" && "text-foreground hover:bg-white/10",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-[#b2e2e5]/35 bg-white/95 px-3 text-sm text-[#102a3a] shadow-sm outline-none transition placeholder:text-[#102a3a]/50 focus:border-[#30d5c8] focus:ring-4 focus:ring-[#30d5c8]/15",
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 rounded-md border border-[#b2e2e5]/35 bg-white/95 px-3 pr-9 text-sm font-semibold text-slate-950 shadow-sm outline-none transition focus:border-[#30d5c8] focus:ring-4 focus:ring-[#30d5c8]/15",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "green" | "yellow" | "red" | "blue" | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "green" && "bg-emerald-400/10 text-emerald-300",
        tone === "yellow" && "bg-amber-400/12 text-amber-300",
        tone === "red" && "bg-red-400/12 text-red-300",
        tone === "blue" && "bg-[#30d5c8]/12 text-[#79eee7]",
        tone === "neutral" && "bg-white/10 text-slate-200",
        className
      )}
      {...props}
    />
  );
}

export function Progress({ value, tone = "green" }: { value: number; tone?: "green" | "yellow" | "red" }) {
  return (
    <div className="h-2.5 w-full rounded-full bg-white/10">
      <div
        className={cn(
          "h-2.5 rounded-full",
          tone === "green" && "bg-emerald-500",
          tone === "yellow" && "bg-amber-500",
          tone === "red" && "bg-red-500"
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
