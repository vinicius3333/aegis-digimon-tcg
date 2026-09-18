import type { ReactNode } from "react";
import { Button } from "../../../design/primitives";
import { CardArt } from "../CardArt";

/**
 * The yes/no sheet for a keyword that can save a Digimon from deletion (＜Evade＞,
 * ＜Barrier＞). It shows the card and the keyword's rules text; the buttons carry the
 * question, so the box is sized by them and the text wraps to that width.
 */
export function KeywordSavePrompt({
  keyword,
  cardId,
  rulesText,
  acceptLabel,
  declineLabel,
  onAccept,
  onDecline,
}: {
  keyword: string;
  cardId: string | undefined;
  rulesText: ReactNode;
  acceptLabel: string;
  declineLabel: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="combat-prompt keyword-prompt" style={{ animation: "battle-dialog-in 200ms ease-out" }}>
      <div className="keyword-prompt__title">{keyword}</div>
      <div className="keyword-prompt__body">
        {cardId ? <CardArt cardId={cardId} width={96} /> : null}
        <p className="keyword-prompt__rules">{rulesText}</p>
      </div>
      <div className="game-actions-row">
        <Button full onClick={onAccept}>
          {acceptLabel}
        </Button>
        <Button full variant="secondary" onClick={onDecline}>
          {declineLabel}
        </Button>
      </div>
    </div>
  );
}
