/* A count against its target, such as 48/50 main deck cards. */

import { Icons } from "../design/icons";

export function CountChip({
  label,
  count,
  target,
  done,
}: {
  label: string;
  count: number;
  target: number;
  done: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--ds-font-mono)",
        fontSize: 12.5,
        color: done ? "var(--ds-success)" : "var(--ds-foreground-muted)",
        fontWeight: 600,
      }}
    >
      {done ? <Icons.CircleCheck size={14} /> : null}
      {label} {count}/{target}
    </span>
  );
}
