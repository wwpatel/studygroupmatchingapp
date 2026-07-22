import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type LabelHTMLAttributes } from "react";

export const Label = ({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("block text-sm font-medium text-ink mb-1.5", className)} {...props} />
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-line bg-paper-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-ink/40 focus:ring-2 focus:ring-lavender/30",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-line bg-paper-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-ink/40 focus:ring-2 focus:ring-lavender/30 resize-y",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
