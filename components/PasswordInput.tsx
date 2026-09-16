"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// Reusable password field — an Eye/EyeOff toggle button flips between
// type="password" and type="text". Used everywhere a password is
// typed (sign-in, sign-up, profile password change, OTP reset) so the
// show/hide behavior stays identical instead of three ad-hoc copies.
export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  required,
  minLength,
  autoComplete,
  className = "",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`input pr-10 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
        className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center text-fg-subtle transition-colors hover:text-fg"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
