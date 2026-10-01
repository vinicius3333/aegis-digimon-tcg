import { Button } from "../../../design/primitives";
import { BoardPromptRail } from "../../BoardDecisionRail";

/**
 * The yes/no question for a keyword that can save a Digimon from deletion (＜Evade＞,
 * ＜Barrier＞). It sits on the same left rail as every other board prompt, so the
 * board stays visible while the player decides; the answers stack, so long localized
 * labels never push past the rail.
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
  rulesText: string;
  acceptLabel: string;
  declineLabel: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <BoardPromptRail
      variant="prompt"
      className="keyword-save-overlay"
      label={keyword}
      eyebrow={keyword}
      art={cardId}
      prompt={keyword}
      clause={rulesText}
    >
      <Button full onClick={onAccept}>
        {acceptLabel}
      </Button>
      <Button full variant="secondary" onClick={onDecline}>
        {declineLabel}
      </Button>
    </BoardPromptRail>
  );
}
