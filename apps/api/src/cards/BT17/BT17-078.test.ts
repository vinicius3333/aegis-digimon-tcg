import { describe, expect, it } from "vitest";
import { setupEngine, settle, drainMicrotasks } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-078.js";
import "./index.js";

// The re-opened block window Omnimon's own ＜Blocker＞ raises while an attack is still resolving:
// decline it so the flow the test is watching runs to completion.
async function declineOpenBlock(s: ReturnType<typeof setupEngine>) {
  const combat = (s.engine as unknown as { combat: { hasOpenBlockWindow: boolean } }).combat;
  await drainMicrotasks(500);
  if (!combat.hasOpenBlockWindow) return;
  expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
}

describe("BT17-078 Omnimon", () => {
  it("keeps Blast DNA Digivolve, Raid, and Blocker as separate keyword clauses", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDNADigivolve" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Raid" }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] });
  });

  it("during DNA Digivolve returns the chosen opponent Digimon and every same-level Digimon", () => {
    for (const effect of [compiled.effects?.[3], compiled.effects?.[4]]) {
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "SelectBind",
            condition: { kind: "isDnaDigivolving" },
            target: { bindAs: "dnaReturnLevel", upTo: true },
          },
          {
            kind: "Return",
            to: "deckBottom",
            condition: { kind: "isDnaDigivolving" },
            target: {
              count: "all",
              filter: { relativeTo: { attr: "level", op: "eq", selectionRef: "dnaReturnLevel" } },
            },
          },
          { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
        ],
      });
    }
  });

  it("keeps the post-return deletion independent of the DNA condition", () => {
    expect(compiled.effects?.[3]?.actions?.[2]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(compiled.effects?.[4]?.actions?.[2]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
  });

  // Q2851: the "Then, delete" step resolves even when the "if DNA Digivolving" branch does not,
  // so a hard-played (non-DNA) Omnimon still deletes 1 opponent Digimon and returns nothing.
  it("deletes one opposing Digimon after a natural non-DNA play and returns nothing", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT17-078", as: "omnimon" }] },
        1: {
          battleArea: [
            { card: "BT17-063", as: "firstTarget" },
            { card: "BT17-063", as: "survivor" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("firstTarget").instanceId));

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("firstTarget").instanceId]);
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.instanceId)).toEqual([s.inst("survivor").instanceId]);
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT17-078")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  // Headline route: [Hand] [Counter] ＜Blast DNA Digivolve ([WarGreymon] + [MetalGarurumon])＞.
  // A field WarGreymon plus a hand MetalGarurumon DNA digivolve into Omnimon during the opponent's
  // attack, at no memory cost, drawing one; the On Play / When Digivolving effect then fires under
  // the DNA condition (return the chosen level, delete a remaining target).
  it("Blast DNA Digivolves from a Counter window, draws one, and runs the DNA effect", async () => {
    // Bias the count:1 return-level bind onto a Lv.6 so the same-level sweep is deterministic.
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-025", as: "warGreymon" }],
          hand: [
            { card: "BT1-044", as: "metalGarurumon" },
            { card: "BT17-078", as: "omnimon" },
          ],
          deck: ["BT1-009", "BT1-012"],
          security: ["BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker" },
            { card: "BT1-043", as: "chosenLevel6" },
            { card: "BT1-043", as: "sameLevel6" },
            { card: "BT17-063", as: "remainingTarget" },
          ],
          security: ["BT1-009", "BT1-012"],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    preferInstanceIds.push(s.inst("chosenLevel6").instanceId);
    const drawId = s.state.players[0]!.deck[0]!.instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await declineOpenBlock(s);
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("omnimon").instanceId);
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT17-078"));
    await declineOpenBlock(s);
    await settle(() => !observe(s.engine).isAttacking());

    const omnimon = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT17-078")!;
    expect(omnimon.stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("warGreymon").instanceId, s.inst("metalGarurumon").instanceId]),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawId]);
    expect(s.state.memory).toBe(3);

    const bottomTwo = s.state.players[1]!.deck.slice(-2).map((card) => card.instanceId);
    expect(bottomTwo).toEqual(
      expect.arrayContaining([s.inst("chosenLevel6").instanceId, s.inst("sameLevel6").instanceId]),
    );
    expect(s.state.players[1]!.trash).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-043")).toBe(false);
  });

  // Waiving the memory cost never waives the recipe: a pair that is not WarGreymon + MetalGarurumon
  // cannot DNA digivolve into Omnimon.
  it("refuses DNA materials that miss the printed recipe", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-063", as: "wrongA" },
          { card: "BT17-063", as: "wrongB" },
        ],
        hand: [{ card: "BT17-078", as: "omnimon" }],
        deck: ["BT1-009"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("wrongA").permanentId, s.perm("wrongB").permanentId],
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT17-078"]);
  });

  // The printed recipe brackets [WarGreymon] and [MetalGarurumon] as EXACT names.
  // DNA_DIGIVOLUTION_REQUIREMENT_OVERRIDES["BT17-078"] (packages/shared/src/effects/data.ts) now
  // stores them as `namesExact`, matching the BT13-059 precedent in the same file, so a near-name
  // such as BlackWarGreymon is refused by matchingDnaDigivolveCost.
  it("rejects a near-name (BlackWarGreymon) that only substring-matches the recipe", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-112", as: "blackWarGreymon" },
          { card: "BT1-044", as: "metalGarurumon" },
        ],
        hand: [{ card: "BT17-078", as: "omnimon" }],
        deck: ["BT1-009"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blackWarGreymon").permanentId, s.perm("metalGarurumon").permanentId],
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  // ＜Blocker＞ (and ＜Raid＞) are conferred by the printed text. A seeded Omnimon blocks an incoming
  // player-directed attack, redirecting it onto Omnimon, whose 15000 DP deletes the 3000-DP attacker.
  it("blocks an attack with ＜Blocker＞ and survives, keeping ＜Raid＞ too", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
      1: {
        battleArea: [{ card: "BT17-078", as: "omnimon" }],
        security: ["BT1-009", "BT1-012"],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("omnimon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("omnimon"), "Raid")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("omnimon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT17-078")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });
});
