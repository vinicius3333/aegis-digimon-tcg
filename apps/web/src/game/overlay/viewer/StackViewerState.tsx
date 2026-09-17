import { formatResolvedKeyword } from "../../keywordDisplay";
import { type PendingFateBadge } from "../../pendingFate";
import { type PermanentDetail } from "../../permanentDetail";
import { useTranslation } from "../../../i18n";

export function StackViewerState({ detail, fate }: { detail: PermanentDetail; fate?: PendingFateBadge }) {
  const { t } = useTranslation();
  const granted = new Set(detail.grantedKeywords);
  return (
    <div className="stack-viewer-state">
      <p className="stack-viewer-state__dp">
        <strong>{detail.currentDP.toLocaleString()}</strong> {t("overlay.liveDp")}
        {detail.dpDelta === 0 ? null : (
          <em data-direction={detail.dpDelta > 0 ? "up" : "down"}>
            {detail.dpDelta > 0 ? "+" : "−"}
            {Math.abs(detail.dpDelta).toLocaleString()}
          </em>
        )}
      </p>
      {detail.dpDelta === 0 ? null : (
        <p className="stack-viewer-state__base">
          {t("overlay.baseDp")}: {detail.baseDP.toLocaleString()}
        </p>
      )}
      <ul className="stack-viewer-state__keywords" aria-label={t("overlay.keywords")}>
        {detail.keywords.length === 0 ? <li data-empty="true">{t("overlay.noKeywords")}</li> : null}
        {detail.keywords.map((keyword) => (
          <li key={keyword} data-granted={granted.has(keyword) || undefined}>
            {formatResolvedKeyword(keyword, detail.securityAttackModifier)}
          </li>
        ))}
      </ul>
      {detail.restrictions.length ? (
        <ul className="stack-viewer-state__restrictions" aria-label={t("overlay.restrictions")}>
          {detail.restrictions.map((restriction) => (
            <li key={restriction.kind}>{t(restriction.labelKey)}</li>
          ))}
        </ul>
      ) : null}
      {fate ? (
        <p className="stack-viewer-state__fate" data-tone={fate.tone}>
          <span aria-hidden="true">{fate.glyph}</span>
          {t(fate.labelKey)}
        </p>
      ) : null}
    </div>
  );
}
