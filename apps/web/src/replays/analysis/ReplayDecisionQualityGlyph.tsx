import { ReplayDecisionQuality } from "@aegis/shared/replays/analysis/ReplayDecisionQuality";

type Props = { quality: ReplayDecisionQuality };

export function ReplayDecisionQualityGlyph({ quality }: Props) {
  const definition = Object.values(ReplayDecisionQuality).find((entry) => entry.value === quality)!;
  return (
    <span className="replay-analysis__quality" data-quality={quality} aria-hidden="true">
      {definition.glyph}
    </span>
  );
}
