import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import "./BT19-078.js";

describe("BT19-078 ADR-01 Jeri", () => {
  it("compiles DP scaling, restricted Main relocation, and optional inherited redirect", () => {
    const card = runtimeCompiledCard("BT19-078");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects.find((e) => e.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -1000,
      scaling: { unit: "digivolutionCardsOfFiltered" },
    });
    expect(card?.effects.find((e) => e.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      targetIsPermanent: true,
      underFilter: { excludeCardsNamed: ["ADR-01 Jeri"] },
    });
    expect(card?.effects.find((e) => e.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOpponentAttacks",
      sourceFilter: { controller: "opponent", kind: ["Digimon"] },
      actions: [
        { kind: "PlayWithoutCost", fromOwnDigivolutionStack: true },
        { kind: "RedirectAttack", optional: true },
      ],
    });
  });

  it("reduces one opposing Digimon by 1000 for each card under one Mother D-Reaper", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: ["EX2-046", "EX2-046"] }],
          hand: [{ card: "BT19-078", as: "jeri" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 6000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    // Use the public play intent so this observes the real On Play registration path.
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jeri").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("victim").currentDP === 4000);
    expect(s.perm("victim").currentDP).toBe(4000);
  });

  it("places itself under a Mother D-Reaper through the public Main activation intent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-007", as: "mother" },
            { card: "BT19-078", as: "jeri" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const entries = JSON.parse(s.perm("jeri").activatableEffectsJson ?? "[]") as { effectKey: string }[];
    const jeriPermanentId = s.perm("jeri").permanentId;
    expect(entries.length).toBeGreaterThan(0);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("jeri").topCard!.instanceId,
        effectKey: entries[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mother").stack.some((card) => card.instanceId === s.inst("jeri").instanceId));

    expect(s.perm("mother").stack.map((card) => card.cardId)).toEqual(["BT19-078"]);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === jeriPermanentId)).toBe(false);
  });

  it("does not trigger for its controller's forced attack during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-007", as: "mother", under: ["BT19-078"] },
            { card: "BT1-009", as: "ownAttacker" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("ownAttacker").permanentId,
    });

    expect(s.perm("mother").stack.map((card) => card.cardId)).toEqual(["BT19-078"]);
    expect(s.events.some((event) => event.kind === "cardPlayed" && event.cardId === "BT19-078")).toBe(false);
  });

  it("plays Jeri from Mother D-Reaper and redirects a public opponent attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: ["BT19-078"] }],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).subscriptions("whenOpponentAttacks", s.perm("mother").permanentId)).toHaveLength(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const playedJeri = s.events.find((event) => event.kind === "cardPlayed" && event.cardId === "BT19-078");
      if (playedJeri?.kind !== "cardPlayed") return false;
      return s.events.some(
        (event) =>
          event.kind === "attackDeclared" &&
          event.target.kind === "permanent" &&
          event.target.permanentId === playedJeri.permanentId,
      );
    });

    const playedJeri = s.events.find((event) => event.kind === "cardPlayed" && event.cardId === "BT19-078");
    expect(playedJeri?.kind).toBe("cardPlayed");
    if (playedJeri?.kind !== "cardPlayed") throw new Error("BT19-078 was not played from Mother D-Reaper");
    expect(s.events).toContainEqual(
      expect.objectContaining({
        kind: "attackDeclared",
        target: { kind: "permanent", permanentId: playedJeri!.permanentId },
      }),
    );
  });
});
