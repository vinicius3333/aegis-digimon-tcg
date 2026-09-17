/* The centre column of the field: the opponent's row, the memory band, the viewer's
   row. It owns the column, not the rows — each row and the band between them decides
   its own chrome. */

import type { ReactNode } from "react";

export function BattleZones({ children }: { children: ReactNode }) {
  return (
    <section className="game-battle-zones" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      {children}
    </section>
  );
}
