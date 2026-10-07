/* The centre column of the field: the opponent's row, the memory band, the viewer's
   row. It owns the column, not the rows — each row and the band between them decides
   its own chrome. */

import type { ReactNode } from "react";

export function BattleZones({
  children,
  opponentFieldEffects,
  viewerFieldEffects,
}: {
  children: ReactNode;
  opponentFieldEffects?: boolean;
  viewerFieldEffects?: boolean;
}) {
  return (
    <section
      className="game-battle-zones"
      data-opponent-field-effects={opponentFieldEffects || undefined}
      data-viewer-field-effects={viewerFieldEffects || undefined}
      style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}
    >
      {children}
    </section>
  );
}
