/* What each field badge means, shown in the badge's tooltip. */

import type { FieldStatus } from "./arenaData";

export interface BadgeDetail {
  title: string;
  description: string;
}

const STATUS_DETAILS: Record<FieldStatus, BadgeDetail> = {
  protected: { title: "Protected", description: "Immune to the opponent's Digimon effects." },
  mustAttack: { title: "Must attack", description: "Attacks at the start of the main phase." },
  cannotAttack: { title: "Can't attack", description: "An effect stops this Digimon from attacking." },
};

/* Reminder text from the rules glossary (data/kb/rules/glossary.md). */
const KEYWORD_REMINDERS: [RegExp, (match: RegExpExecArray) => string][] = [
  [
    /^Blocker$/,
    () =>
      "When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.",
  ],
  [/^Security Attack \+(\d+)$/, (match) => `This Digimon checks ${match[1]} additional security card(s).`],
  [/^Security Attack -(\d+)$/, (match) => `This Digimon checks ${match[1]} fewer security card(s).`],
  [
    /^Recovery \+(\d+) \(Deck\)$/,
    (match) => `Place the top ${match[1]} card(s) of your deck on top of your security stack.`,
  ],
  [
    /^Piercing$/,
    () =>
      "When this Digimon attacks and deletes an opponent's Digimon and survives the battle, it performs any security checks it normally would.",
  ],
  [/^Draw (\d+)$/, (match) => `Draw ${match[1]} card(s) from your deck.`],
  [/^Jamming$/, () => "This Digimon can't be deleted in battles against Security Digimon."],
  [/^Reboot$/, () => "Unsuspend this Digimon during your opponent's unsuspend phase."],
  [
    /^De-Digivolve (\d+)$/,
    (match) =>
      `Trash up to ${match[1]} card(s) from the top of one of your opponent's Digimon. If it has no digivolution cards, or becomes a level 3 Digimon, you can't trash any more cards.`,
  ],
  [/^Retaliation$/, () => "When this Digimon is deleted after losing a battle, delete the Digimon it was battling."],
  [/^Rush$/, () => "This Digimon can attack the turn it comes into play."],
  [/^Blitz$/, () => "This Digimon can attack when your opponent has 1 or more memory."],
  [
    /^Decoy \((.+)\)$/,
    (match) =>
      `When one of your other ${match[1]} Digimon would be deleted by an opponent's effect, you may delete this Digimon to prevent that deletion.`,
  ],
  [
    /^Armor Purge$/,
    () => "When this Digimon would be deleted, you may trash the top card of this Digimon to prevent that deletion.",
  ],
  [/^Engage$/, () => "At the end of your turn, this Digimon may attack."],
];

function keywordReminder(keyword: string): string {
  for (const [pattern, describe] of KEYWORD_REMINDERS) {
    const match = pattern.exec(keyword);
    if (match) return describe(match);
  }
  return "Printed on this card. See its effect text for details.";
}

export const badgeDetails = {
  status: (status: FieldStatus): BadgeDetail => STATUS_DETAILS[status],
  stack: (sources: number): BadgeDetail => ({
    title: "Digivolution stack",
    description: `${sources} digivolution card${sources === 1 ? "" : "s"} under this Digimon.`,
  }),
  keyword: (keyword: string): BadgeDetail => ({ title: `<${keyword}>`, description: keywordReminder(keyword) }),
  dp: (baseDp: number, delta: number): BadgeDetail => ({
    title: `${baseDp + delta} DP`,
    description: `Printed ${baseDp} DP ${delta > 0 ? "+" : "−"} ${Math.abs(delta)} from effects.`,
  }),
};
