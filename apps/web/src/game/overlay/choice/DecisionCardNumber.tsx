type Params = { cardId: string };

export function DecisionCardNumber({ cardId }: Params) {
  return <span className="decision-overlay__candidate-id">{cardId}</span>;
}
