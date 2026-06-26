import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/12 bg-[linear-gradient(150deg,rgba(18,55,73,0.95),rgba(7,27,41,0.92))] text-card-foreground shadow-[0_24px_70px_rgba(0,0,0,0.24)]",
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
        "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition duration-200 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-gradient-to-r from-[#79eee7] via-[#30d5c8] to-[#0f8b96] text-[#04262f] shadow-lg shadow-[#30d5c8]/14 hover:brightness-110",
        variant === "secondary" &&
          "border border-white/14 bg-white/9 text-foreground shadow-sm shadow-black/10 hover:border-[#30d5c8]/40 hover:bg-white/14",
        variant === "ghost" && "text-foreground hover:bg-white/10 hover:text-[#79eee7]",
        variant === "danger" && "bg-red-600 text-white shadow-lg shadow-red-950/20 hover:bg-red-700",
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
        "h-11 w-full rounded-lg border border-[#b2e2e5]/35 bg-white/95 px-3 text-sm text-[#102a3a] shadow-sm outline-none transition placeholder:text-[#102a3a]/50 focus:border-[#30d5c8] focus:ring-4 focus:ring-[#30d5c8]/15",
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
        "h-10 rounded-lg border border-[#b2e2e5]/35 bg-white/95 px-3 pr-9 text-center text-sm font-semibold text-slate-950 shadow-sm outline-none transition focus:border-[#30d5c8] focus:ring-4 focus:ring-[#30d5c8]/15",
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
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur",
        tone === "green" && "border-emerald-300/20 bg-emerald-400/12 text-emerald-300",
        tone === "yellow" && "border-amber-300/22 bg-amber-400/14 text-amber-300",
        tone === "red" && "border-red-300/20 bg-red-400/13 text-red-300",
        tone === "blue" && "border-[#79eee7]/22 bg-[#30d5c8]/14 text-[#79eee7]",
        tone === "neutral" && "border-white/12 bg-white/10 text-slate-200",
        className
      )}
      {...props}
    />
  );
}

export function Progress({ value, tone = "green" }: { value: number; tone?: "green" | "yellow" | "red" }) {
  return (
    <div className="h-3 w-full rounded-full bg-slate-950/38 shadow-inner shadow-black/20">
      <div
        className={cn(
          "h-3 rounded-full shadow-sm",
          tone === "green" && "bg-gradient-to-r from-emerald-500 to-[#30d5c8]",
          tone === "yellow" && "bg-gradient-to-r from-amber-500 to-yellow-300",
          tone === "red" && "bg-gradient-to-r from-red-500 to-rose-300"
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
