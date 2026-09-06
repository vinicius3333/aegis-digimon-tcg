import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT25_044 } from "./BT25-044.js";
import { wouldBePlayedSelfReducersFor } from "../../engine/effects/interpreter/registration/reducers.js";
import "../index.js";

describe("BT25-044 Junomon", () => {
  it("registers its Q7004 conditional self play-cost reducer for effect-driven paid plays", () => {
    expect(wouldBePlayedSelfReducersFor("BT25-044")).toContainEqual(
      expect.objectContaining({
        amount: 5,
        condition: expect.objectContaining({ kind: "totalSecurityCount", op: "lte", value: 6 }),
      }),
    );
  });

  it("places another Digimon on top of security, then trashes both players' top security cards", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_044.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toHaveLength(2);

      const [place, trash] = effect!.actions!;
      expect(place).toMatchObject({
        kind: "SecurityManipulation",
        op: "trashTop",
        controller: "mine",
        amount: 1,
        abortOnDecline: true,
        cost: {
          kind: "place",
          targetIsPermanent: true,
          destination: "security",
          position: "top",
          faceDown: true,
          target: {
            filter: { controllerDefault: "mine", excludeSelf: true, kind: ["Digimon"], zone: "battleArea" },
            count: 1,
          },
        },
      });
      expect(trash).toMatchObject({
        kind: "SecurityManipulation",
        op: "trashTop",
        controller: "opponent",
        amount: 1,
      });
    }
  });

  it("keeps the once-per-turn security-removal play effect restricted to Angel/Archangel/Iliad", () => {
    const effect = BT25_044.effects?.find((entry) => entry.trigger === "AllTurns");
    const subtrigger = effect?.actions?.[0] as { event?: string; actions?: unknown[] };
    expect(subtrigger.event).toBe("whenSecurityRemoved");
    expect(effect?.frequency).toBe("OncePerTurn");
    expect(subtrigger.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      payCost: false,
      optional: true,
      target: {
        filter: {
          controller: "mine",
          playCostLte: 8,
          nameOrTrait: [{ tokens: ["Angel", "Archangel", "Iliad"], match: "trait" }],
        },
      },
    });
  });

  it("does not trash security when the mandatory placement cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT25-044", as: "junomon" }], security: ["BT1-001"] },
        1: { security: ["BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("junomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-044"));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("pays the placement cost before trashing both security tops", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-044", as: "junomon" }],
          security: ["BT1-001"],
          battleArea: [{ card: "BT1-009", as: "other" }],
        },
        1: { security: ["BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("junomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-044"));

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-002"]);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-001"]);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("plays through the legal TS level-5 alternate evolution and resolves both security removals", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-039", as: "base" },
            { card: "BT1-009", as: "other" },
          ],
          hand: [{ card: "BT25-044", as: "junomon" }],
          security: ["BT1-001"],
        },
        1: { security: ["BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("junomon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT25-044");
    expect(s.state.players[0]!.trash).toContainEqual(expect.objectContaining({ cardId: "BT1-009" }));
    expect(s.state.players[1]!.trash).toContainEqual(expect.objectContaining({ cardId: "BT1-002" }));
  });

  it("applies the Q7004 five-cost reduction at six total security and not at seven", async () => {
    const reduced = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-044", as: "junomon" }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
          battleArea: [{ card: "BT1-009", as: "other" }],
        },
        1: { security: ["BT1-002", "BT1-002", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    reduced.state.memory = 7;
    await reduced.ready();
    expect(reduced.engine.applyIntent(0, { type: "playCard", instanceId: reduced.inst("junomon").instanceId })).toEqual(
      { ok: true },
    );
    await settle(() => reduced.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-044"));
    expect(reduced.state.memory).toBe(0);

    const unreduced = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-044", as: "junomon" }],
          security: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          battleArea: [{ card: "BT1-009", as: "other" }],
        },
        1: { security: ["BT1-002", "BT1-002", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    unreduced.state.memory = 12;
    await unreduced.ready();
    expect(
      unreduced.engine.applyIntent(0, { type: "playCard", instanceId: unreduced.inst("junomon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => unreduced.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-044"));
    expect(unreduced.state.memory).toBe(0);
  });

  it("reacts once per turn only to removal from its own security and filters the free play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-044", as: "junomon" }],
          hand: [
            { card: "BT25-034", as: "angel" },
            { card: "BT24-030", as: "tooExpensive" },
            { card: "BT1-009", as: "wrongTrait" },
          ],
          security: ["BT1-001", "BT1-002"],
        },
        1: { security: ["BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(1, 1, { fromTop: true });
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT25-034", "BT24-030", "BT1-009"]);

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-034"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT24-030", "BT1-009"]);

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => false, 40);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT24-030", "BT1-009"]);
  });

  it("can play the matching free-play card from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-044", as: "junomon" }],
          hand: [{ card: "BT1-009", as: "wrongTrait" }],
          trash: [{ card: "BT25-034", as: "angel" }],
          security: ["BT1-001"],
        },
        1: { security: ["BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-034"));
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-001"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("naturally reacts when an opponent security check removes its security card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-044", as: "junomon" }],
          hand: [{ card: "BT25-034", as: "angel" }],
          security: [{ card: "BT1-090", as: "security" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-034"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("angel").instanceId)).toBe(false);
  });
});
