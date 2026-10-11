import { botPersonaForDeck } from "@aegis/shared/bot/personas/botPersonaForDeck";
import { BotPortrait } from "@/bot/personas/BotPortrait";
import type { DeckListing } from "@/game/decks";
import { useTranslation } from "@/i18n/useTranslation";

export function BotOpponentPreview({ deck }: { deck?: DeckListing }) {
  const { t } = useTranslation();
  const persona = botPersonaForDeck({ deckId: deck?.id, deck });
  return (
    <div className="lobby-bot-preview">
      <BotPortrait persona={persona} />
      <div className="lobby-bot-preview__copy">
        <strong>
          {persona.displayName} <span className="bot-identity-badge">{t("bot.identity.label")}</span>
        </strong>
        <span>{deck?.name ?? t("lobby.botDeckRandom")}</span>
        {deck ? (
          <small>{t("redesign.play.deckCounts", { main: deck.mainDeck.length, egg: deck.eggDeck.length })}</small>
        ) : null}
      </div>
    </div>
  );
}
