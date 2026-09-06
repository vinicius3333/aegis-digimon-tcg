import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-076.js";
import "../index.js";
describe("BT21-076 WarGrowlmon", () => {
  it("mills two, grants keywords, and offers once-per-turn evolution", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenAttacking",
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "Digivolve",
            payCost: true,
            reduceCostScaling: { per: 10, unit: "cards", filter: { zone: "trash", controller: "any" } },
          }),
        ],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        isInherited: true,
        actions: [
          expect.objectContaining({
            kind: "SecurityManipulation",
            op: "trashTop",
            controller: "opponent",
            amount: 1,
          }),
        ],
      }),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("trashes two cards and gains Raid and Retaliation on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT21-076", as: "wargrowlmon" }], deck: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wargrowlmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 2);

    expect(s.state.players[0]!.trash).toHaveLength(2);
    const wargrowlmon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT21-076");
    expect(wargrowlmon).toBeDefined();
    expect(wargrowlmon?.topCard.cardId).toBe("BT21-076");
    expect(observe(s.engine).hasKeyword(wargrowlmon!, "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(wargrowlmon!, "Retaliation")).toBe(true);
  });

  it.each([
    [0, 5],
    [9, 5],
    [10, 4],
    [20, 3],
  ])("attack evolution with %i total trash cards costs %i", async (trashCount, expectedCost) => {
    const trashPool = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"];
    const trash = Array.from({ length: trashCount }, (_, index) => ({
      card: trashPool[Math.floor(index / 4)]!,
      as: `trash${index}`,
    }));
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-076", as: "wargrowlmon" }],
          hand: [{ card: "BT21-079", as: "megidramon" }],
          trash,
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("wargrowlmon"));
    await settle(() => s.perm("wargrowlmon").topCard.instanceId === s.inst("megidramon").instanceId);

    expect(s.state.memory).toBe(6 - expectedCost);
  });

  it("uses the public attack intent for the once-per-turn Megidramon evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-076", as: "wargrowlmon" }],
          hand: [{ card: "BT21-079", as: "megidramon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("wargrowlmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("wargrowlmon").topCard.instanceId === s.inst("megidramon").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("leaves the top card unchanged when a public attack has no eligible evolution target", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-076", as: "wargrowlmon" }] },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("wargrowlmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.perm("wargrowlmon").topCard.cardId).toBe("BT21-076");
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("uses the attack evolution only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-076", as: "wargrowlmon" }],
          hand: [
            { card: "BT21-079", as: "first" },
            { card: "BT5-081", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("wargrowlmon"));
    await settle(() => s.perm("wargrowlmon").topCard.instanceId === s.inst("first").instanceId);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("wargrowlmon"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("second").instanceId)).toBe(true);
  });

  it("keeps WarGrowlmon on top across two public attacks after Cyclonic Kick unsuspends it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-064", as: "guilmon" },
            { card: "BT1-089", as: "mimi" },
          ],
          hand: [
            { card: "BT21-068", as: "growlmon" },
            { card: "BT21-076", as: "wargrowlmon" },
            { card: "BT21-079", as: "megidramon" },
            { card: "BT4-108", as: "cyclonic" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
        1: { security: ["BT1-005", "BT1-006", "BT1-007"], deck: ["BT1-008"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("guilmon").permanentId,
        instanceId: s.inst("growlmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("guilmon").topCard.instanceId === s.inst("growlmon").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("guilmon").permanentId,
        instanceId: s.inst("wargrowlmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("guilmon").topCard.instanceId === s.inst("wargrowlmon").instanceId);
    expect(s.perm("guilmon").stack.map((card) => card.cardId)).toEqual(["BT21-064", "BT21-068"]);
    expect(s.state.memory).toBe(5);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("guilmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 2);
    expect(s.perm("guilmon").isSuspended).toBe(true);
    expect(s.perm("guilmon").topCard.instanceId).toBe(s.inst("wargrowlmon").instanceId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("megidramon").instanceId)).toBe(true);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyclonic").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("guilmon").isSuspended);
    expect(s.state.memory).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("guilmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1);
    expect(s.perm("guilmon").topCard.instanceId).toBe(s.inst("wargrowlmon").instanceId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("megidramon").instanceId)).toBe(true);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
  });

  it("inherited deletion trashes the opponent's top security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-079", as: "host", under: [{ card: "BT21-076", as: "source" }] }] },
      1: {
        security: [
          { card: "BT1-009", as: "top" },
          { card: "BT1-010", as: "bottom" },
        ],
      },
    });
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("top").instanceId)).toBe(true);
  });

  it("trashes the opponent's security after a public battle deletes a legal inherited stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-064", as: "guilmon", suspended: true }],
          hand: [
            { card: "BT21-068", as: "growlmon" },
            { card: "BT21-076", as: "wargrowlmon" },
            { card: "BT21-079", as: "megidramon" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"],
        },
        1: {
          battleArea: [{ card: "BT1-084", as: "attacker" }],
          security: [
            { card: "BT1-009", as: "topSecurity" },
            { card: "BT1-010", as: "bottomSecurity" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("guilmon").permanentId,
        instanceId: s.inst("growlmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("guilmon").topCard.instanceId === s.inst("growlmon").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("guilmon").permanentId,
        instanceId: s.inst("wargrowlmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("guilmon").topCard.instanceId === s.inst("wargrowlmon").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("guilmon").permanentId,
        instanceId: s.inst("megidramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("guilmon").topCard.instanceId === s.inst("megidramon").instanceId);
    expect(s.perm("guilmon").stack.map((card) => card.cardId)).toEqual(["BT21-064", "BT21-068", "BT21-076"]);
    expect(s.perm("guilmon").isSuspended).toBe(true);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const topSecurityId = s.inst("topSecurity").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("guilmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === topSecurityId)).toBe(true);
  });

  it("uses the Growlmon alternate evolution route for 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-068", as: "growlmon" }],
        hand: [{ card: "BT21-076", as: "wargrowlmon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("growlmon").permanentId,
        instanceId: s.inst("wargrowlmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("growlmon").topCard.instanceId === s.inst("wargrowlmon").instanceId);
    expect(s.state.memory).toBe(1);
  });
});
