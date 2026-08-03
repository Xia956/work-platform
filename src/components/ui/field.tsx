import type {
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

type FieldSize = "sm" | "md";

function fieldClassName(size: FieldSize, className?: string) {
  return cn("ui-field", size === "sm" && "ui-field--compact", className);
}

export function Input({
  size = "md",
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & { size?: FieldSize }) {
  return <input className={fieldClassName(size, className)} {...props} />;
}

export function Textarea({
  size = "md",
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { size?: FieldSize }) {
  return <textarea className={fieldClassName(size, className)} {...props} />;
}

export function Select({
  size = "md",
  className,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & { size?: FieldSize }) {
  return <select className={fieldClassName(size, className)} {...props} />;
}

export function FieldLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("type-label text-ink-muted", className)} {...props} />;
}

export function FieldHelp({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("type-caption text-ink-subtle", className)} {...props} />;
}
