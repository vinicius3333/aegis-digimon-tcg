import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { CardArt } from "../CardArt";
import { printedCardName } from "../printedCardName";
import "./counterOverlay.css";

type CounterChoice = { instanceId: string; effectKey: string; description: string };

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

/** Counter selection stays on the real hand and field; only ambiguous effects need rail buttons. */
export function CounterOverlay({
  attackerCardId,
  eligibleCounters,
  getCardId,
  getPermanentCardId,
  selectedInstanceId,
  selectedTargetPermanentId,
  onSelectInstance,
  handInstanceIds,
  onActivate,
  onPass,
}: {
  attackerCardId?: string;
  eligibleCounters: CounterChoice[];
  getCardId: (instanceId: string) => string | undefined;
  getPermanentCardId: (permanentId: string) => string | undefined;
  selectedInstanceId?: string;
  selectedTargetPermanentId?: string;
  onSelectInstance: (instanceId?: string) => void;
  handInstanceIds: readonly string[];
  onActivate: (instanceId: string, effectKey: string) => void;
  onPass: () => void;
}) {
  const { t } = useTranslation();
  const choices = eligibleCounters.filter((choice) => choice.instanceId === selectedInstanceId);
  const inlineChoices = selectedInstanceId
    ? choices.filter(
        (choice) =>
          !counterTargetIds(choice.effectKey) ||
          counterTargetIds(choice.effectKey)?.permanentId === selectedTargetPermanentId,
      )
    : eligibleCounters.filter((choice) => !handInstanceIds.includes(choice.instanceId));
  const selectedCardId = selectedInstanceId ? getCardId(selectedInstanceId) : undefined;
  const sourceArtCardId = selectedCardId ?? attackerCardId;
  const selectedBlast = choices.some((choice) => counterTargetIds(choice.effectKey));
  const blastLabel = choices.some((choice) => choice.effectKey.startsWith("blast-dna-digivolve:"))
    ? "Blast DNA Digivolve"
    : "Blast Digivolve";
  return (
    <section
      className="combat-prompt counter-hand-rail"
      aria-label={t("overlay.counterTiming")}
      onKeyDown={(event) => {
        if (event.key === "Escape" && selectedInstanceId) {
          event.preventDefault();
          onSelectInstance(undefined);
        }
      }}
    >
      {sourceArtCardId ? <CardArt cardId={sourceArtCardId} width={40} /> : <Icons.Shield size={24} />}
      <div className="counter-hand-rail__instruction" aria-live="polite">
        <strong>
          {selectedBlast
            ? blastLabel
            : selectedCardId
              ? printedCardName(selectedCardId)
              : t("overlay.counterTiming")}
        </strong>
        <span>
          {t(
            selectedCardId
              ? selectedBlast
                ? "overlay.counterChooseField"
                : "overlay.counterPrompt"
              : handInstanceIds.some((id) => eligibleCounters.some((choice) => choice.instanceId === id))
                ? "overlay.counterChooseHand"
                : "overlay.counterPrompt",
          )}
        </span>
      </div>
      <div className="counter-hand-rail__actions">
        {inlineChoices.map((choice) => {
          const target = counterTargetIds(choice.effectKey);
          const partner = target?.handInstanceId ? getCardId(target.handInstanceId) : undefined;
          return (
            <button
              className="counter-overlay__back"
              key={`${choice.instanceId}-${choice.effectKey}`}
              onClick={() => onActivate(choice.instanceId, choice.effectKey)}
            >
              {target
                ? printedCardName(getPermanentCardId(target.permanentId) ?? "")
                : printedCardName(getCardId(choice.instanceId) ?? "")}
              {partner ? ` + ${printedCardName(partner)} (${partner})` : ` · ${choice.description}`}
            </button>
          );
        })}
        <Button className="counter-hand-rail__pass" variant="secondary" onClick={onPass}>
          {t("overlay.passCounterShort")}
        </Button>
      </div>
    </section>
  );
}
