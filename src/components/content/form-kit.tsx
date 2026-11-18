"use client";

import { createContext, useActionState, useContext, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { ActionState } from "@/components/ui/action-form";

export type { ActionState };
const Ctx = createContext<ActionState>({});

/** Form state for custom controls placed inside <CForm>. */
export function useFormState() {
  return useContext(Ctx);
}

/**
 * Like ActionForm, but a value echoed after a validation error always wins over the field's defaultValue,
 * so edit forms keep what the user typed instead of snapping back to the saved record.
 */
export function CForm({
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
    <Ctx.Provider value={state}>
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
    </Ctx.Provider>
  );
}

function useField(name: string) {
  const s = useContext(Ctx);
  return { error: s.fieldErrors?.[name], echoed: s.values?.[name], submitted: !!s.values };
}

export const inputBase =
  "w-full rounded-xl border bg-surface px-3.5 text-[0.95rem] text-text placeholder:text-muted/70 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60";

interface Base {
  name: string;
  label: string;
  hint?: ReactNode;
  className?: string;
}

function Wrap({ id, label, hint, error, className, children }: { id: string; label: string; hint?: ReactNode; error?: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children}
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

export function CField({ name, label, hint, className, defaultValue, ...rest }: Base & Omit<ComponentProps<"input">, "name">) {
  const { error, echoed } = useField(name);
  const id = `f-${name}`;
  return (
    <Wrap id={id} label={label} hint={hint} error={error} className={className}>
      <input
        id={id}
        name={name}
        defaultValue={echoed ?? (defaultValue as string | undefined)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={cn(inputBase, "h-11", error ? "border-danger" : "border-border-strong")}
        {...rest}
      />
    </Wrap>
  );
}

export function CTextArea({ name, label, hint, className, defaultValue, rows = 4, ...rest }: Base & Omit<ComponentProps<"textarea">, "name">) {
  const { error, echoed } = useField(name);
  const id = `f-${name}`;
  const controlled = rest.value !== undefined;
  return (
    <Wrap id={id} label={label} hint={hint} error={error} className={className}>
      <textarea
        id={id}
        name={name}
        rows={rows}
        {...(controlled ? {} : { defaultValue: echoed ?? (defaultValue as string | undefined) })}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={cn(inputBase, "py-2.5", error ? "border-danger" : "border-border-strong")}
        {...rest}
      />
    </Wrap>
  );
}

export function CSelect({
  name, label, hint, className, options, defaultValue, ...rest
}: Base & Omit<ComponentProps<"select">, "name"> & { options: { value: string; label: string }[] }) {
  const { error, echoed } = useField(name);
  const id = `f-${name}`;
  const controlled = rest.value !== undefined;
  return (
    <Wrap id={id} label={label} hint={hint} error={error} className={className}>
      <select
        // React ignores later defaultValue changes on <select>; remount when a new echoed value arrives so a failed submit keeps the choice.
        key={controlled ? undefined : (echoed ?? "-")}
        id={id}
        name={name}
        {...(controlled ? {} : { defaultValue: echoed ?? (defaultValue as string | undefined) })}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={cn(inputBase, "h-11", error ? "border-danger" : "border-border-strong")}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrap>
  );
}

export function CCheck({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked?: boolean }) {
  const { echoed, submitted } = useField(name);
  const checked = submitted ? echoed === "on" : !!defaultChecked;
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={checked} className="mt-0.5 h-4 w-4 accent-[var(--gold-500)]" />
      <span>
        <span className="font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** Image/PDF picker with the current file shown and an optional "remove" checkbox. */
export function CFile({
  name, label, hint, accept, currentUrl, removeName, className,
}: Base & { accept: string; currentUrl?: string | null; removeName?: string }) {
  const { error } = useField(name);
  const id = `f-${name}`;
  return (
    <Wrap id={id} label={label} hint={hint} error={error} className={className}>
      {currentUrl && (
        <div className="mb-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentUrl} alt="" className="h-16 w-24 rounded-lg border border-border object-cover" />
          {removeName && (
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" name={removeName} className="h-4 w-4 accent-[var(--gold-500)]" /> Cari şəkli sil
            </label>
          )}
        </div>
      )}
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={cn(inputBase, "py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:font-semibold", error ? "border-danger" : "border-border-strong")}
      />
    </Wrap>
  );
}

export function FieldError({ name }: { name: string }) {
  const { error } = useField(name);
  return error ? (
    <p role="alert" className="mt-1 text-xs font-medium text-danger">
      {error}
    </p>
  ) : null;
}
