import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition, PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-059.js";

describe("EX8-059", () => {
  it("matches the committed catalog identity and every printed clause", () => {
    expect(getCardDefinition("EX8-059")).toMatchObject({
      cardId: "EX8-059",
      nameEn: "Devimon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Fallen Angel", "NSo"],
      effectText: expect.stringContaining("give 1 of your opponent's Digimon"),
      inheritedEffectText: expect.stringContaining("Draw 1"),
    });
    expect(getCardDefinition("EX8-059")?.securityEffectText).toBeUndefined();
  });

  it("makes an opposing Digimon gain an On Deletion effect that trashes a card in your hand on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "GrantAuraToOpponents",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        effectText: "[On Deletion] Trash 1 card in your hand.",
        optional: true,
        abortOnDecline: true,
        cost: {
          kind: "trash",
          target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
        },
      });
    }
  });
  it("inherits draw 1 then trash 1 when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
      ],
    }));
  it("exposes the level-3 NSo evolution route for cost 2", () =>
    expect(digivolutionRequirementsFor("EX8-059")).toContainEqual({
      level: 3,
      traits: ["NSo"],
      cost: 2,
      isAlternate: true,
    }));

  it.each([
    ["On Play", "play"],
    ["When Digivolving", "digivolve"],
  ])("pays a hand card at %s and makes the chosen opponent trash on deletion", async (_timing, route) => {
    const s = setupEngine(
      {
        0: {
          ...(route === "play" ? {} : { battleArea: [{ card: "EX8-008", as: "base" }] }),
          hand: [
            { card: "EX8-059", as: "devimon" },
            { card: "BT1-010", as: "grantCost" },
          ],
        },
        1: {
          battleArea: [{ card: "AD1-001", as: "grantee" }],
          hand: [{ card: "BT1-011", as: "opponentDiscard" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = route === "play" ? 5 : 2;
    await s.ready();

    const intent =
      route === "play"
        ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("devimon").instanceId })
        : s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: s.perm("base").permanentId,
            instanceId: s.inst("devimon").instanceId,
            useAlternateCost: true,
          });
    expect(intent).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("grantCost").instanceId));

    expect(await advance(s.engine).verb.deletePermanent([s.perm("grantee").permanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("opponentDiscard").instanceId),
    );
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["AD1-001", "BT1-011"]),
    );
  });

  it.each([
    ["On Play", "play"],
    ["When Digivolving", "digivolve"],
  ] as const)("does not grant the optional deletion cost when declined at %s", async (_timing, route) => {
    const s = setupEngine(
      {
        0: {
          ...(route === "play" ? {} : { battleArea: [{ card: "EX8-008", as: "base" }] }),
          hand: [
            { card: "EX8-059", as: "devimon" },
            { card: "BT1-010", as: "grantCost" },
          ],
        },
        1: {
          battleArea: [{ card: "AD1-001", as: "grantee" }],
          hand: [{ card: "BT1-011", as: "opponentDiscard" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = route === "play" ? 5 : 2;
    await s.ready();

    const result =
      route === "play"
        ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("devimon").instanceId })
        : s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: s.perm("base").permanentId,
            instanceId: s.inst("devimon").instanceId,
            useAlternateCost: true,
          });
    expect(result).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("devimon").instanceId,
      ),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("grantCost").instanceId)).toBe(true);

    await advance(s.engine).verb.deletePermanent([s.perm("grantee").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("grantee").instanceId));
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("opponentDiscard").instanceId)).toBe(
      true,
    );
  });

  it("does not create the deletion effect when its controller has no hand card for the cost", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-059", as: "devimon" }] },
        1: { battleArea: [{ card: "AD1-001", as: "grantee" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("devimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-059"));

    await advance(s.engine).verb.deletePermanent([s.perm("grantee").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("grantee").instanceId));
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("resolves the inherited draw-and-trash during a real attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-062", as: "attacker", under: ["EX8-059"] }],
          hand: [{ card: "BT1-010", as: "filler" }],
          deck: ["BT1-009"],
        },
        1: { security: ["BT1-016"] },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => player.trash.some((card) => card.instanceId === s.inst("filler").instanceId));
    expect(player.hand).toHaveLength(1);
    expect(player.trash.some((card) => card.instanceId === s.inst("filler").instanceId)).toBe(true);
  });

  it("carries the inherited draw-and-trash into the next legal evolution", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-008", as: "lineage" }],
          hand: [
            { card: "EX8-059", as: "devimon" },
            { card: "BT10-079", as: "level5" },
            { card: "BT1-010", as: "grantCost" },
            { card: "BT1-011", as: "attackDiscard" },
          ],
          deck: ["BT1-012"],
        },
        1: { battleArea: [{ card: "AD1-001", as: "grantTarget" }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("grantCost").instanceId);
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lineage").permanentId,
        instanceId: s.inst("devimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lineage").topCard.cardId === "EX8-059" && s.state.players[0]!.trash.length === 1);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lineage").permanentId,
        instanceId: s.inst("level5").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lineage").topCard.cardId === "BT10-079");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lineage").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0 && s.state.players[0]!.trash.length === 2);

    expect(s.state.memory).toBe(0);
    expect(s.perm("lineage").stack.map((card) => card.cardId)).toEqual(["EX8-008", "EX8-059"]);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("evolves through the standard Purple level-3 route for 2 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-057", as: "base" }],
        hand: [{ card: "EX8-059", as: "devimon" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("devimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX8-059");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX8-057"]);
  });
});
