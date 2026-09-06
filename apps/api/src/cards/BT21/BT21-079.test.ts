import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-079.js";
import "../index.js";
describe("BT21-079 Megidramon", () => {
  it("has Security Attack plus one, wipes opposing Digimon, and recurs Guilmon family", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "EndOfAttack",
        frequency: "OncePerTurn",
        actions: [{ kind: "Delete", target: expect.objectContaining({ count: "all" }) }],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        actions: expect.arrayContaining([
          expect.objectContaining({
            kind: "PlayWithoutCost",
            from: ["trash"],
            target: expect.objectContaining({
              filter: expect.objectContaining({
                playCostLte: 3,
                nameOrTrait: [{ tokens: ["Guilmon", "Growlmon"], match: "name" }],
              }),
            }),
            playCostCeiling: expect.objectContaining({
              base: 3,
              raise: 2,
              per: 10,
              filter: { zone: "trash", controller: "any" },
              unit: "cards",
            }),
          }),
        ]),
      }),
    );
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, names: ["Growlmon"], cost: 4, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("has Security Attack +1 and deletes every Digimon on both sides at end of attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-079", as: "megidramon" },
            { card: "BT1-009", as: "ownOther" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponentA" },
            { card: "BT1-010", as: "opponentB" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("megidramon"), "SecurityAttack")).toBe(1);
    await advance(s.engine).fire(EffectTiming.EndOfAttack, s.perm("megidramon"));
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea[0]?.topCard.instanceId).toBe(s.inst("tamer").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(2);
  });

  it("wipes both battle areas after a real public attack resolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-079", as: "megidramon", dp: 13000 },
            { card: "BT1-009", as: "ownOther" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "opponent", suspended: true }],
          security: [{ card: "BT1-009", as: "security" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("megidramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("megidramon").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("ownOther").instanceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("opponent").instanceId)).toBe(true);
  });

  it("publicly revives a qualifying Guilmon after Megidramon loses its attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-079", as: "megidramon" }],
          trash: [{ card: "BT12-007", as: "guilmon" }],
        },
        1: { battleArea: [{ card: "BT1-084", as: "omnimon", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const megidramonId = s.perm("megidramon").permanentId;
    const guilmonId = s.inst("guilmon").instanceId;
    const omnimonId = s.perm("omnimon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: megidramonId,
        target: { kind: "permanent", permanentId: omnimonId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === guilmonId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === megidramonId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === omnimonId)).toBe(true);
  });

  it("publicly declines the optional On Deletion revival and preserves the trash card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-079", as: "megidramon" }],
          trash: [{ card: "BT12-007", as: "guilmon" }],
        },
        1: { battleArea: [{ card: "BT1-084", as: "omnimon", suspended: true }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const guilmonId = s.inst("guilmon").instanceId;
    const omnimonId = s.perm("omnimon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("megidramon").permanentId,
        target: { kind: "permanent", permanentId: omnimonId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === guilmonId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === guilmonId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === omnimonId)).toBe(true);
  });

  it("does not let an opponent-owned BT21-079 wipe after our other Digimon attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "BT21-079", as: "opponentMegidramon" },
            { card: "BT1-010", as: "opponentOther" },
          ],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    await settle(
      () =>
        s.events.some((event) => event.kind === "securityChecked" || event.kind === "combatResolved") &&
        !observe(s.engine).isAttacking(),
    );
    expect(
      s.events.some((event) => event.kind === "securityChecked" || event.kind === "combatResolved") &&
        !observe(s.engine).isAttacking(),
    ).toBe(true);
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.players[1]!.battleArea.length === 2);

    expect(s.perm("opponentMegidramon").topCard.instanceId).toBe(s.inst("opponentMegidramon").instanceId);
    expect(s.perm("opponentOther").topCard.instanceId).toBe(s.inst("opponentOther").instanceId);
  });

  it("does not let its BT21-079 wipe after a different own Digimon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-079", as: "ownMegidramon" },
            { card: "BT1-009", as: "ownOther" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ownOther").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    await settle(
      () =>
        s.events.some((event) => event.kind === "securityChecked" || event.kind === "combatResolved") &&
        !observe(s.engine).isAttacking(),
    );
    expect(
      s.events.some((event) => event.kind === "securityChecked" || event.kind === "combatResolved") &&
        !observe(s.engine).isAttacking(),
    ).toBe(true);
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.perm("ownMegidramon").topCard.instanceId).toBe(s.inst("ownMegidramon").instanceId);
    expect(s.perm("ownOther").topCard.instanceId).toBe(s.inst("ownOther").instanceId);
  });

  it("does not let an opponent BT21-079 wipe after our Armor Purge attack defeats it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-035", as: "armor", under: ["BT21-032"] }],
        },
        1: {
          battleArea: [{ card: "BT21-079", as: "opponentMegidramon", suspended: true }],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("armor").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponentMegidramon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT21-035"));
    await settle(
      () =>
        s.events.some((event) => event.kind === "securityChecked" || event.kind === "combatResolved") &&
        !observe(s.engine).isAttacking(),
    );
    expect(
      s.events.some((event) => event.kind === "securityChecked" || event.kind === "combatResolved") &&
        !observe(s.engine).isAttacking(),
    ).toBe(true);
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.players[1]!.battleArea.length === 1);

    expect(s.perm("armor").topCard.cardId).toBe("BT21-032");
    expect(s.perm("opponentMegidramon").topCard.instanceId).toBe(s.inst("opponentMegidramon").instanceId);
  });

  it.each([
    ["base cost 3", 0, "BT12-007", true],
    ["9 total trash keeps cap 3", 7, "BT12-010", false],
    ["10 total trash raises cap to 5", 8, "BT12-010", true],
    ["20 total trash raises cap to 7", 18, "BT21-076", true],
  ] as const)("%s", async (_label, fillerCount, candidate, shouldPlay) => {
    const filler = Array.from({ length: fillerCount }, () => "BT1-009");
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-079", as: "megidramon" }],
          trash: [{ card: candidate, as: "candidate" }, ...filler],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("megidramon").permanentId], "byEffect")).toBe(1);
    if (shouldPlay) {
      await settle(() =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("candidate").instanceId,
        ),
      );
    }
    expect(s.state.players[0]!.battleArea).toHaveLength(shouldPlay ? 1 : 0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(
      !shouldPlay,
    );
  });

  it("counts both players' trashes for the cost-5 ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-079", as: "megidramon" }],
          trash: [{ card: "BT12-010", as: "candidate" }, ...Array.from({ length: 4 }, () => "BT1-009")],
        },
        1: { trash: Array.from({ length: 5 }, () => "BT1-010") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("megidramon").permanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("candidate").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("candidate").instanceId)).toBe(
      true,
    );
  });

  it("does not play a non-Guilmon-family card even below the cost ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-079", as: "megidramon" }],
          trash: [{ card: "BT1-009", as: "other" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("megidramon").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("other").instanceId)).toBe(true);
  });

  it("uses the level-5 Growlmon-name alternate evolution route for 4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-076", as: "wargrowlmon" }],
        hand: [{ card: "BT21-079", as: "megidramon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wargrowlmon").permanentId,
        instanceId: s.inst("megidramon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("wargrowlmon").topCard.instanceId === s.inst("megidramon").instanceId);
    expect(s.state.memory).toBe(1);
  });
});
