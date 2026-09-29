/* Redesign surfaces. `Panel` is the hero surface: the "blueprint" look in the
   light theme and the navy "console" look in the dark theme. Content inside it
   reads its colors from the --aegis-panel-* custom properties (see surfaces.css),
   so it stays legible in both. */

import type { HTMLAttributes, ReactNode } from "react";
import { Icons } from "./icons";
import "./surfaces.css";

function classNames(...names: (string | false | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

type PanelElement = "section" | "div" | "article" | "aside" | "header";

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: PanelElement;
  circuitNodes?: boolean;
}

export function Panel({ as: Element = "section", circuitNodes = true, className, children, ...props }: PanelProps) {
  return (
    <Element className={classNames("aegis-hero-panel", className)} {...props}>
      {circuitNodes ? (
        <>
          <span className="aegis-circuit-node" data-corner="top-right" aria-hidden="true" />
          <span className="aegis-circuit-node" data-corner="bottom-left" aria-hidden="true" />
        </>
      ) : null}
      {children}
    </Element>
  );
}

export function SectionHeading({
  title,
  action,
  id,
  level = 2,
}: {
  title: ReactNode;
  action?: ReactNode;
  /** For `aria-labelledby` on the section this heading names. */
  id?: string;
  level?: 2 | 3;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div className="aegis-section-heading">
      <Heading id={id} className="aegis-section-heading__title">
        {title}
      </Heading>
      <span className="aegis-section-heading__rule" aria-hidden="true" />
      {action}
    </div>
  );
}

export interface Stat {
  label: string;
  value: ReactNode;
}

export function StatStrip({ stats, className }: { stats: readonly Stat[]; className?: string }) {
  return (
    <dl className={classNames("aegis-stat-strip", className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="aegis-stat-strip__item">
          <dt className="aegis-stat-strip__label">{stat.label}</dt>
          <dd className="aegis-stat-strip__value">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function InfoNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={classNames("aegis-info-note", className)}>
      <span className="aegis-info-note__icon" aria-hidden="true">
        <Icons.Info size={16} />
      </span>
      <div className="aegis-info-note__body">{children}</div>
    </div>
  );
}
