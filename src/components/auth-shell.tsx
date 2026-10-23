import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { BrandMark } from "@/components/brand-mark";

/** Shared frame for sign-in, password reset and invite pages. */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1fr_1.05fr]">
      <main id="main" className="flex flex-col px-4 py-6 sm:px-10">
        <Link to="/" className="w-fit rounded-lg" aria-label="Restrolytics home">
          <BrandMark />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-title">{title}</h1>
          {description ? <p className="mt-2 text-muted-foreground">{description}</p> : null}
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-8 text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </main>
      <aside
        className="relative hidden overflow-hidden bg-brand-soft lg:flex lg:items-center lg:justify-center lg:p-12"
        aria-hidden="true"
      >
        <div className="max-w-md space-y-6">
          <p className="text-headline text-foreground">
            Tonight's numbers, before you lock the door.
          </p>
          <div className="surface-raised space-y-3 p-5">
            {[
              ["Net sales", "$5,312"],
              ["Labor", "18.4%"],
              ["Checklists", "All done"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-baseline justify-between border-b pb-3 last:border-0 last:pb-0"
              >
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-figure text-xl">{value}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">Example data</p>
        </div>
      </aside>
    </div>
  );
}

/** Small form-field wrapper used across auth pages. */
export function AuthField({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
