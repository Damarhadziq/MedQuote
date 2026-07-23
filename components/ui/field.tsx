"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-800 outline-none transition-colors duration-150 placeholder:text-placeholder focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:ring-red-500/10",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-20 w-full resize-y rounded-md border border-border bg-white px-3 py-2.5 text-sm leading-5 text-slate-800 outline-none transition-colors duration-150 placeholder:text-placeholder focus:border-primary focus:ring-2 focus:ring-primary/10 aria-[invalid=true]:border-red-500",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Field({
  label,
  htmlFor,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const errorId = `${htmlFor}-error`;
  return (
    <div className="grid gap-1.5" data-invalid={Boolean(error) || undefined}>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-700" htmlFor={htmlFor}>
          {label}
        </label>
        {optional ? (
          <span className="text-xs font-medium text-slate-400">Opsional</span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p className="text-xs leading-5 text-red-600" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
