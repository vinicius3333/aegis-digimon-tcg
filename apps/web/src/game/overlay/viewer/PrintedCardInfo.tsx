import { getCardDefinition } from "@aegis/shared";
import { useTranslation } from "../../../i18n";

/** Name plus the printed level, play cost and DP, styled like the action sheet header. */
export function PrintedCardInfo({ cardId }: { cardId: string }) {
  const { t } = useTranslation();
  const def = getCardDefinition(cardId);
  return (
    <>
      <strong>{def?.nameEn ?? cardId}</strong>
      <div className="card-action-sheet__stats">
        {def?.level ? <span>Lv.{def.level}</span> : null}
        <span>{def && def.playCost >= 0 ? t("game.costsMemory", { count: def.playCost }) : t("game.noCost")}</span>
        {def?.dp ? <span>{def.dp.toLocaleString()} DP</span> : null}
      </div>
    </>
  );
}
