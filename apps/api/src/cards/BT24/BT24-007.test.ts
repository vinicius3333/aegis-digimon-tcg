import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-007.js";
import "../index.js";

describe("BT24-007 Tsunomon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-007")).toMatchObject({
      cardId: "BT24-007",
      nameEn: "Tsunomon",
      colors: ["Purple"],
      kinds: ["DigiEgg"],
      level: 2,
      types: ["Lesser", "Titan", "TS"],
    });
  });

  it("plays one level 4+ Demon/Titan Digimon from trash with a 2-cost reduction", () => {
    const effect = compiled.effects[0]!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(effect).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn" });
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenHandTrashed",
      fireCondition: { kind: "triggerHandTrashedSeat", seat: "mine" },
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          fromTriggerHandTrash: true,
          payCost: true,
          reduceCostBy: 2,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              kind: ["Digimon"],
              levelComparison: { op: "gte", value: 4 },
              nameOrTrait: [
                { tokens: ["Demon"], match: "trait" },
                { tokens: ["Titan"], match: "trait" },
              ],
            },
            count: 1,
          },
        },
      ],
    });
  });

  it("plays only the qualifying Titan trashed by the triggering action", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-009", as: "host", under: ["BT24-007"] }],
          hand: [{ card: "BT24-045", as: "triggeringTarget" }],
          trash: [{ card: "BT24-045", as: "unrelatedTarget" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    await advance(s.engine).verb.trash([s.inst("triggeringTarget").instanceId], 0);
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("triggeringTarget").instanceId,
      ),
    );

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("triggeringTarget").instanceId,
      ),
    ).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("unrelatedTarget").instanceId);
    expect(s.state.memory).toBe(8);
  });

  it("does not play an unrelated trash card when the triggering discard is ineligible", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-009", as: "host", under: ["BT24-007"] }],
          hand: [{ card: "BT24-042", as: "levelThreeDemon" }],
          trash: [{ card: "BT24-045", as: "unrelatedTarget" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    await advance(s.engine).verb.trash([s.inst("levelThreeDemon").instanceId], 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("unrelatedTarget").instanceId);
    expect(s.state.memory).toBe(10);
  });

  it("enforces the inherited once-per-turn limit across production trash events", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-009", as: "host", under: ["BT24-007"] }],
          hand: [
            { card: "BT24-045", as: "first" },
            { card: "BT24-045", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).verb.trash([s.inst("first").instanceId], 0);
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("first").instanceId),
    );
    await advance(s.engine).verb.trash([s.inst("second").instanceId], 0);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("second").instanceId));
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT24-045")).toHaveLength(1);
    expect(s.state.memory).toBe(8);
  });

  it("reacts to a hand trash produced by a public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-009", as: "host", under: ["BT24-007"] }],
          hand: [
            { card: "BT24-026", as: "discarder" },
            { card: "BT24-045", as: "trashedTitan" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("discarder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("trashedTitan").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("trashedTitan").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("trashedTitan").instanceId);
    expect(s.state.memory).toBe(4);
  });

  it("resolves from a legal evolved breeding stack after a public hand-trash event", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT24-007", as: "egg" },
          hand: [
            { card: "BT24-009", as: "shaman" },
            { card: "BT24-010", as: "greymon" },
            { card: "BT24-026", as: "discarder" },
            { card: "BT1-069", as: "demon" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          security: ["BT1-014", "BT1-015"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("demon").instanceId);
    s.state.memory = 10;
    await s.ready();
    const eggId = s.perm("egg").permanentId;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: eggId, instanceId: s.inst("shaman").instanceId, useAlternateCost: true, alternateRequirementIndex: 1 })).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT24-009");
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: eggId, instanceId: s.inst("greymon").instanceId, useAlternateCost: true })).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT24-010");
    const setupTurn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.state.phase).toBe(Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await setupTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.state.phase).toBe(Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggId })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => true);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("discarder").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("demon").instanceId));
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT24-007", "BT24-009"]);
    expect(s.perm("egg").topCard.cardId).toBe("BT24-010");
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("demon").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("demon").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("rejects the same hand-trash event on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-010", as: "host", under: ["BT24-007", "BT24-009"] }] },
      1: { hand: [{ card: "BT24-026", as: "discarder" }, { card: "BT1-069", as: "demon" }], deck: ["BT1-009", "BT1-010"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("discarder").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("demon").instanceId));
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("demon").instanceId);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("demon").instanceId)).toBe(false);
  });

  it.each([
    ["Demon-only", "BT1-069", true],
    ["Titan-only", "BT24-010", true],
    ["near-trait level 4", "BT24-046", false],
  ] as const)("enforces the exact Demon/Titan boundary for %s", async (_label, candidate, qualifies) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-009", as: "host", under: ["BT24-007"] }],
        hand: [{ card: "BT24-026", as: "discarder" }, { card: candidate, as: "candidate" }],
        deck: ["BT1-009", "BT1-010"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("discarder").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("candidate").instanceId) || s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("candidate").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("candidate").instanceId)).toBe(qualifies);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(!qualifies);
  });

  it("resets the inherited once-per-turn play on the next actual owner turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-010", as: "host", under: ["BT24-007", "BT24-009"] }],
        hand: [
          { card: "BT24-026", as: "firstDiscarder" },
          { card: "BT1-069", as: "firstDemon" },
          { card: "BT24-026", as: "secondDiscarder" },
          { card: "BT1-069", as: "secondDemon" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
      },
      1: { deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.turnSeat = 0;
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstDiscarder").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("firstDemon").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("firstDemon").instanceId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondDiscarder").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("secondDemon").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("secondDemon").instanceId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
  });

  it("leaves the triggering card in trash when its optional play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-009", as: "host", under: ["BT24-007"] }],
          trash: [{ card: "BT24-045", as: "candidate" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenHandTrashed", {
      handTrashedSeat: 0,
      handTrashedInstanceIds: [s.inst("candidate").instanceId],
    });
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("candidate").instanceId)).toBe(
      false,
    );
  });

  it("reaches Shamanmon through a legal public breeding evolution", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT24-007", as: "egg" }, hand: [{ card: "BT24-009", as: "shaman" }] },
    });
    s.state.memory = 5;
    await s.ready();
    const eggId = s.perm("egg").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggId,
        instanceId: s.inst("shaman").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT24-009");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT24-007"]);
  });
});
