/** A candidate DecisionOverlay can render: a selectable target, a card to reorder, or both. */
export interface DecisionCandidate {
  instanceId: string;
  cardId?: string;
  artId?: string;
  selectable?: boolean;
  sourceCount?: number;
  currentDP?: number;
  isSuspended?: boolean;
}
