import type { DecisionRequest } from "@aegis/shared";
import type { TranslationKey } from "@/i18n/translationTypes";

type PromptKey = NonNullable<DecisionRequest["options"]>["promptKey"];

export function getAttackPromptNoteKey(promptKey: PromptKey): TranslationKey | undefined {
  if (promptKey === "attackAlreadyResolving") {
    return "overlay.attackAlreadyResolving";
  }
  if (promptKey === "attackUnavailable") {
    return "overlay.attackUnavailable";
  }
  return undefined;
}
