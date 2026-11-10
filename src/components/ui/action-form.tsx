"use client";

import { createContext, useActionState, useContext, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./button";

export interface ActionState {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Echo of submitted (non-secret) values so inputs keep what the user typed after a validation error. */
  values?: Record<string, string>;
}

const FormCtx = createContext<ActionState>({});

export function ActionForm({
  action,
  children,
  className,
  successMessage = true,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  successMessage?: boolean;
}) {
  const [state, formAction] = useActionState(action, {} as ActionState);
  return (
    <FormCtx.Provider value={state}>
      <form action={formAction} className={className} noValidate>
        {children}
        {state.error && (
          <p role="alert" className="mt-4 rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
            {state.error}
          </p>
        )}
        {successMessage && state.ok && state.message && (
          <p role="status" className="mt-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-medium text-success">
            {state.message}
          </p>
        )}
      </form>
    </FormCtx.Provider>
  );
}

export function SubmitButton({
  children,
  pendingText = "Gözləyin…",
  variant = "primary",
  size = "md",
  className,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClasses(variant, size, className)}>
      {pending ? pendingText : children}
    </button>
  );
}

interface FieldProps {
  name: string;
  label: string;
  hint?: ReactNode;
  className?: string;
}

function useField(name: string) {
  const state = useContext(FormCtx);
  return { error: state.fieldErrors?.[name], value: state.values?.[name] };
}

const inputBase =
  "w-full rounded-xl border bg-surface px-3.5 text-[0.95rem] text-text placeholder:text-muted/70 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

export function Field({ name, label, hint, className, ...input }: FieldProps & Omit<ComponentProps<"input">, "name">) {
  const { error, value } = useField(name);
  const id = `f-${name}`;
  const isSecret = input.type === "password";
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        name={name}
        defaultValue={isSecret ? undefined : (value ?? (input.defaultValue as string | undefined))}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={cn(inputBase, "h-11", error ? "border-danger" : "border-border-strong")}
        {...input}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextArea({ name, label, hint, className, ...rest }: FieldProps & Omit<ComponentProps<"textarea">, "name">) {
  const { error, value } = useField(name);
  const id = `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        defaultValue={value ?? (rest.defaultValue as string | undefined)}
        aria-invalid={!!error}
        className={cn(inputBase, "min-h-28 py-2.5", error ? "border-danger" : "border-border-strong")}
        {...rest}
      />
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

export function SelectField({
  name,
  label,
  hint,
  className,
  options,
  ...rest
}: FieldProps & Omit<ComponentProps<"select">, "name"> & { options: { value: string; label: string }[] }) {
  const { error, value } = useField(name);
  const id = `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={value ?? (rest.defaultValue as string | undefined)}
        aria-invalid={!!error}
        className={cn(inputBase, "h-11", error ? "border-danger" : "border-border-strong")}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

export function CheckField({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 accent-[var(--gold-500)]" />
      <span>
        <span className="font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}
