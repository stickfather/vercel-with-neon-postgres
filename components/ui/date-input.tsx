"use client";

import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  error?: boolean;
};

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ className = "", error = false, ...props }, ref) => {
    const baseClassName =
      "w-full rounded-full border bg-white px-4 py-2 text-sm leading-relaxed text-brand-ink shadow-sm focus:outline-none focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-70";

    return (
      <input
        ref={ref}
        type="date"
        className={`${baseClassName} ${
          error ? "border-rose-400" : "border-brand-deep-soft/40"
        } ${className}`}
        {...props}
      />
    );
  },
);

DateInput.displayName = "DateInput";
