import { getCardDefinition, Phase } from "@aegis/shared";
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
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: {
          dp: { op: "lte", value: 4000 },
          excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "traitContains" }],
        },
      },
    });
  });

  it("publicly plays, unsuspends an own Digimon, and locks an opposing Tamer", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "ally", suspended: true }],
          hand: [{ card: "BT24-050", as: "weregarurumon" }],
        },
        1: { battleArea: [{ card: "P-133", as: "tamer", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ally").permanentId, s.perm("tamer").permanentId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("weregarurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT24-050"));

    expect(observe(s.engine).hasKeyword(s.perm("weregarurumon"), "Evade")).toBe(true);
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend")).toBe(true);
    expect(s.state.memory).toBe(3);
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
          deck: [{ card: "BT1-009", as: "evolutionDraw" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const sourceId = s.inst("garurumon").instanceId;
    const drawId = s.inst("evolutionDraw").instanceId;

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
    expect(s.perm("garurumon").topCard.cardId).toBe("BT24-050");
    expect(s.perm("garurumon").topCard.instanceId).toBe(s.inst("weregarurumon").instanceId);
    expect(s.perm("garurumon").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawId);
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
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-080", as: "host", under: ["BT24-050"] }],
          hand: [
            { card: "BT24-019", as: "firstIliad" },
            { card: "BT24-019", as: "secondIliad" },
            { card: "BT24-050", as: "unsuspender" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          security: [
            { card: "BT1-012", as: "security1" },
            { card: "BT1-012", as: "security2" },
            { card: "BT1-012", as: "security3" },
            { card: "BT1-012", as: "security4" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const security1Id = s.inst("security1").instanceId;
    const security2Id = s.inst("security2").instanceId;
    const security3Id = s.inst("security3").instanceId;
    const security4Id = s.inst("security4").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(security1Id);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      security2Id,
      security3Id,
      security4Id,
    ]);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("firstIliad").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondIliad").instanceId);

    preferred.push(s.perm("host").permanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("unsuspender").instanceId),
    );
    expect(s.state.memory).toBe(3);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length >= 2 && !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(security2Id);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([security3Id, security4Id]);
    expect(observe(s.engine).isAttacking()).toBe(false);
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
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length >= 3 && !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(security3Id);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([security4Id]);
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("secondIliad").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("secondIliad").instanceId);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "BT24-019")).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it.each([true, false])("uses public Happy Bullet to accept=%s Evade", async (accept) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-050", as: "weregarurumon" }] },
        1: { battleArea: [{ card: "BT1-020", as: "redSource" }], hand: [{ card: "BT6-095", as: "happyBullet" }] },
      },
      { autoSelectCards: true },
    );
    const permanentId = s.perm("weregarurumon").permanentId;
    const optionId = s.inst("happyBullet").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(
      s.engine.applyIntent(0, {
        type: "respondEvade",
        permanentId,
        accept,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "cardsMoved" && event.instanceIds.includes(optionId)));
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(optionId);
    const battleAreaIds = s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId);
    const trashIds = s.state.players[0]!.trash.map((card) => card.instanceId);
    const remaining = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === permanentId);
    expect(battleAreaIds.includes(permanentId)).toBe(accept);
    expect(remaining?.isSuspended ?? false).toBe(accept);
    expect(trashIds.includes(s.inst("weregarurumon").instanceId)).toBe(!accept);
    expect(s.state.memory).toBe(0);
  });
});
