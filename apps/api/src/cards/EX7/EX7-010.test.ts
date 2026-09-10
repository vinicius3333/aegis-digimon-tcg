import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { compiled } from "./EX7-010.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX7-010 Deputymon", () => {
  it("matches the catalog printing, alternate evolution, and complete IR", () => {
    expect(getCardDefinition("EX7-010")).toMatchObject({
      cardId: "EX7-010",
      nameEn: "Deputymon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 6000,
      evoCosts: [{ color: "Red", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Mutant"],
      effectText:
        "[Digivolve]Lv.3 w/[Three Musketeers]\u00a0in its text: Cost 2 \n\n[When Digivolving] [When Attacking]You may trash any 1 Option card from 1 Digimon's digivolution cards.\n[Your Turn] This Digimon gains the [Three Musketeers]\u00a0trait.",
      inheritedEffectText: "[Your Turn] This Digimon gets +2000 DP.",
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, texts: ["Three Musketeers"], cost: 2, isAlternate: true },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("trashes an Option from any digivolution stack on digivolving or attacking", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const)
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Trash",
        optional: true,
        target: { filter: { zone: "digivolutionCards", cardType: "Option", controller: "any" } },
      });
  });
  it("grants the Three Musketeers trait and inherits +2000 DP", () => {
    expect(
      compiled.effects?.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited)?.actions[0],
    ).toMatchObject({ kind: "GrantStatic", grant: "trait", tokens: ["Three Musketeers"] });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    });
  });

  it("Q3830: publicly digivolves for 2, draws, and trashes an opponent's Option stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-008", as: "base" }],
          hand: [{ card: "EX7-010", as: "deputy" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", under: ["EX7-066"] }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    const sourceInstanceId = s.perm("base").topCard!.instanceId;
    const drawnInstanceId = s.inst("drawn").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("deputy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX7-010");

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnInstanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.perm("base").topCard?.instanceId).toBe(s.inst("deputy").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceInstanceId]);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX7-008"]);
    expect(s.perm("opponent").stack).toHaveLength(0);
  });

  it("can trash an opponent's stacked Option when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-010", as: "deputy" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", under: ["EX7-066"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("deputy").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea[0]!.stack.length === 0);

    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(0);
  });

  it("Q3830: can also trash an Option from its own Digimon stack when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-010", as: "deputy", under: ["EX7-066"] }] },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("deputy").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("deputy").stack.length === 0);

    expect(s.perm("deputy").stack).toHaveLength(0);
  });

  it("declines the optional attack trash through a public attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-010", as: "deputy", under: ["EX7-066"] }] },
        1: { security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("deputy").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("deputy").isSuspended);

    expect(s.perm("deputy").stack.map((card) => card.cardId)).toEqual(["EX7-066"]);
  });

  it("applies inherited +2000 DP to its host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX7-010"] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("Q3831: grants Three Musketeers in the battle area during Your Turn", async () => {
    const battle = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-010", as: "deputy" }], hand: [{ card: "EX7-066", as: "option" }] },
        1: { battleArea: ["BT1-009"], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await battle.ready();
    battle.state.memory = 10;
    expect(battle.engine.applyIntent(0, { type: "playCard", instanceId: battle.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => battle.perm("deputy").stack.length === 1);
    expect(battle.perm("deputy").stack.map((card) => card.cardId)).toEqual(["EX7-066"]);
  });

  it("rejects an illegal alternate evolution source without payment, draw, or stack movement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-029", as: "base" }],
          hand: [{ card: "EX7-010", as: "deputy" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
          security: ["BT1-009"],
        },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const handBefore = s.state.players[0]!.hand.map((card) => card.instanceId);
    const deckBefore = s.state.players[0]!.deck.map((card) => card.instanceId);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("deputy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(handBefore);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(deckBefore);
    expect(s.perm("base").topCard?.cardId).toBe("BT1-029");
    expect(s.perm("base").stack).toHaveLength(0);
  });

  it("Q3831: a breeding-area Deputy cannot supply Three Musketeers for a color waiver", async () => {
    const s = setupEngine({
      0: { breeding: { card: "EX7-010", as: "deputy" }, hand: [{ card: "EX7-071", as: "option" }] },
      1: { battleArea: ["BT1-009"], security: ["BT1-010"] },
    });
    await s.ready();
    s.state.memory = 10;
    expect(s.perm("deputy").inBreeding).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.perm("deputy").stack).toHaveLength(0);
  });
});
