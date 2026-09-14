import { getCardDefinition } from "@aegis/shared";

/** Printed standing effects only. Checked-card effects belong to the security check UI. */
export function securityCardEffects(cardId: string): { text: string; badge: string }[] {
  const text = getCardDefinition(cardId)?.effectText ?? "";
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => /^\[Security\]\s*\[(?:All Turns|Your Turn|Opponent's Turn)\]/.test(line))
    .map((line) => {
      const dp = line.match(/get[s]? ([+−-]\d+) DP/);
      const reduction = line.match(/reduce the digivolution cost by (\d+)/);
      const keyword = line.match(/gain[s]? [＜<]([^＞>]+)[＞>]/);
      return {
        text: line.replace(/^\[Security\]\s*/, ""),
        badge: dp ? `${dp[1]} DP` : reduction ? `Evo −${reduction[1]}` : keyword ? keyword[1]! : "Security",
      };
    });
}
