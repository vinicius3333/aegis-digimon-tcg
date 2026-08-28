import { describe, it, expect } from "vitest";
import { cite, markNotTestable } from "./_kb.js";
import "./not-testable.js";
import { setupEngine as setup, settle } from "../testkit/harness.js";
import "../../cards/index.js";

/**
 * Official Rule Manual chunks manual-0017..manual-0041 — the Attack sequence (E-G:
 * Attack Declaration through End of Attack, Activation-Type Effects, Pass), Turn End
 * Conditions, Digimon ACE / <Blast Digivolve> / <Blast DNA Digivolve> / <Overflow>,
 * Dual cards / Arts Digivolve, DigiXros, Assembly, DNA Digivolution, Burst Digivolve,
 * and App Fusion.
 *
 * See manual-01's file header for the shared framing: chapters 1-18 already carry
 * deep behavioral coverage of every one of these mechanics (ch11 attacking, ch13
 * security checks, ch14 battles, ch06 turn procedures, ch02/ch04/ch16b/ch16c ACE and
 * its keywords, ch04 Dual cards, ch07 DigiXros/Assembly, ch08 DNA/Burst/App Fusion).
 * The manual's numeric worked examples mostly reproduce the SAME rule chapters 1-18
 * already drove with a real card and a real number — cross-referenced below rather
 * than re-run. The one exception (DigiXros cost-reduction SCALING across a variable
 * material count) exercises an angle ch07's own DigiXros describe block states it
 * covers only for the fixed 2-material case.
 */

markNotTestable(
  "manual-0017",
  "The 5-step attack timing list (Declaration/Counter/Block/Confirm/End) and rules A-C for " +
    "confirming an attack (security stack >=1 vs. 0, attack vs. a Digimon) restate " +
    "comprehensive-0143/0144/0145/0146/0147, already tested at ch11-attacking.test.ts §11-1, " +
    "§11-2, §11-3, §11-4.",
);

markNotTestable(
  "manual-0018",
  "Confirmation rule C ('a battle occurs between the attacking Digimon and the target Digimon') " +
    "and the Battles DP-comparison rule (higher DP wins; a tie deletes both) restate " +
    "comprehensive-0148 (ch11 §11-5, already tested — a blocked attack redirects damage, doesn't " +
    "cancel it) and comprehensive-0155 (ch14 §14, already tested — DP comparison and the tie-" +
    "deletes-both case). The Security Checks rule intro restates comprehensive-0153, already " +
    "tested at ch13-security-checks.test.ts §13-1.",
);

markNotTestable(
  "manual-0019",
  "'If multiple security checks can be performed ..., the checks are performed 1 card at a " +
    "time' and 'even if a security stack is reduced to 0 cards, the winner/loser aren't decided " +
    "yet' restate comprehensive-0221 (ch16a §16-1..16-4-3, already tested: securityStrikeCount " +
    "sums multiple <Security A.> grants into a real per-check total) and comprehensive-0153/0154 " +
    "(ch13-security-checks.test.ts, already tested: the game is only won/lost on a successful " +
    "attack against 0 remaining security, not merely by reaching 0).",
);

markNotTestable(
  "manual-0020",
  "'If that card is placed in an area by an effect, it isn't placed in the trash' (a checked " +
    "security card that a [Security] effect relocates is exempt from the default trash " +
    "destination) restates the same conditional-destination rule already tested at " +
    "ch13-security-checks.test.ts §13-1-8-3-2 (comprehensive-0154).",
);

markNotTestable(
  "manual-0021",
  "The End of Attack step and the full attack-sequence flow diagram (repeating Declaration " +
    "through Security Checks) restate comprehensive-0149 (ch11 §11-6, already tested) and " +
    "comprehensive-0143..0148, already tested above/at ch11-attacking.test.ts.",
);

markNotTestable(
  "manual-0022",
  "Activation-Type effects ('can be declared and processed when there is no other processing') " +
    "restate comprehensive-0176, already tested at ch15-02-timing-and-resolution.test.ts §15-8-4. " +
    "'Pass' moving the memory counter to 3 on the opponent's side, and Turn End Conditions, " +
    "restate comprehensive-0109/0104, already tested at ch06-game-procedures.test.ts §6-5-1-2-3.." +
    "/§6-1-4 — including the PASS_TURN_MEMORY=3 constant this chunk's own number matches exactly.",
);

markNotTestable(
  "manual-0023",
  "'If the memory counter goes back to 0 or more at the end of the turn, the turn will continue " +
    "without switching' restates comprehensive-0104, already tested at ch06-game-procedures.test." +
    "ts §6-1-4. Digimon ACE (low play cost, <Blast Digivolve>/<Blast DNA Digivolve>, <Overflow>) " +
    "restates comprehensive-0049/0050 (ch02 §2-10/§2-11, already tested — isAce, overflowMemory) " +
    "and comprehensive-0088 (ch04 §4-18, already tested — Overflow moves the memory marker).",
);

markNotTestable(
  "manual-0024",
  "<Blast Digivolve> ('one of your Digimon in the battle area may digivolve into a Digimon ACE " +
    "card without paying the cost, once, during the opponent's counter timing') restates " +
    "comprehensive-0245, already tested and documented as an unimplemented DIVERGENCE at " +
    "ch16c-deletion-and-advanced-keywords.test.ts §16-26.",
);

markNotTestable(
  "manual-0025",
  "<Blast DNA Digivolve> (the DNA-digivolution analogue of <Blast Digivolve>, same counter-" +
    "timing/no-cost/once-per-timing shape) restates comprehensive-0250, already tested and " +
    "documented as an unimplemented DIVERGENCE at ch16c-deletion-and-advanced-keywords.test.ts " +
    "§16-31.",
);

markNotTestable(
  "manual-0026",
  "<Overflow>'s processing timing and ordering ('as soon as' a card with Overflow leaves the " +
    "field or is played from a digivolution stack, before any 'then' text on the SAME effect') " +
    "restates comprehensive-0088, already tested at ch04-basic-terminology.test.ts §4-18 " +
    "(including the simultaneous-Overflow turn-player-first ordering, 4-18-5).",
);

markNotTestable(
  "manual-0027",
  "'Overflow isn't processed when a card with Overflow is placed under a card' (a narrower " +
    "exemption than the general leaving-the-field trigger) restates comprehensive-0088, already " +
    "tested at ch04 §4-18. Dual cards ('included in both the Digimon card and Option card " +
    "categories'; 'don't have a play cost and can't be played') restate comprehensive-0072, " +
    "already tested — including its it.fails DIVERGENCE — at ch04-basic-terminology.test.ts §4-5.",
);

markNotTestable(
  "manual-0028",
  "Arts Digivolve ('instead of trashing after use, your cards may digivolve into this card " +
    "without paying the cost') restates comprehensive-0089, already tested at ch04-basic-" +
    "terminology.test.ts §4-19 — GameEngine.resolveArtsDigivolve offers the free digivolve " +
    "(via the cost-free `digivolveFromInstance` primitive) BEFORE the pending-trash step in " +
    "playCard.ts's Option branch, for every isDualCard card (a rule on the DUAL-card mechanic " +
    "itself, not a per-card parameter).",
);

markNotTestable(
  "manual-0029",
  "Dual card rules (referenceable as either a Digimon or Option card; no play cost; color-" +
    "requirement gating for Option use) restate comprehensive-0072..0074, already tested at ch04 " +
    "§4-5/§4-5-5/§4-5-6. Arts Digivolve restates comprehensive-0089/comprehensive-0050, already " +
    "tested at ch04-basic-terminology.test.ts §4-19 and ch02-card-information.test.ts §2-11.",
);

markNotTestable(
  "manual-0030",
  "The worked Arts Digivolve procedure ('use the [GeoGrey Sword] Option text ... Arts Digivolve " +
    "allows you to digivolve into one of your cards on the field without paying the cost instead " +
    "of trashing it') restates the SAME rule already tested end-to-end at comprehensive-0089 " +
    "(ch04 §4-19: playing BT25-043 as its Option side, applying its -8000 DP, then accepting the " +
    "Arts Digivolve prompt to digivolve a Lv.5 Yellow permanent into it instead of trashing it) " +
    "and comprehensive-0072 (ch04 §4-5) — there is no additional engine surface this worked " +
    "example reaches that those tests don't already exercise.",
);

describe("manual-0031/manual-0032/manual-0033 — DigiXros: cost reduction SCALES with material count", () => {
  it(
    "the manual's own worked example (4 [Starmons]/etc placed under Shoutmon X4, DigiXros -2 " +
      "each, total reduction -8) asserts a SCALING claim ('each placed card reduces the play " +
      "cost') that ch07-playing-a-card.test.ts's DigiXros coverage only drove at a fixed 2-" +
      "material count (comprehensive-0118); this test proves the SAME real card (BT10-061) " +
      "reduces its cost by exactly 1x its per-material amount when only 1 material is placed, " +
      "not the 2-material amount — i.e. the reduction really is per-card, not an all-or-nothing " +
      "flag",
    async () => {
      cite(
        "manual-0031",
        "'Each placed card reduces the play cost.' / 'Even if just 1 card is placed under a card " +
          "for a DigiXros, it is considered DigiXrosing.'",
      );
      cite(
        "manual-0032",
        "worked example: DigiXros -2 per card, 4 cards placed -> total reduction 8, printed cost " + "9 becomes 1",
      );
      cite("manual-0033", "cards placed for a DigiXros stack top-to-bottom in requirement order");

      // BT10-061 (SkullKnightmon: Mighty Axe Mode): printed "DigiXros -1: [SkullKnightmon] + " +
      // "[DeadlyAxemon]", playCost 4 — reused from ch07's own fixture set, but driven here with
      // exactly 1 material (ch07's comprehensive-0118 test only drives the 2-material case).
      const s = setup(
        {
          0: {
            hand: [
              { card: "BT10-061", as: "skullXros" },
              { card: "BT7-058", as: "material1" }, // a [SkullKnightmon] material
            ],
          },
        },
        { autoSelectCards: true },
      );
      const p0 = s.state.players[0]!;
      const skullXros = s.inst("skullXros");
      const material1 = s.inst("material1");
      s.state.memory = 3; // printed cost 4; only affordable if a 1-material (-1) reduction applied

      const result = s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: skullXros.instanceId,
        digiXros: { materialInstanceIds: [material1.instanceId] },
      } as never);
      expect(result).toEqual({ ok: true });

      await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT10-061"), 5000);
      // 4 (printed) - 1 (one material x -1 each) = 3, exactly what was paid — NOT the 2-material
      // reduction (-2, cost 2) ch07's own fixture always drives.
      expect(s.state.memory).toBe(0);
      const played = p0.battleArea.find((p) => p.topCard?.cardId === "BT10-061")!;
      expect(played.stack.length).toBe(1);
      expect(played.stack[0]!.instanceId).toBe(material1.instanceId);
    },
  );
});

for (const [id, sub] of [
  ["manual-0034", "Assembly: 'by placing the specified cards from the trash under it, reduce the play cost'"],
  ["manual-0035", "Assembly: worked example (Eyesmon: Scatter Mode x4, Assembly -3, all 4 must be placed)"],
  ["manual-0036", "Assembly rules cont'd: exact-count placement, stacking order; DNA Digivolve intro"],
] as const) {
  markNotTestable(
    id,
    `${sub}. Assembly has no engine subsystem at all — comprehensive-0119..0122 (the SAME rule, ` +
      "from the Comprehensive Rules' own angle) is already documented not-testable at " +
      "ch07-playing-a-card.test.ts with the exact finding this manual chunk would re-surface: " +
      "the compiled-IR schema has an `assemblyRequirement` field, but no card in the corpus " +
      "populates it and no module under apps/api/src/engine reads it, so there is no real card " +
      "to drive an Assembly play through GameEngine and observe (same root cause noted at " +
      "comprehensive-0042, ch02-card-information.test.ts).",
  );
}

markNotTestable(
  "manual-0037",
  "DNA Digivolve mechanics and its worked example (blue Lv.4 + green Lv.4 -> Paildramon, cost 0) " +
    "restate comprehensive-0127/0128, already tested at ch08-digivolution.test.ts §8-2/§8-2-2.",
);

markNotTestable(
  "manual-0038",
  "DNA Digivolve rules cont'd ('statuses aren't carried over'; 'a linked card is trashed before " +
    "placing as a digivolution card'; 'can't DNA digivolve by an effect unless it specifies DNA " +
    "digivolution') restate comprehensive-0129/0130, already tested at ch08-digivolution.test.ts " +
    "§8-2-2-1-7/§8-2-3-1. Burst Digivolve's intro restates comprehensive-0131, already tested at " +
    "§8-3.",
);

markNotTestable(
  "manual-0039",
  "Burst Digivolve's worked example (returning [Marcus Damon] to the hand to digivolve into " +
    "ShineGreymon: Burst Mode) and its rules (top stacked card trashed at end of the burst-" +
    "digivolved turn; 'can't burst digivolve unless the effect specifies it') restate " +
    "comprehensive-0131..0133, already tested with the same real card (BT13-020) at " +
    "ch08-digivolution.test.ts §8-3.",
);

markNotTestable(
  "manual-0040",
  "The Burst Digivolve declare/return/draw procedure restates comprehensive-0131..0133 (ch08 " +
    "§8-3, already tested). App Fusion's intro ('the Digimon and link card specified are fused " +
    "to digivolve that Digimon') restates comprehensive-0134, already tested at ch08-digivolution" +
    ".test.ts §8-4.",
);

markNotTestable(
  "manual-0041",
  "App Fusion's worked example (DoGatchmon fusing [Gatchmon]/[Navimon]/[Timemon] link " +
    "combinations) and its rules restate comprehensive-0134/0135, already tested with a real " +
    "compiled card at ch08-digivolution.test.ts §8-4/§8-4-2. Effect Rules' 'Effect Basics' " +
    "heading (which opens the next major section) has no body of its own in this chunk.",
);
