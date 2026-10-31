import { Button } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import { BOOSTER_BOX_PACK_COUNT, type BoosterBox } from "@/packOpening/BoosterProgress";
import { BOOSTER_PACK_CARD_COUNT } from "@/packOpening/BoosterPackSlots";
import type { BoosterSet } from "@/packOpening/listBoosterSets";

type BoosterPackHeroParams = {
  boosterSet: BoosterSet;
  sets: readonly BoosterSet[];
  remaining: number;
  replacedBox: BoosterBox | undefined;
  onSelectSet: (setId: string) => void;
  onOpen?: () => void;
  onNewBox: () => void;
};

export function BoosterPackHero({
  boosterSet,
  sets,
  remaining,
  replacedBox,
  onSelectSet,
  onOpen,
  onNewBox,
}: BoosterPackHeroParams) {
  const { t } = useTranslation();
  return (
    <div className="booster-hero">
      <span className="booster-pack" aria-hidden="true">
        <img src={boosterSet.coverUrl} alt="" decoding="async" />
        <span className="booster-pack__foil" />
        <b className="booster-pack__label">{boosterSet.setId}</b>
      </span>
      <div className="booster-hero__info">
        <span className="booster-hero__eyebrow">{t("redesign.collection.booster.eyebrow")}</span>
        <h2>{t("redesign.collection.booster.title", { set: boosterSet.setId })}</h2>
        <div className="booster-facts">
          <span>
            <Icons.Cards size={14} aria-hidden="true" />
            {t("redesign.collection.booster.cardsPerPack", { count: BOOSTER_PACK_CARD_COUNT })}
          </span>
          <span>
            <Icons.Package size={14} aria-hidden="true" />
            {t("redesign.collection.booster.packsPerBox", { count: BOOSTER_BOX_PACK_COUNT })}
          </span>
        </div>
        <p className="booster-hero__count">
          <b>{remaining}</b>
          <span>{t("redesign.collection.booster.remaining", { total: BOOSTER_BOX_PACK_COUNT })}</span>
        </p>
        <div className="booster-hero__actions">
          {remaining > 0 && onOpen ? (
            <Button size="lg" icon={Icons.Package} onClick={onOpen}>
              {t("redesign.collection.booster.open")}
            </Button>
          ) : null}
          {remaining === 0 ? (
            <Button size="lg" icon={Icons.Plus} onClick={onNewBox}>
              {t("redesign.collection.booster.newBox")}
            </Button>
          ) : null}
          <label className="booster-hero__set">
            <span>{t("library.set")}</span>
            <select value={boosterSet.setId} onChange={(event) => onSelectSet(event.target.value)}>
              {sets.map((set) => (
                <option key={set.setId} value={set.setId}>
                  {set.setId}
                </option>
              ))}
            </select>
          </label>
        </div>
        {replacedBox ? (
          <p className="booster-hero__warning" role="note">
            <Icons.CircleAlert size={14} aria-hidden="true" />
            {t("redesign.collection.booster.replaceWarning", {
              set: boosterSet.setId,
              current: replacedBox.setId,
              opened: replacedBox.packs.length,
              total: BOOSTER_BOX_PACK_COUNT,
            })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
