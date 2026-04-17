"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoadingSpinner } from "@/components/loading-spinner";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children"> & {
  children: ReactNode;
  pendingLabel: ReactNode;
};

export function FormSubmitButton({ children, pendingLabel, className, disabled, ...rest }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={disabled || pending} aria-busy={pending} {...rest}>
      <span className="btn-with-spinner">
        {pending ? <LoadingSpinner size="sm" decorative label="Submitting" /> : null}
        {pending ? pendingLabel : children}
      </span>
    </button>
  );
}
