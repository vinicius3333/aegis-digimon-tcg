import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import "./index.js";
import { compiled } from "./BT20-016.js";

describe("BT20-016 Paildramon", () => {
  it("gives one Digimon Piercing and +4000 before optionally attacking on both triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "GainKeyword",
            keyword: { keyword: "Piercing" },
            duration: "forTheTurn",
            target: { bindAs: "paildramonBoostTarget" },
          },
          {
            kind: "ModifyDP",
            amount: 4000,
            duration: "forTheTurn",
            target: { fromSelectionRef: "paildramonBoostTarget" },
          },
          { kind: "Attack", target: { filter: { isSelfRef: true }, isSelf: true }, optional: true },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Paildramon", "Dinobeemon"], match: "name" }] },
          actions: [
            {
              kind: "DnaDigivolve",
              materials: { count: 2 },
              into: { nameOrTrait: [{ tokens: ["Imperialdramon: Dragon Mode"], match: "name" }] },
              payCost: true,
              optional: true,
            },
          ],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([
      { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
    ]);
  });

  it("on play gives one bound ally Piercing and +4000 while allowing the Paildramon attack to be declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-010", dp: 1000, as: "ally" }],
          hand: [{ card: "BT20-016", as: "paildramon" }],
        },
        1: { security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("paildramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").currentDP === 5000);
    const paildramon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-016")!;
    expect(observe(s.engine).hasPierce(s.perm("ally"))).toBe(true);
    expect(s.perm("ally").currentDP).toBe(5000);
    expect(paildramon.isSuspended).toBe(false);
  });

  it("publicly evolves, buffs itself, Pierces in its optional attack, and expires both grants at turn end", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-011", as: "base" }],
          hand: [{ card: "BT20-016", as: "paildramon" }, "BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT20-010", dp: 5000, suspended: true, as: "target" }],
          security: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const targetId = s.perm("target").permanentId;
    preferred.push(s.perm("base").permanentId, targetId);
    s.state.memory = 4;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.perm("base").topCard.cardId).toBe("BT20-016");
    expect(s.perm("base").currentDP).toBe(14000);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.perm("base").currentDP).toBe(10000);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(false);
  });

  it("provides inherited Security Attack +1 from a realistic evolution stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-020", as: "host", under: ["BT20-016"] }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("proves inherited Security Attack +1 with an actual extra security check", async () => {
    for (const under of [true, false] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: "BT20-020", as: "host", ...(under ? { under: ["BT20-016"] } : {}) }],
          security: ["BT1-010"],
        },
        1: { security: ["BT1-010", "BT1-010", "BT1-010"] },
      });
      s.state.turnSeat = 0;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.filter((event) => event.kind === "securityChecked").length >= (under ? 2 : 1));
      expect(s.state.players[1]!.security).toHaveLength(under ? 1 : 2);
    }
  });

  it("replaces Paildramon's deletion by DNA digivolving it and Dinobeemon into Dragon Mode", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-016", as: "paildramon" },
            { card: "BT20-074", as: "dinobeemon" },
          ],
          hand: [{ card: "BT20-076", as: "dragonMode" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const paildramonId = s.perm("paildramon").permanentId;
    const dinobeemonId = s.perm("dinobeemon").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([paildramonId], "byEffect")).toBe(0);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-076"));

    const dragonMode = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-076")!;
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === paildramonId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === dinobeemonId)).toBe(false);
    expect(dragonMode.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT20-016", "BT20-074"]));
  });

  it("publicly replaces a battle deletion with DNA and consumes exactly the two field materials", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-016", dp: 8000, suspended: true, as: "paildramon", under: ["BT20-010", "BT20-011"] },
            { card: "BT20-074", as: "dinobeemon", under: ["BT20-072"] },
          ],
          hand: [{ card: "BT20-076", as: "dragonMode" }],
          deck: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT20-012", dp: 10000, as: "attacker" }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 4;
    const paildramonId = s.perm("paildramon").permanentId;
    const dinobeemonId = s.perm("dinobeemon").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: paildramonId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-076"));
    const dragonMode = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-076")!;
    expect(dragonMode.permanentId).not.toBe(paildramonId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === paildramonId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === dinobeemonId)).toBe(false);
    expect(dragonMode.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT20-016", "BT20-074"]));
    expect(s.state.memory).toBe(4); // The printed Purple Lv.5 + Red Lv.5 DNA cost is 0; Overflow (-4) is inactive.
  });

  it("lets the owner refuse the replacement when legal materials exist, so the battled Paildramon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-016", dp: 8000, suspended: true, as: "paildramon" },
            { card: "BT20-074", as: "dinobeemon" },
          ],
          hand: [{ card: "BT20-076", as: "dragonMode" }],
        },
        1: { battleArea: [{ card: "BT20-012", dp: 10000, as: "attacker" }], security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("paildramon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-016"));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-016")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("dragonMode").instanceId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-074")).toBe(true);
  });

  it("does not replace the battle deletion when the hand result is a wrong name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-016", dp: 8000, suspended: true, as: "paildramon" },
            { card: "BT20-074", as: "dinobeemon" },
          ],
          hand: [{ card: "BT20-045", as: "wrongResult" }],
        },
        1: { battleArea: [{ card: "BT20-012", dp: 10000, as: "attacker" }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("paildramon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-016"));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-016")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("wrongResult").instanceId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-074")).toBe(true);
  });
});
