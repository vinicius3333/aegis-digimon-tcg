import { en } from "../../../i18n/en";
import { KeywordSavePrompt } from "./KeywordSavePrompt";

export function BarrierOverlay({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <KeywordSavePrompt
      keyword="＜Barrier＞"
      rulesText={en["overlay.barrierRules"]}
      onAccept={onAccept}
      onDecline={onDecline}
    />
  );
}
