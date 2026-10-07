import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { BoardPromptRail, type BoardPromptVariant } from "../../BoardDecisionRail";
import { CardArt } from "../CardArt";
import { CardPromptFrame } from "./CardPromptFrame";
import { cardDisplayName } from "../../cardLinks";
import { useBoardPreview } from "../choice/useBoardPreview";
import { DecisionViewBoardButton } from "../choice/DecisionViewBoardButton";

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
 * The viewer picks a counter source directly in the hand or on the field; the left rail
 * only asks and confirms. Blast hosts are chosen in a card gallery, since same-name hosts
 * differ only by their art. Every submitted route is one the server offered.
 */
export function CounterOverlay({
  eligibleCounters,
  getCardId,
  fieldPermanentOf = () => undefined,
  selectedInstanceId,
  onSelectInstance,
  handInstanceIds,
  onActivate,
  onPass,
}: {
  eligibleCounters: CounterChoice[];
  getCardId: (instanceId: string) => string | undefined;
  fieldPermanentOf?: (instanceId: string) => string | undefined;
  selectedInstanceId?: string;
  selectedTargetPermanentId?: string;
  onSelectInstance: (instanceId?: string) => void;
  handInstanceIds: readonly string[];
  onActivate: (instanceId: string, effectKey: string) => void;
  onPass: () => void;
}) {
  const { t } = useTranslation();
  const { isViewingBoard, openBoard, boardReturn } = useBoardPreview();
  if (isViewingBoard) return boardReturn;
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

  const inlineChoices = choices;
  // Identical hand partners offer the same action. Keep one server-provided route
  // per card while preserving distinct hosts, field sources and DNA ingredient order.
  const uniqueChoices = new Map<string, CounterChoice>();
  for (const choice of inlineChoices) {
    const target = counterTargetIds(choice.effectKey);
    const partnerCardId = target?.handInstanceId ? getCardId(target.handInstanceId) : undefined;
    const route = partnerCardId
      ? JSON.parse(choice.effectKey.slice("blast-dna-digivolve:".length)).map((id: unknown, index: number) =>
          index === 2 ? partnerCardId : id,
        )
      : choice.effectKey;
    const key = JSON.stringify([choice.instanceId, route]);
    if (!uniqueChoices.has(key)) uniqueChoices.set(key, choice);
  }
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
    if (choice.effectKey.startsWith("blast-dna-digivolve:")) return "Blast DNA";
    if (choice.effectKey.startsWith("blast-digivolve:")) return "Blast Digivolve";
    return `${cardDisplayName(getCardId(choice.instanceId) ?? "", t)} · ${choice.description}`;
  };
  if (selectedBlast) {
    const offered = [...uniqueChoices.values()];
    return (
      <CardPromptFrame
        cardId={sourceCardId}
        label={t("overlay.counterTiming")}
        eyebrow={blastLabel}
        title={t("overlay.counterChooseField")}
        description={t("overlay.counterPrompt")}
        onBack={selectedInstanceId ? () => onSelectInstance(undefined) : undefined}
      >
        <div className="counter-overlay__gallery block-overlay__gallery">
          {offered.map((choice, index) => {
            const target = counterTargetIds(choice.effectKey);
            const cardId = target ? getCardId(target.permanentId) : getCardId(choice.instanceId);
            const partnerCardId = target?.handInstanceId ? getCardId(target.handInstanceId) : undefined;
            return (
              <button
                type="button"
                className="counter-overlay__card"
                key={`${choice.instanceId}-${choice.effectKey}`}
                onClick={() => onActivate(choice.instanceId, choice.effectKey)}
              >
                {cardId ? <CardArt cardId={cardId} width={112} /> : null}
                <strong>{cardDisplayName(cardId ?? "", t)}</strong>
                <span>{choiceLabel(choice)}</span>
                {partnerCardId ? <span>+ {cardDisplayName(partnerCardId, t)}</span> : null}
                <span className="counter-overlay__card-id">
                  {index + 1} / {offered.length}
                </span>
              </button>
            );
          })}
        </div>
        {selectedInstanceId ? (
          <Button full variant="ghost" onClick={() => onSelectInstance(undefined)}>
            {t("common.cancel")}
          </Button>
        ) : null}
        <Button full variant="secondary" onClick={onPass}>
          {t("overlay.passCounterShort")}
        </Button>
      </CardPromptFrame>
    );
  }
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
        [...uniqueChoices.values()].map((choice) => (
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
      <DecisionViewBoardButton onOpenBoard={openBoard} />
    </BoardPromptRail>
  );
}
