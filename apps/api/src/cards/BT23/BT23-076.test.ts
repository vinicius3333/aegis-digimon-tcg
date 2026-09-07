import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-076.js";

/**
 * Blanc's `[Your Turn]` watcher only fires when Blanc itself suspends, and attacking is the
 * public intent that suspends an attacker — so every behavioral test below reaches the
 * watcher by attacking rather than by firing the sub-trigger directly.
 */
const attack = (s: ReturnType<typeof setupEngine>, alias: string, preyAlias = "prey") =>
  s.engine.applyIntent(0, {
    type: "attack",
    attackerPermanentId: s.perm(alias).permanentId,
    target: { kind: "permanent", permanentId: s.perm(preyAlias).permanentId },
  });

/** A suspended 1000 DP opponent Digimon: a legal attack target a 3000 DP attacker survives. */
const prey = { card: "BT1-009", as: "prey", dp: 1000, suspended: true } as const;
const secondPrey = { card: "BT1-010", as: "secondPrey", dp: 1000, suspended: true } as const;

describe("BT23-076 Sistermon Blanc", () => {
  it("matches every catalog field and declares complete coverage", () => {
    expect(getCardDefinition("BT23-076")).toMatchObject({
      cardId: "BT23-076",
      nameEn: "Sistermon Blanc",
      colors: ["White"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 3000,
      evoCosts: [],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Puppet", "CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("on play, adds the top security card to hand and then recovers 1 from the deck on top", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT23-076", as: "blanc" }],
        deck: [
          { card: "BT1-010", as: "deckTop" },
          { card: "BT1-011", as: "deckSecond" },
        ],
        security: [
          { card: "BT1-009", as: "oldTop" },
          { card: "BT1-012", as: "secondSecurity" },
        ],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const blancId = s.inst("blanc").instanceId;
    const oldTopId = s.inst("oldTop").instanceId;
    const deckTopId = s.inst("deckTop").instanceId;
    const secondSecurityId = s.inst("secondSecurity").instanceId;
    const deckSecondId = s.inst("deckSecond").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: blancId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === oldTopId));

    const me = s.state.players[0]!;
    expect(me.hand.map((card) => card.instanceId)).toEqual([oldTopId]);
    expect(me.security.map((card) => card.instanceId)).toEqual([deckTopId, secondSecurityId]);
    expect(me.security[0]!.faceUp).toBe(false);
    expect(me.deck.map((card) => card.instanceId)).toEqual([deckSecondId]);
    expect(me.battleArea.some((permanent) => permanent.topCard?.instanceId === blancId)).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("when Blanc suspends by attacking, another Digimon digivolves into a [Huckmon] card from hand for 1 less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-076", as: "blanc" },
            { card: "BT23-006", as: "base" },
          ],
          hand: [{ card: "BT13-013", as: "bao" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [prey] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const baoId = s.inst("bao").instanceId;
    const baseId = s.inst("base").instanceId;

    expect(attack(s, "blanc")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("base").topCard?.instanceId === baoId);

    expect(s.perm("blanc").isSuspended).toBe(true);
    expect(s.perm("base").topCard?.instanceId).toBe(baoId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    // BaoHuckmon's printed digivolution cost is 2; the reduction makes it 1.
    expect(s.state.memory).toBe(2);
    // BaoHuckmon left the hand and the digivolution bonus draw put one card back.
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("takes a [CS]-trait card from the trash on its printed route for 1 less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-076", as: "blanc" },
            { card: "BT23-006", as: "base" },
          ],
          trash: [{ card: "BT22-010", as: "meramon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [prey] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    const meramonId = s.inst("meramon").instanceId;

    expect(attack(s, "blanc")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("base").topCard?.instanceId === meramonId);

    // Meramon matches both its printed Red Lv.3 route (cost 3) and its alternate [CS] route
    // (cost 2), so the engine asks which requirement to use; index 0 is the printed one.
    const routeChoice = s.decisions.find(({ req }) => req.kind === "chooseOption");
    expect(routeChoice?.req.options?.choices).toEqual([
      "Printed digivolution requirement (cost 3)",
      "Alternate digivolution requirement (cost 2)",
    ]);
    expect(s.perm("base").topCard?.instanceId).toBe(meramonId);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("reduces the alternate [CS] route by 1 as well", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-076", as: "blanc" },
            { card: "BT23-006", as: "base" },
          ],
          trash: [{ card: "BT22-010", as: "meramon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [prey] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 5;
    await s.ready();
    const meramonId = s.inst("meramon").instanceId;

    expect(attack(s, "blanc")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("base").topCard?.instanceId === meramonId);

    expect(s.perm("base").topCard?.instanceId).toBe(meramonId);
    // The alternate route costs 2; the reduction makes it 1.
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("triggers again on a second suspension in the same turn — the clause has no once-per-turn cap", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-076", as: "blanc" },
            { card: "BT23-006", as: "firstBase" },
            { card: "BT1-009", as: "secondBase" },
          ],
          hand: [
            { card: "BT13-013", as: "firstBao" },
            { card: "BT20-013", as: "secondBao" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: { battleArea: [prey, secondPrey] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const firstBaoId = s.inst("firstBao").instanceId;

    expect(attack(s, "blanc")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("firstBase").topCard?.instanceId === firstBaoId);
    expect(s.perm("firstBase").topCard?.instanceId).toBe(firstBaoId);
    expect(s.state.memory).toBe(5);

    // Unsuspend through the Advance surface: nothing in the Main phase unsuspends an attacker,
    // and the clause under test is exactly "when this Digimon suspends" firing a second time.
    await advance(s.engine).verb.unsuspend([s.perm("blanc").permanentId]);
    expect(s.perm("blanc").isSuspended).toBe(false);

    expect(attack(s, "blanc", "secondPrey")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("secondBase").topCard?.cardId === "BT20-013");

    expect(s.perm("secondBase").topCard?.cardId).toBe("BT20-013");
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("takes a [Royal Knight]-trait card from hand for 1 less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-076", as: "blanc" },
            { card: "BT1-028", as: "base" },
          ],
          hand: [{ card: "BT23-054", as: "magnamon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [prey] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const magnamonId = s.inst("magnamon").instanceId;

    expect(attack(s, "blanc")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("base").topCard?.instanceId === magnamonId);

    expect(s.perm("base").topCard?.instanceId).toBe(magnamonId);
    // Magnamon's Blue Lv.3 route costs 4; the reduction makes it 3.
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("charges the full digivolution cost without Blanc's effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-006", as: "base" }],
        hand: [{ card: "BT13-013", as: "bao" }],
        deck: ["BT1-010", "BT1-011"],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const baoId = s.inst("bao").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: baoId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === baoId);

    expect(s.state.memory).toBe(1);
  });

  it("never offers a card that matches neither the name nor the two traits", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-076", as: "blanc" },
            { card: "BT23-006", as: "base" },
          ],
          hand: [{ card: "BT1-015", as: "greymon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [prey] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    const greymonId = s.inst("greymon").instanceId;

    expect(attack(s, "blanc")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // Greymon is a legal Red Lv.3 digivolution, so only the name/trait gate can stop it.
    expect(s.perm("base").topCard?.cardId).toBe("BT23-006");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([greymonId]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("declining the optional digivolution leaves the board and memory untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-076", as: "blanc" },
            { card: "BT23-006", as: "base" },
          ],
          hand: [{ card: "BT13-013", as: "bao" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [prey] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baoId = s.inst("bao").instanceId;

    expect(attack(s, "blanc")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("blanc").isSuspended).toBe(true);
    expect(s.perm("base").topCard?.cardId).toBe("BT23-006");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([baoId]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not react when a different Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-076", as: "blanc" },
            { card: "BT23-006", as: "base", dp: 3000 },
          ],
          hand: [{ card: "BT13-013", as: "bao" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [prey] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baoId = s.inst("bao").instanceId;

    expect(attack(s, "base")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.perm("blanc").isSuspended).toBe(false);
    expect(s.perm("base").topCard?.cardId).toBe("BT23-006");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([baoId]);
    expect(s.state.memory).toBe(5);
  });

  it("offers only other battle-area Digimon, never Blanc itself or the breeding Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-076", as: "blanc" },
            { card: "BT23-006", as: "firstBase" },
            { card: "BT1-009", as: "secondBase" },
          ],
          breeding: { card: "BT1-012", as: "inBreeding" },
          hand: [{ card: "BT13-013", as: "bao" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [prey] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const blancPermanentId = s.perm("blanc").permanentId;
    const breedingPermanentId = s.perm("inBreeding").permanentId;
    const firstBasePermanentId = s.perm("firstBase").permanentId;
    await s.ready();

    expect(attack(s, "blanc")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    const offered = s.decisions
      .filter(({ req }) => req.kind === "chooseTargets")
      .flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
    expect(offered).toContain(firstBasePermanentId);
    expect(offered).not.toContain(blancPermanentId);
    expect(offered).not.toContain(breedingPermanentId);
    // Blanc and the breeding Digimon are both untouched; only a battle-area peer digivolved.
    expect(s.perm("blanc").topCard?.cardId).toBe("BT23-076");
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT1-012");
  });

  it("stays silent on the opponent's turn when an opponent effect suspends Blanc", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-076", as: "blanc" },
            { card: "BT23-006", as: "base" },
          ],
          hand: [{ card: "BT13-013", as: "bao" }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          hand: [{ card: "P-131", as: "pteromon" }, "BT1-010"],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const baoId = s.inst("bao").instanceId;
    preferred.push(s.inst("blanc").instanceId);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    // P-131 Pteromon's [On Play] suspends 1 of the opponent's Digimon; `preferred` steers it
    // onto Blanc, which on the opponent's turn must not offer any digivolution.
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("pteromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("blanc").isSuspended);

    expect(s.perm("blanc").isSuspended).toBe(true);
    expect(s.perm("base").topCard?.cardId).toBe("BT23-006");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([baoId]);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
