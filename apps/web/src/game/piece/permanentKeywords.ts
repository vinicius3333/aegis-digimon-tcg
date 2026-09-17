import type { Permanent } from "@aegis/shared";
import { formatResolvedKeyword } from "../keywordDisplay";

/**
 * The keyword pills a permanent shows, server truth throughout
 * (`Permanent.keywords`/`Permanent.grantedKeywords`): the resolved list already
 * folds in whatever ＜Security Attack＞ modifier applies, so it is never read off
 * the printed art.
 */
export function resolvePermanentKeywords({
  perm,
  keywordLabels,
}: {
  perm: Pick<Permanent, "grantedKeywords" | "securityAttackModifier" | "keywords">;
  keywordLabels?: Readonly<Record<string, string>>;
}): string[] {
  const badgeKeywords = new Set(perm.grantedKeywords);
  if (perm.securityAttackModifier !== 0 && perm.keywords.includes("SecurityAttack"))
    badgeKeywords.add("SecurityAttack");
  return [...badgeKeywords].map((keyword) =>
    // Only a permanent that actually carries a modifier prints one: a plainly GRANTED
    // ＜Security Attack＞ has no arithmetic to show, and "+0" reads as a nullified keyword.
    formatResolvedKeyword(
      keyword,
      perm.securityAttackModifier === 0 ? undefined : perm.securityAttackModifier,
      keywordLabels?.[keyword],
    ),
  );
}
