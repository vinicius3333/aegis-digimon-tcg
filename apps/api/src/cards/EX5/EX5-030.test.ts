import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-030.js";
import "../index.js";

describe("EX5-030 Liamon", () => {
  it("matches the catalog and encodes Leomon identity plus the optional attack digivolve", () => {
    expect(getCardDefinition("EX5-030")).toMatchObject({
      cardId: "EX5-030",
      nameEn: "Liamon",
      colors: ["Yellow", "Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Holy Beast"],
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 3 },
        { color: "Green", level: 3, memoryCost: 3 },
      ],
      effectText: expect.stringContaining("Digivolve: 2 from [Liollmon]"),
      inheritedEffectText: expect.stringContaining("gets -2000 DP until the end of their turn"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Liollmon"], cost: 2, isAlternate: true },
      { names: ["Elecmon"], cost: 2, isAlternate: true },
    ]);

    const attackAction = compiled.effects?.find((entry) => entry.trigger === "WhenAttacking");
    expect(attackAction?.frequency).toBeUndefined();
    expect(attackAction?.actions).toEqual([
      {
        kind: "Digivolve",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        into: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Leomon"], match: "name" }],
        },
        from: ["hand"],
        payCost: true,
        reduceCost: 1,
        optional: true,
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions).toEqual([
      {
        kind: "GrantStatic",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        grant: "name",
        tokens: ["Leomon"],
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.isInherited)).toEqual({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "untilOpponentTurnEnd",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
      isInherited: true,
    });
  });

  it("publicly digivolves on attack into an applicable Leomon-name card for one less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-030", as: "liamon" }],
          hand: [{ card: "EX5-049", as: "grapLeomon" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("liamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("liamon").topCard?.cardId === "EX5-049");

    expect(s.perm("liamon").topCard?.cardId).toBe("EX5-049");
    expect(s.perm("liamon").stack.map((card) => card.cardId)).toEqual(["EX5-030"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.hand).not.toContainEqual(
      expect.objectContaining({ instanceId: s.inst("grapLeomon").instanceId }),
    );
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.memory).toBe(7);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not use the optional attack effect when its choice is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-030", as: "liamon" }],
          hand: [{ card: "EX5-049", as: "grapLeomon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("liamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("liamon").topCard?.cardId).toBe("EX5-030");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX5-049"]);
    expect(s.state.memory).toBe(10);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not ignore normal digivolution requirements for a Leomon-name card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-030", as: "liamon" }],
          hand: [{ card: "BT1-035", as: "ineligibleLeomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("liamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("liamon").topCard?.cardId).toBe("EX5-030");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-035"]);
    expect(s.state.memory).toBe(10);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    { source: "EX5-028", alternate: false, cost: 3 },
    { source: "EX5-027", alternate: true, cost: 2 },
    { source: "EX5-044", alternate: true, cost: 2 },
  ])("supports the $source $alternate evolution route", async ({ source, alternate, cost }) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: source, as: "source" }],
        hand: [{ card: "EX5-030", as: "liamon" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = cost;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("liamon").instanceId,
        useAlternateCost: alternate,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "EX5-030");

    expect(s.perm("source").topCard?.cardId).toBe("EX5-030");
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual([source]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("applies inherited -2000 DP through a public opposing attack and deletion", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-030"], suspended: true }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "attacker", dp: 10000 },
            { card: "BT1-011", as: "opponent", dp: 5000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").topCard!.instanceId);
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.perm("opponent").currentDP === 3000);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.perm("opponent").currentDP).toBe(3000);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
