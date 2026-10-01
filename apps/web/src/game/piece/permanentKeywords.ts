import type { Permanent } from "@aegis/shared";
import { formatResolvedKeyword } from "../keywordDisplay";

/** A keyword pill: the server's keyword name and the text the pill prints. */
export interface PermanentKeywordEntry {
  keyword: string;
  label: string;
}

/**
 * The keyword pills a permanent shows, server truth throughout
 * (`Permanent.keywords`/`Permanent.grantedKeywords`): the resolved list already
 * folds in whatever ＜Security Attack＞ modifier applies, so it is never read off
 * the printed art.
 */
export function resolvePermanentKeywordEntries({
  perm,
  keywordLabels,
}: {
  perm: Pick<Permanent, "grantedKeywords" | "securityAttackModifier" | "keywords">;
  keywordLabels?: Readonly<Record<string, string>>;
}): PermanentKeywordEntry[] {
  const badgeKeywords = new Set(perm.grantedKeywords);
  if (perm.securityAttackModifier !== 0 && perm.keywords.includes("SecurityAttack"))
    badgeKeywords.add("SecurityAttack");
  return [...badgeKeywords].map((keyword) => ({
    keyword,
    // Only a permanent that actually carries a modifier prints one: a plainly GRANTED
    // ＜Security Attack＞ has no arithmetic to show, and "+0" reads as a nullified keyword.
    label: formatResolvedKeyword(
      keyword,
      perm.securityAttackModifier === 0 ? undefined : perm.securityAttackModifier,
      keywordLabels?.[keyword],
    ),
  }));
}

/** The pills' printed text alone. */
export function resolvePermanentKeywords(input: Parameters<typeof resolvePermanentKeywordEntries>[0]): string[] {
  return resolvePermanentKeywordEntries(input).map((entry) => entry.label);
}
