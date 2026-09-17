import type { DigiXrosRequirement } from "@aegis/shared";
import type { Translate } from "../../../i18n";

/** Human-readable label for one DigiXros material slot. */
export function digiXrosSlotLabel({
  material,
  t,
}: {
  material: DigiXrosRequirement["materials"][number];
  t: Translate;
}): string {
  if (material.desc) return material.desc;
  const parts: string[] = [];
  if (material.names?.length) parts.push(material.names.join("/"));
  if (material.traits?.length) parts.push(`[${material.traits.join("/")}]`);
  if (material.traitContains?.length)
    parts.push(t("overlay.xrosTraitContains", { traits: material.traitContains.join("/") }));
  if (material.colors?.length) parts.push(material.colors.join("/"));
  if (material.level !== undefined) parts.push(`Lv.${material.level}`);
  else if (material.levelMin !== undefined || material.levelMax !== undefined)
    parts.push(`Lv.${material.levelMin ?? "?"}–${material.levelMax ?? "?"}`);
  if (material.nameOrTrait?.length) parts.push(material.nameOrTrait.map((r) => r.tokens.join("/")).join(" or "));
  if (material.differentNames) parts.push(t("overlay.xrosDifferentNames"));
  return parts.length ? parts.join(" ") : t("overlay.xrosAnyCard");
}
