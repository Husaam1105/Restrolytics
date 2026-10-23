import { cn } from "@/lib/utils";

/**
 * Restrolytics mark: a kitchen order ticket (torn bottom edge) holding three
 * rising bars. The ticket is the restaurant; the bars are the analytics.
 */
export function BrandGlyph({ className }: { className?: string | undefined }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <path
        d="M6 4.5A2.5 2.5 0 0 1 8.5 2h15A2.5 2.5 0 0 1 26 4.5V28l-2.5-1.75L21 28l-2.5-1.75L16 28l-2.5-1.75L11 28l-2.5-1.75L6 28Z"
        className="fill-primary"
      />
      <rect x="10" y="16" width="3" height="6" rx="1" className="fill-primary-foreground opacity-60" />
      <rect x="14.5" y="12" width="3" height="10" rx="1" className="fill-primary-foreground opacity-80" />
      <rect x="19" y="8" width="3" height="14" rx="1" className="fill-brand" />
    </svg>
  );
}

export function BrandMark({
  className,
  wordmarkClassName,
  glyphClassName,
}: {
  className?: string | undefined;
  wordmarkClassName?: string | undefined;
  glyphClassName?: string | undefined;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BrandGlyph className={glyphClassName} />
      <span
        className={cn(
          "font-display text-[1.2rem] leading-none font-extrabold tracking-[-0.01em] [font-stretch:78%]",
          wordmarkClassName,
        )}
      >
        Restrolytics
      </span>
    </span>
  );
}
