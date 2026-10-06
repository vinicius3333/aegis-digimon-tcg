import { en } from "../../../i18n/en";
import { KeywordSavePrompt } from "./KeywordSavePrompt";

export function EvadeOverlay({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <KeywordSavePrompt
      keyword="＜Evade＞"
      rulesText={en["overlay.evadeRules"]}
      onAccept={onAccept}
      onDecline={onDecline}
    />
  );
}
