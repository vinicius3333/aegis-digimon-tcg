import type { ReactNode } from "react";
import { Button } from "../../../design/primitives";
import { CardPromptFrame } from "./CardPromptFrame";
import "../effectPromptFamily.css";

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
    <CardPromptFrame
      cardId={cardId}
      eyebrow=""
      title={keyword}
      description={rulesText}
      className="keyword-save-overlay"
    >
      <div className="game-actions-row">
        <Button full onClick={onAccept}>
          {acceptLabel}
        </Button>
        <Button full variant="secondary" onClick={onDecline}>
          {declineLabel}
        </Button>
      </div>
    </CardPromptFrame>
  );
}
