import { CardArt } from "../overlay/CardArt";
import { useTranslation } from "../../i18n";
import type { PermanentTransformation } from "../transformation";

/**
 * The overlay a transformed position wears — the paper-play habit of laying a token card over
 * the Digimon an effect turned into something else. The real card stays visible underneath and
 * unrotated, because nothing about it left the field: only what it counts as changed.
 */
export function PermanentTransformToken({
  transformation,
  width,
  suspended,
}: {
  transformation: PermanentTransformation;
  width: number;
  suspended: boolean;
}) {
  const { t } = useTranslation();
  const tokenWidth = Math.round(width * 0.62);
  const color = transformation.colors[0];
  return (
    <span
      className="game-transform-token"
      data-color={color ?? undefined}
      data-suspended={suspended || undefined}
      role="img"
      aria-label={t("game.transformedInto", {
        name: transformation.name,
        dp: transformation.dp.toLocaleString(),
      })}
      style={{ ["--transform-token-width" as string]: `${tokenWidth}px` }}
    >
      {transformation.tokenArtCardId ? <CardArt cardId={transformation.tokenArtCardId} width={tokenWidth} /> : null}
      <em>{transformation.name}</em>
    </span>
  );
}
