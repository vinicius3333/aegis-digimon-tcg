import type { ReactNode } from "react";

export type PlayerDeckDialog = { player: string; deckName: string; dialog: (onClose: () => void) => ReactNode };
