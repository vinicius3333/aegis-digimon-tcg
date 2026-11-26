import type { RuleSection } from "@/game/rulings/RulingsFiles";
import { loadCardRulings } from "@/game/rulings/loadCardRulings";
import { loadEffectOrderRules } from "@/game/rulings/loadEffectOrderRules";
import { useLoadedRulings } from "@/game/rulings/useLoadedRulings";
import { useEffectOrderEnabled } from "@/game/effectOrder/effectOrderEnabled/useEffectOrderEnabled";
import { useTranslation } from "@/i18n/useTranslation";
import "@/game/rulings/cardRulings.css";

type Props = {
  cardId?: string;
  showEffectOrder?: boolean;
};

export function CardRulings({ cardId, showEffectOrder = false }: Props) {
  const { t } = useTranslation();
  const enabled = useEffectOrderEnabled();
  const cardFile = useLoadedRulings({ load: loadCardRulings, key: enabled ? cardId : undefined });
  const effectOrderFile = useLoadedRulings({
    load: loadEffectOrderRules,
    key: enabled && showEffectOrder ? "effect-order" : undefined,
  });
  const rulings = cardId === undefined ? undefined : cardFile?.cards[cardId];
  const effectOrderSections = showEffectOrder ? (effectOrderFile?.effectOrderSections ?? []) : [];
  const cardSections = rulings?.sections ?? [];
  if (!enabled || (rulings === undefined && effectOrderSections.length === 0)) {
    return null;
  }
  const renderSection = (id: string) => {
    const section: RuleSection | undefined = cardFile?.sections[id] ?? effectOrderFile?.sections[id];
    return section === undefined ? null : (
      <li key={id} className="card-rulings__rule" data-rule-id={id}>
        <span className="card-rulings__reference">
          {section.sourceTitle} §{section.section} · {section.title}
        </span>
        <p>{section.text}</p>
      </li>
    );
  };
  return (
    <section className="card-rulings" aria-label={t("rulings.title")} data-testid="card-rulings" data-card-id={cardId}>
      <span className="card-rulings__label">{t("rulings.title")}</span>
      <span className="card-rulings__notice">{t("rulings.source")}</span>
      {rulings?.errata ? (
        <div className="card-rulings__group" data-role="errata">
          <span className="card-rulings__heading">
            {t("rulings.errata")}
            {rulings.errata.date ? ` · ${rulings.errata.date}` : ""}
          </span>
          {rulings.errata.changes.map((change, index) => (
            <dl key={index} className="card-rulings__change">
              {change.before ? (
                <>
                  <dt>{t("rulings.errataBefore")}</dt>
                  <dd>{change.before}</dd>
                </>
              ) : null}
              {change.after ? (
                <>
                  <dt>{t("rulings.errataAfter")}</dt>
                  <dd>{change.after}</dd>
                </>
              ) : null}
            </dl>
          ))}
          {rulings.errata.notes ? <p className="card-rulings__notes">{rulings.errata.notes}</p> : null}
        </div>
      ) : null}
      {rulings?.qa?.length ? (
        <details className="card-rulings__group" data-role="qa">
          <summary className="card-rulings__heading">{t("rulings.qa", { count: rulings.qa.length })}</summary>
          <ol className="card-rulings__questions">
            {rulings.qa.map((entry) => (
              <li key={entry.id} data-question-id={entry.id}>
                <span className="card-rulings__reference">
                  {(entry.ids ?? [entry.id]).join(" · ")}
                  {entry.date ? ` · ${entry.date}` : ""}
                </span>
                <p className="card-rulings__question">{entry.question}</p>
                <p>{entry.answer}</p>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
      {cardSections.length > 0 ? (
        <details className="card-rulings__group" data-role="rules">
          <summary className="card-rulings__heading">{t("rulings.rules", { count: cardSections.length })}</summary>
          <ol className="card-rulings__rules">{cardSections.map(renderSection)}</ol>
        </details>
      ) : null}
      {effectOrderSections.length > 0 ? (
        <details className="card-rulings__group" data-role="effect-order-rules">
          <summary className="card-rulings__heading">{t("rulings.effectOrderRules")}</summary>
          <ol className="card-rulings__rules">{effectOrderSections.map(renderSection)}</ol>
        </details>
      ) : null}
    </section>
  );
}
