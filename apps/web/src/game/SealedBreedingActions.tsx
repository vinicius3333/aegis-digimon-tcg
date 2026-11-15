import type { GameState } from "@aegis/shared/schema/GameState";
import type { PlayerState } from "@aegis/shared/schema/PlayerState";
import { CardKind } from "@aegis/shared/schema/enums";
import { getCardDefinition } from "@aegis/shared/cards/registry";
import { GameRulesPolicy } from "@aegis/shared/sealed/GameRulesPolicy";
import { sendIntent, type AegisRoom } from "@/net/client";
import { Button } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import { useTranslatedCardName } from "@/i18n/useTranslatedCardName";

type Props = { state: GameState; player: PlayerState; room: AegisRoom | undefined; enabled: boolean };

export function SealedBreedingActions({ state, player, room, enabled }: Props) {
  const { t } = useTranslation();
  const name = useTranslatedCardName();
  if (state.rulesPolicy !== GameRulesPolicy.SEALED.value || !enabled || player.breeding || !room) {
    return null;
  }
  return (
    <div
      className="sealed-breeding-actions"
      style={{
        position: "relative",
        zIndex: 21,
        display: "flex",
        flexDirection: "column",
        alignSelf: "center",
        gap: 4,
        width: "18rem",
        maxWidth: "calc(100vw - 2rem)",
        flexShrink: 0,
      }}
    >
      {player.hand
        .filter((card) => {
          const definition = getCardDefinition(card.cardId);
          return definition?.level === 3 && definition.kinds.includes(CardKind.Digimon);
        })
        .map((card) => (
          <Button
            key={card.instanceId}
            onClick={() => sendIntent(room, { type: "placeSealedRookie", instanceId: card.instanceId })}
          >
            {t("sealed.placeRookie")} · {name(card.cardId)}
          </Button>
        ))}
    </div>
  );
}
