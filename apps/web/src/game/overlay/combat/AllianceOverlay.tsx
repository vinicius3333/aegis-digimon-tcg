import { useRef, useState } from "react";
import { Button } from "../../../design/primitives";
import { useTranslation } from "../../../i18n";
import { CardArt } from "../CardArt";
import { printedCardName } from "../printedCardName";
import { CardPromptFrame } from "./CardPromptFrame";

/** Select the server-offered ally in the same central gallery as other card choices. */
export function AllianceOverlay({
  attackerCardId,
  allies,
  onChoose,
  onPass,
}: {
  attackerCardId?: string;
  allies: readonly { permanentId: string; cardId: string; currentDP: number }[];
  onChoose: (permanentId: string) => void;
  onPass: () => void;
}) {
  const { t } = useTranslation();
  const submitted = useRef(false);
  const [pending, setPending] = useState(false);
  function answer(permanentId?: string) {
    if (submitted.current) return;
    submitted.current = true;
    setPending(true);
    if (permanentId === undefined) onPass();
    else onChoose(permanentId);
  }
  return (
    <CardPromptFrame
      cardId={attackerCardId}
      surface={allies.length ? "center" : "left"}
      label={t("overlay.allianceWindow")}
      eyebrow="＜Alliance＞"
      title={t(allies.length ? "overlay.allianceChooseCard" : "overlay.passAlliance")}
      description={t(allies.length ? "overlay.alliancePrompt" : "overlay.noAllies")}
    >
      <div className="counter-overlay__gallery block-overlay__gallery">
        {allies.map((ally, index) => (
          <button
            type="button"
            className="counter-overlay__card"
            key={ally.permanentId}
            aria-label={`${printedCardName(ally.cardId)}, ${ally.currentDP.toLocaleString()} DP, ${t("overlay.cardCopy", { index: index + 1, total: allies.length })}`}
            disabled={pending}
            onClick={() => answer(ally.permanentId)}
          >
            <CardArt cardId={ally.cardId} width={112} />
            <strong>{printedCardName(ally.cardId)}</strong>
            <span className="block-overlay__dp">+{ally.currentDP.toLocaleString()} DP</span>
            <span className="counter-overlay__card-id">
              {index + 1} / {allies.length}
            </span>
          </button>
        ))}
      </div>
      <Button full variant="secondary" disabled={pending} onClick={() => answer()}>
        {t("overlay.passAlliance")}
      </Button>
    </CardPromptFrame>
  );
}
