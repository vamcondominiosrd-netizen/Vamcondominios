"use client";

import { InputHTMLAttributes } from "react";

interface VAMInputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
}

export default function VAMInput({
  label,
  error,
  required,
  className = "",
  ...props
}: VAMInputProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-600">*</span>
        )}
      </label>

      <input
        {...props}
        className={`
          w-full
          rounded-xl
          border
          border-slate-300
          bg-white
          px-3
          py-2.5
          text-sm
          shadow-sm
          outline-none
          transition
          focus:border-blue-600
          focus:ring-2
          focus:ring-blue-100
          disabled:bg-slate-100
          disabled:text-slate-500
          ${className}
        `}
      />

      {error && (
        <p className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}