import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { BoardPromptRail, type BoardPromptVariant } from "../../BoardDecisionRail";
import { cardDisplayName } from "../../cardLinks";

type CounterChoice = { instanceId: string; effectKey: string; description: string };

/** Wider than the rail's default, so the viewer's own counter card reads at a glance.
    The opponent's attacker is not shown: it is already on the board. */
const COUNTER_ART_WIDTH = 120;

/** Decode server-provided legal choices without deriving any card rules in the client. */
export function counterTargetIds(effectKey: string): { permanentId: string; handInstanceId?: string } | undefined {
  if (effectKey.startsWith("blast-digivolve:")) return { permanentId: effectKey.slice("blast-digivolve:".length) };
  if (effectKey.startsWith("blast-dna-digivolve:")) {
    try {
      const [permanentId, , handInstanceId] = JSON.parse(effectKey.slice("blast-dna-digivolve:".length));
      return { permanentId, handInstanceId };
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Where each legal counter comes from, as the viewer picks it: a card in the hand, or a
 * Digimon on the field (whose top, digivolution or linked card carries the [Counter]).
 */
export function counterSources({
  eligibleCounters,
  handInstanceIds,
  fieldPermanentOf,
}: {
  eligibleCounters: readonly CounterChoice[];
  handInstanceIds: readonly string[];
  fieldPermanentOf: (instanceId: string) => string | undefined;
}) {
  const sourceKeyOf = (instanceId: string) =>
    handInstanceIds.includes(instanceId) ? `hand:${instanceId}` : `field:${fieldPermanentOf(instanceId) ?? instanceId}`;
  const sourceKeys = [...new Set(eligibleCounters.map((choice) => sourceKeyOf(choice.instanceId)))];
  const fieldSourceByPermanent = new Map<string, string>();
  for (const choice of eligibleCounters) {
    const permanentId = handInstanceIds.includes(choice.instanceId) ? undefined : fieldPermanentOf(choice.instanceId);
    if (permanentId && !fieldSourceByPermanent.has(permanentId))
      fieldSourceByPermanent.set(permanentId, choice.instanceId);
  }
  return { sourceKeyOf, sourceKeys, fieldSourceByPermanent, mustPickSource: sourceKeys.length > 1 };
}

/**
 * The counter window on the same board rail as Block and Alliance. With one source it is a
 * yes/no question beside that card's art; with several, the viewer first picks the card in
 * the hand or on the field, then answers for it.
 */
export function CounterOverlay({
  eligibleCounters,
  getCardId,
  getPermanentCardId,
  fieldPermanentOf = () => undefined,
  selectedInstanceId,
  selectedTargetPermanentId,
  onSelectInstance,
  handInstanceIds,
  onActivate,
  onPass,
}: {
  eligibleCounters: CounterChoice[];
  getCardId: (instanceId: string) => string | undefined;
  getPermanentCardId: (permanentId: string) => string | undefined;
  fieldPermanentOf?: (instanceId: string) => string | undefined;
  selectedInstanceId?: string;
  selectedTargetPermanentId?: string;
  onSelectInstance: (instanceId?: string) => void;
  handInstanceIds: readonly string[];
  onActivate: (instanceId: string, effectKey: string) => void;
  onPass: () => void;
}) {
  const { t } = useTranslation();
  const { sourceKeyOf, sourceKeys, mustPickSource } = counterSources({
    eligibleCounters,
    handInstanceIds,
    fieldPermanentOf,
  });
  const onlySource = sourceKeys.length === 1 && sourceKeys[0]!.startsWith("field:") ? sourceKeys[0] : undefined;
  const selectedSource = selectedInstanceId ? sourceKeyOf(selectedInstanceId) : onlySource;
  const choices = selectedSource
    ? eligibleCounters.filter((choice) => sourceKeyOf(choice.instanceId) === selectedSource)
    : [];
  const selectedBlast = choices.some((choice) => counterTargetIds(choice.effectKey));
  const blastHostIds = new Set(choices.map((choice) => counterTargetIds(choice.effectKey)?.permanentId));
  // A lone host gets a rail button: tapping a small card on a phone board is unreliable.
  // Several hosts stay on the board, where identical names are told apart by position.
  const blastTargetPermanentId =
    selectedTargetPermanentId ?? (blastHostIds.size === 1 ? [...blastHostIds][0] : undefined);
  const inlineChoices = selectedBlast
    ? choices.filter((choice) => counterTargetIds(choice.effectKey)?.permanentId === blastTargetPermanentId)
    : choices;
  const blastLabel = choices.some((choice) => choice.effectKey.startsWith("blast-dna-digivolve:"))
    ? "Blast DNA Digivolve"
    : "Blast Digivolve";
  const loneChoice = !selectedBlast && inlineChoices.length === 1 ? inlineChoices[0] : undefined;
  const sourceCardId = selectedInstanceId
    ? getCardId(selectedInstanceId)
    : choices[0]
      ? getCardId(choices[0].instanceId)
      : undefined;
  const loneCardId = loneChoice ? getCardId(loneChoice.instanceId) : undefined;
  // With another source to pick, the confirm step backs out to that pick instead of passing.
  const cancelsToPick = mustPickSource && selectedInstanceId !== undefined && !selectedBlast;
  const pickingInHand = !selectedSource && sourceKeys.some((key) => key.startsWith("hand:"));
  const pickingOnField = !selectedSource && sourceKeys.some((key) => key.startsWith("field:"));
  const variant: BoardPromptVariant = pickingInHand
    ? "selection"
    : pickingOnField || selectedBlast
      ? "field-selection"
      : "prompt";
  const prompt = selectedBlast
    ? t("overlay.counterChooseField")
    : loneCardId
      ? t("overlay.counterActivatePrompt", { card: cardDisplayName(loneCardId, t) })
      : pickingInHand && pickingOnField
        ? t("overlay.counterChooseSource")
        : pickingInHand
          ? t("overlay.counterChooseHand")
          : pickingOnField
            ? t("overlay.counterChooseFieldSource")
            : t("overlay.counterPrompt");
  const choiceLabel = (choice: CounterChoice) => {
    const target = counterTargetIds(choice.effectKey);
    const partner = target?.handInstanceId ? getCardId(target.handInstanceId) : undefined;
    const name = cardDisplayName(
      (target ? getPermanentCardId(target.permanentId) : getCardId(choice.instanceId)) ?? "",
      t,
    );
    if (partner)
      return t("overlay.counterBlastOnto", {
        blast: blastLabel,
        card: `${name} + ${cardDisplayName(partner, t)} (${partner})`,
      });
    return target
      ? t("overlay.counterBlastOnto", { blast: blastLabel, card: name })
      : `${name} · ${choice.description}`;
  };
  return (
    <BoardPromptRail
      variant={variant}
      className="board-prompt--counter"
      label={t("overlay.counterTiming")}
      eyebrow={selectedBlast ? blastLabel : "[Counter]"}
      art={sourceCardId}
      artWidth={COUNTER_ART_WIDTH}
      prompt={prompt}
      onOpenDialog={selectedInstanceId ? () => onSelectInstance(undefined) : undefined}
    >
      {loneChoice ? (
        <Button
          className="board-prompt__use"
          full
          icon={Icons.Sparkles}
          onClick={() => onActivate(loneChoice.instanceId, loneChoice.effectKey)}
        >
          {t("overlay.activateCounter")}
        </Button>
      ) : (
        inlineChoices.map((choice) => (
          <Button
            key={`${choice.instanceId}-${choice.effectKey}`}
            full
            variant="secondary"
            onClick={() => onActivate(choice.instanceId, choice.effectKey)}
          >
            {choiceLabel(choice)}
          </Button>
        ))
      )}
      {cancelsToPick ? (
        <Button className="board-prompt__decline" full variant="secondary" onClick={() => onSelectInstance(undefined)}>
          {t("common.cancel")}
        </Button>
      ) : (
        <Button className="board-prompt__decline" full variant="secondary" onClick={onPass}>
          {t("overlay.passCounterShort")}
        </Button>
      )}
    </BoardPromptRail>
  );
}
