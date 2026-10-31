import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import { BOOSTER_BOX_PACK_COUNT } from "@/packOpening/BoosterProgress";

type BoosterBoxCardParams = {
  setId: string;
  opened: number;
  seen: number;
  eligible: number;
};

type CapacityParams = {
  label: string;
  value: number;
  total: number;
};

function BoosterCapacity({ label, value, total }: CapacityParams) {
  const percent = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="booster-capacity">
      <div className="booster-capacity__label">
        <span>{label}</span>
        <span>
          <b>{value}</b> / {total}
        </span>
      </div>
      <div
        className="booster-capacity__bar"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={value}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function BoosterBoxCard({ setId, opened, seen, eligible }: BoosterBoxCardParams) {
  const { t } = useTranslation();
  return (
    <section className="booster-card" aria-labelledby="booster-box-title">
      <header className="booster-card__header">
        <h2 id="booster-box-title">{t("redesign.collection.booster.box.title")}</h2>
        <p>{t("redesign.collection.booster.box.description", { set: setId })}</p>
      </header>
      <div className="booster-card__content booster-box">
        <BoosterCapacity
          label={t("redesign.collection.booster.box.opened")}
          value={opened}
          total={BOOSTER_BOX_PACK_COUNT}
        />
        <BoosterCapacity label={t("redesign.collection.booster.box.seen")} value={seen} total={eligible} />
        <p className="booster-box__note">
          <Icons.CircleCheck size={16} aria-hidden="true" />
          <span>{t("redesign.collection.booster.box.note")}</span>
        </p>
      </div>
    </section>
  );
}
