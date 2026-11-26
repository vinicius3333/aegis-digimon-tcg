import { deckFormatLabel } from "@/screens/deckFormatLabel";
import { useId } from "react";
import {
  createDeckFormat,
  deckFormatSettings,
  historicalDeckFormats,
  releaseDateForSet,
  formatBanlistDate,
  type DeckFormat,
  type DeckPool,
  type DeckRuleMode,
} from "@aegis/shared";
import { GameFormatSwitch } from "@/screens/GameFormatSwitch";
import { useTranslation } from "../i18n";
import { useMediaQuery } from "../design/useMediaQuery";
import "./deckFormatSelector.css";
import { BanlistTooltip } from "./BanlistTooltip";

export function DeckFormatSelector({
  value,
  onChange,
  disabled = false,
  showBanlist = true,
  showAlysion = true,
}: {
  value: DeckFormat;
  onChange: (format: DeckFormat) => void;
  disabled?: boolean;
  showBanlist?: boolean;
  showAlysion?: boolean;
}) {
  const { t } = useTranslation();
  const id = useId();
  const compact = useMediaQuery("(width < 600px)");
  const { set, rules } = deckFormatSettings(value);
  const date = releaseDateForSet(set);
  const alysion = set === "alysion";
  return (
    <div className="deck-format-selector" data-game={alysion ? "alysion" : "card-game"}>
      <div className="deck-format-selector__header">
        <h3>{t("deckFormat.title")}</h3>
        <span className="deck-format-selector__badge">{deckFormatLabel(value, t)}</span>
      </div>
      {showAlysion ? <GameFormatSwitch value={value} onChange={onChange} disabled={disabled} /> : null}
      <div className="deck-format-selector__fields">
        <div className="deck-format-selector__pool" hidden={alysion}>
          <label htmlFor={`${id}-pool`}>{t("deckFormat.pool")}</label>
          <select
            id={`${id}-pool`}
            value={set}
            disabled={disabled}
            onChange={(event) => onChange(createDeckFormat(event.target.value as DeckPool | "all", rules))}
            aria-describedby={`${id}-summary`}
          >
            <option value="all">{t(compact ? "deckFormat.allSetsShort" : "deckFormat.allSets")}</option>
            {historicalDeckFormats()
              .reverse()
              .map((product) => (
                <option key={product} value={product}>
                  {compact ? product : `${product} · ${releaseDateForSet(product)}`}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-rules`}>{t("deckFormat.label")}</label>
          <select
            id={`${id}-rules`}
            value={rules}
            disabled={disabled}
            onChange={(event) => onChange(createDeckFormat(set, event.target.value as DeckRuleMode))}
            aria-describedby={`${id}-summary`}
          >
            <option value="standard">{t("deckFormat.standard")}</option>
            <option value="pauper">{t(compact ? "deckFormat.pauperShort" : "deckFormat.pauper")}</option>
            <option value="unlimited">{t("lobby.unlimited")}</option>
          </select>
        </div>
      </div>
      <p id={`${id}-summary`}>
        <span className="deck-format-selector__pool-hint">
          {alysion
            ? t("deckFormat.alysionHint")
            : date
              ? t("deckFormat.poolHint", { set })
              : t("deckFormat.allSetsHint")}
        </span>{" "}
        {!showBanlist ? null : rules === "unlimited" ? (
          t("deckFormat.noBanlist")
        ) : (
          <BanlistTooltip
            key={value}
            format={value}
            label={t("deckFormat.banlistHint", {
              date: alysion ? formatBanlistDate(value) : (date ?? t("deckFormat.current")),
            })}
          />
        )}{" "}
        {rules === "pauper" ? t("deckFormat.rarityHint") : null}
      </p>
    </div>
  );
}
