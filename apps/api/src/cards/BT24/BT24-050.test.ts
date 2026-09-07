import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_050 } from "./BT24-050.js";
import "../index.js";

describe("BT24-050 WereGarurumon", () => {
  it("matches the immutable catalog identity and evolution routes", () => {
    expect(getCardDefinition("BT24-050")).toMatchObject({
      cardId: "BT24-050",
      nameEn: "WereGarurumon",
      colors: ["Green", "Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Beastkin", "Iliad", "TS"],
      evoCosts: [
        { color: "Green", level: 4, memoryCost: 4 },
        { color: "Blue", level: 4, memoryCost: 4 },
      ],
    });
    expect(BT24_050.digivolutionRequirement).toEqual([
      { level: 4, names: ["Garurumon"], cost: 3, isAlternate: true },
      { traits: ["TS"], cost: 3, isAlternate: true, level: 4 },
    ]);
  });

  it("unsuspends your Digimon and restricts an opposing Digimon or Tamer", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = BT24_050.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Unsuspend",
        optional: true,
        target: { filter: { controller: "mine", kind: ["Digimon"] } },
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Restrict",
        restriction: "unsuspend",
        duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
      });
    }
  });
  it("keeps the inherited once-per-turn hand play filter", () => {
    const inherited = BT24_050.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    expect((inherited?.actions?.[0] as any).target.filter).toMatchObject({
      dp: { op: "lte", value: 4000 },
      excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "traitContains" }],
    });
  });

  it("has Evade, unsuspends an own Digimon, and locks an opposing Tamer", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-050", as: "weregarurumon" },
            { card: "BT1-009", as: "ally", suspended: true },
          ],
        },
        1: { battleArea: [{ card: "P-133", as: "tamer", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ally").permanentId, s.perm("tamer").permanentId);
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("weregarurumon"), "Evade")).toBe(true);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("weregarurumon"));

    expect(s.perm("ally").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend")).toBe(true);
  });

  it.each([
    ["normal green requirement", false, 4],
    ["alternate Garurumon-in-name requirement", true, 3],
  ])("uses the %s and resolves When Digivolving", async (_label, useAlternateCost, expectedCost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-046", as: "garurumon", suspended: true }],
          hand: [{ card: "BT24-050", as: "weregarurumon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("garurumon").permanentId,
        instanceId: s.inst("weregarurumon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("garurumon").topCard.instanceId === s.inst("weregarurumon").instanceId);
    await settle(() => !s.perm("garurumon").isSuspended);

    expect(s.state.memory).toBe(5 - expectedCost);
  });

  it("Q5640: a public attack plays a Beastkin card but rejects Sea Animal", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-051", as: "host", under: ["BT24-050"] }],
          hand: [
            { card: "BT1-033", as: "seaAnimal" },
            { card: "BT10-031", as: "beast" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("seaAnimal").instanceId, s.inst("beast").instanceId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("beast").instanceId),
    );

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("beast").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("seaAnimal").instanceId);
  });

  it("Q5640: inherited attack also plays a 4000-DP-or-lower Iliad Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-051", as: "host", under: ["BT24-050"] }],
          hand: [{ card: "BT24-019", as: "iliad" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("iliad").instanceId),
    );

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("iliad").instanceId),
    ).toBe(true);
  });

  it("resets the inherited hand-play limit on its owner's later turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-051", as: "host", under: ["BT24-050"] }],
          hand: [
            { card: "BT24-019", as: "firstIliad" },
            { card: "BT24-019", as: "secondIliad" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          security: ["BT1-012", "BT1-012", "BT1-012", "BT1-012"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("firstIliad").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondIliad").instanceId);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownerTurn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("secondIliad").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("secondIliad").instanceId);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "BT24-019")).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it("uses Evade to suspend itself and prevent deletion", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT24-050", as: "weregarurumon" }] } });
    const permanentId = s.perm("weregarurumon").permanentId;
    await s.ready();

    const deletion = advance(s.engine).verb.deletePermanent([permanentId], "byEffect");
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(
      s.engine.applyIntent(0, {
        type: "respondEvade",
        permanentId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    expect(await deletion).toBe(0);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(permanentId);
    expect(s.perm("weregarurumon").isSuspended).toBe(true);
  });
});
