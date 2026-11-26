import { ReplayDecisionQuality } from "@aegis/shared/replays/analysis/ReplayDecisionQuality";
import { HelpTip } from "@/design/HelpTip";
import { useTranslation } from "@/i18n/useTranslation";
import { ReplayDecisionQualityGlyph } from "@/replays/analysis/ReplayDecisionQualityGlyph";

type Props = { quality: ReplayDecisionQuality };

export function ReplayDecisionQualityTip({ quality }: Props) {
  const { t } = useTranslation();
  const definition = Object.values(ReplayDecisionQuality).find((entry) => entry.value === quality)!;
  return (
    <HelpTip
      label={t(definition.label)}
      trigger={<ReplayDecisionQualityGlyph quality={quality} />}
      triggerClassName="replay-analysis__quality-tip"
    >
      <strong>{t(definition.label)}</strong>
      <p>
        {t(definition.help, {
          min: Math.round(definition.minLoss * 100),
          max: Number.isFinite(definition.maxLoss) ? Math.round(definition.maxLoss * 100) : 0,
        })}
      </p>
      <p className="replay-analysis__tip-note">{t("replayAnalysis.qualityNote")}</p>
    </HelpTip>
  );
}
