import { useState, type ComponentProps, type ReactNode } from "react";
import { Info } from "lucide-react";
import { cardImageUrls, getCardDefinition } from "@aegis/shared";
import { cn } from "@/lib/utils";
import { COLORS, colorKey, type ColorName } from "@/design/theme";

export function ConsolePanel({
  className,
  children,
  circuitNodes = true,
  ...props
}: ComponentProps<"section"> & { circuitNodes?: boolean }) {
  return (
    <section className={cn("console-panel", className)} {...props}>
      {circuitNodes ? (
        <>
          <span className="circuit-node top-4 right-4" data-trace="left" aria-hidden />
          <span className="circuit-node bottom-4 left-4" data-trace="right" aria-hidden />
        </>
      ) : null}
      {children}
    </section>
  );
}

export function Surface({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("rounded-lg border bg-card text-card-foreground", className)} {...props}>
      {children}
    </div>
  );
}

export interface Stat {
  label: string;
  value: ReactNode;
}

export function StatStrip({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <dl
      className={cn(
        "scanner-frame grid grid-cols-2 border border-trace/20 bg-ink sm:grid-cols-[repeat(auto-fit,minmax(0,1fr))]",
        className,
      )}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col items-center gap-1 border-on-ink/10 px-3 py-4 text-center not-last:border-r"
        >
          <dd className="font-display text-xl font-bold text-on-ink tabular-nums">{stat.value}</dd>
          <dt className="text-[11px] tracking-[0.14em] text-on-ink-muted uppercase">{stat.label}</dt>
        </div>
      ))}
    </dl>
  );
}

export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <h2 className="font-display text-xl font-bold tracking-[-0.015em]">{title}</h2>
      <div className="flex flex-1 items-center" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        <span className="size-1.5 rounded-full bg-primary" />
      </div>
      {action}
    </div>
  );
}

export function InfoNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 rounded-md border border-info-border/50 bg-info-surface/50 px-3 py-2 text-sm text-fg-secondary",
        className,
      )}
    >
      <Info className="size-4 shrink-0 text-primary" aria-hidden />
      {children}
    </p>
  );
}

export function CardArt({ cardId, className }: { cardId: string; className?: string }) {
  const sources = cardImageUrls(cardId);
  const [attempt, setAttempt] = useState(0);
  const name = getCardDefinition(cardId)?.nameEn ?? cardId;
  const source = sources[attempt];
  return (
    <div className={cn("aspect-[63/88] overflow-hidden rounded-[6%/4.3%] bg-muted ring-1 ring-black/10", className)}>
      {source ? (
        <img
          src={source}
          alt={name}
          loading="lazy"
          className="size-full object-cover"
          onError={() => setAttempt((value) => value + 1)}
        />
      ) : (
        <div className="grid size-full place-items-center p-2 text-center text-xs text-muted-foreground">{name}</div>
      )}
    </div>
  );
}

export function ColorDots({ colors }: { colors: readonly (ColorName | string)[] }) {
  return (
    <span className="inline-flex gap-1" aria-label={`Colors: ${colors.join(", ")}`}>
      {colors.map((color) => (
        <span
          key={color}
          className="size-2.5 rounded-full ring-1 ring-black/10"
          style={{ background: COLORS[colorKey(color)].base }}
        />
      ))}
    </span>
  );
}
