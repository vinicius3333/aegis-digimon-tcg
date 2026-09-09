import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-028.js";

// BT19-028 Xiangpengmon — Blue, Lv.6, DP 13000, play 13, [Digivolve] Blue Lv.5: Cost 5.
//   ＜Security Attack +1＞
//   ＜Blocker＞
//   [When Digivolving] Unsuspend 1 of your Digimon. Then, by placing 1 of your other Digimon
//     with [Aqua]/[Sea Animal] in one of its traits as this Digimon's bottom digivolution
//     card, gain 3 memory.
//   [Rule] Trait: Has the [Aquatic] type. (Q3086)
//
// "in one of its traits" is a SUBSTRING gate, so [Aquatic] and [Aquabeast] both satisfy
// "[Aqua]", while [Sea Beast] does NOT satisfy "[Sea Animal]" (the tokens are compared
// whitespace-stripped, so "seabeast" never contains "seaanimal").
//
// Fixture cards (printed-text-free unless noted):
//   BT2-027 Zudomon    Blue Lv.5 [Sea Beast]  — legal evolution source AND the near-miss trait
//   BT1-033 Dolphmon   Blue Lv.4 [Sea Animal] — legal placement cost
//   BT9-027 Divermon   Blue Lv.5 [Aquabeast]  — legal placement cost via the "Aqua" substring
//   BT2-025 Ikkakumon  Blue Lv.4 [Sea Beast]  — near-miss placement candidate
//   BT1-030 Gomamon    Blue Lv.3 [Sea Beast]  — inert stack filler
//   BT1-009 Monodramon Red  Lv.3              — inert deck/security filler (not a Digi-Egg)

const filler = ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"];

describe("BT19-028 Xiangpengmon", () => {
  it("compiles the printed clauses to the expected IR shape", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.[0]).toMatchObject({ keywords: [{ keyword: "SecurityAttack", amount: 1 }] });
    expect(compiled.effects?.[1]).toMatchObject({ keywords: [{ keyword: "Blocker" }] });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        // The unsuspend is mandatory and comes FIRST; only the memory gain carries the
        // "by placing ..." cost, so declining it must not undo the unsuspend.
        { kind: "Unsuspend", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } },
        {
          kind: "GainMemory",
          amount: 3,
          optional: true,
          cost: {
            kind: "place",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "traitContains" }],
              },
            },
          },
        },
      ],
    });
  });

  it("carries ＜Security Attack +1＞, ＜Blocker＞ and [Aquatic] without leaking them to a peer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-028", as: "xiang" },
          { card: "BT2-027", as: "peer" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("xiang"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("xiang"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("xiang"), "Aquatic")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("peer"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("peer"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("peer"), "Aquatic")).toBe(false);
  });

  it("digivolves for real, unsuspends a Digimon and buys 3 memory with a [Sea Animal] Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // A realistic evolution stack: Zudomon already sits on its own Lv.3 source.
            { card: "BT2-027", as: "base", under: [{ card: "BT1-030", as: "gomamon" }] },
            { card: "BT2-025", as: "seaBeast", suspended: true },
            { card: "BT1-033", as: "dolphmon", suspended: true },
          ],
          hand: [
            { card: "BT19-028", as: "xiang" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...filler],
          security: ["BT1-009", "BT1-009"],
        },
        1: { deck: [...filler], security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    // Unsuspend the [Sea Beast] peer, then pay the placement with the [Sea Animal] one, so
    // the two clauses are proved on two different permanents.
    const dolphmonInstanceId = s.perm("dolphmon").topCard!.instanceId;
    preferInstanceIds.push(s.perm("seaBeast").topCard!.instanceId, dolphmonInstanceId);
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xiang").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 8);

    expect(s.perm("base").topCard?.cardId).toBe("BT19-028");
    // Placed as the BOTTOM digivolution card, beneath the card's own natural sources.
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-033", "BT1-030", "BT2-027"]);
    expect(s.perm("base").stack[0]!.instanceId).toBe(dolphmonInstanceId);
    expect(s.perm("seaBeast").isSuspended).toBe(false);
    // Memory: 10 - 5 (printed digivolution cost) + 3 (the clause) = 8.
    expect(s.state.memory).toBe(8);
    // The placed permanent is gone from the battle area; only base and the peer remain.
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-028", "BT2-025"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("accepts an [Aquabeast] or [Aquatic] Digimon through the 'Aqua' substring but never a [Sea Beast] one", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-027", as: "base" },
            // Near-miss: "seabeast" does not contain "seaanimal", and contains no "aqua".
            { card: "BT2-025", as: "seaBeast", suspended: true },
            // BT19-027 Ryugumon carries [Aquatic] — the "Aqua" substring hits (Q3082/Q3086).
            { card: "BT19-027", as: "aquatic" },
            { card: "BT9-027", as: "aquabeast" },
          ],
          hand: [
            { card: "BT19-028", as: "xiang" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...filler],
          security: ["BT1-009", "BT1-009"],
        },
        1: { deck: [...filler], security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    // Bias every decision towards the [Sea Beast] near-miss first; it must be refused for
    // the placement (it is still a legal unsuspend target, which the next assertion uses).
    preferInstanceIds.push(s.perm("seaBeast").topCard!.instanceId, s.perm("aquatic").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xiang").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 8);

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT19-027", "BT2-027"]);
    // The [Sea Beast] peer was unsuspended but never placed; the [Aquabeast] stayed in play.
    expect(s.perm("seaBeast").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-028", "BT2-025", "BT9-027"]);
    expect(s.state.memory).toBe(8);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("keeps the unsuspend and gains no memory when only [Sea Beast] Digimon are available", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-027", as: "base", under: [{ card: "BT1-030", as: "gomamon" }] },
            { card: "BT2-025", as: "seaBeast", suspended: true },
          ],
          hand: [
            { card: "BT19-028", as: "xiang" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...filler],
          security: ["BT1-009", "BT1-009"],
        },
        1: { deck: [...filler], security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xiang").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-028" && s.state.pendingDecision === undefined);

    expect(s.perm("seaBeast").isSuspended).toBe(false);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-030", "BT2-027"]);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-028", "BT2-025"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declining the placement keeps the preceding unsuspend and gains no memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-027", as: "base", under: [{ card: "BT1-030", as: "gomamon" }] },
            { card: "BT1-033", as: "dolphmon", suspended: true },
          ],
          hand: [
            { card: "BT19-028", as: "xiang" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...filler],
          security: ["BT1-009", "BT1-009"],
        },
        1: { deck: [...filler], security: ["BT1-009", "BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xiang").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-028" && s.state.pendingDecision === undefined);

    expect(s.perm("dolphmon").isSuspended).toBe(false);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-030", "BT2-027"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses an illegal digivolution source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-037", as: "blueLv4" },
          { card: "ST1-10", as: "redLv6" },
        ],
        hand: [{ card: "BT19-028", as: "xiang" }],
        deck: [...filler],
        security: ["BT1-009", "BT1-009"],
      },
      1: { deck: [...filler], security: ["BT1-009", "BT1-009"] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueLv4").permanentId,
        instanceId: s.inst("xiang").instanceId,
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redLv6").permanentId,
        instanceId: s.inst("xiang").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-028"]);
    expect(s.state.memory).toBe(10);
  });

  it("checks two security cards on a real player attack (＜Security Attack +1＞)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-028", as: "xiang" }],
        deck: [...filler],
        security: ["BT1-009", "BT1-009"],
      },
      1: {
        deck: [...filler],
        security: [
          { card: "BT1-009", as: "sec1" },
          { card: "BT1-010", as: "sec2" },
          { card: "BT1-012", as: "sec3" },
        ],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("xiang").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1);

    // 1 (base) + 1 (＜Security Attack +1＞) checks; both 13000-DP battles were won.
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("sec3").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("sec1").instanceId, s.inst("sec2").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-028"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("really blocks an opponent's player attack, while a peer without ＜Blocker＞ may not", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-028", as: "xiang" },
          { card: "BT2-027", as: "peer" },
        ],
        deck: [...filler],
        security: [
          { card: "BT1-009", as: "mySec1" },
          { card: "BT1-009", as: "mySec2" },
        ],
      },
      1: { battleArea: [{ card: "BT1-013", as: "attacker" }], deck: [...filler], security: ["BT1-009", "BT1-009"] },
    });
    // Chained hand-laid turn: the attack itself runs through the production combat flow.
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("peer").permanentId }).ok).toBe(
      false,
    );
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("xiang").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());

    // Security untouched; the 5000-DP attacker lost to the 13000-DP blocker.
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("mySec1").instanceId,
      s.inst("mySec2").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-028", "BT2-027"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
