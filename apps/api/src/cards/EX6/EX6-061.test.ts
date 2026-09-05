import { describe, expect, it } from "vitest";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-061.js";

describe("EX6-061 Leviamon", () => {
  it("watches the printed OR play source and returns bottom stack cards before its Then delete", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(2);
    expect(compiled.effects[0]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { or: expect.any(Array) },
      actions: [
        { kind: "ReturnTopDigivolutionCards", cardsPerTarget: 3, position: "bottom" },
        { kind: "Delete", condition: { kind: "boardCountCompare", op: "lte" } },
      ],
    });
    expect(compiled.effects[1]?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanBattle",
      actions: [
        {
          kind: "PlaceUnder",
          target: { from: ["trash"] },
          underFilter: {
            zone: "breeding",
            nameOrTrait: [{ tokens: ["Gate of Deadly Sins"], match: "nameExact" }],
          },
          position: "bottom",
        },
      ],
    });
    const gateReference = { tokens: ["Gate of Deadly Sins"], match: "nameExact" as const };
    expect(matchNameOrTrait({ nameEn: "Gate of Deadly Sins" }, gateReference)).toBe(true);
    expect(matchNameOrTrait({ nameEn: "Gate of Deadly Sins: Awakened" }, gateReference)).toBe(false);
  });
  it("publicly reacts to an opposing Digimon play by trashing its optional cost card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-061", as: "levia" }], hand: [{ card: "BT1-010", as: "cost" }] },
        1: { hand: [{ card: "BT1-009", as: "played" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.playInstances([s.inst("played").instanceId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(false);
  });

  it("returns three cards and then deletes a stackless opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-061", as: "levia" },
            { card: "BT1-009", as: "allyOne" },
            { card: "BT1-009", as: "allyTwo" },
          ],
          hand: [{ card: "BT1-010", as: "cost" }],
        },
        1: {
          hand: [{ card: "BT1-009", as: "played" }],
          battleArea: [
            { card: "BT1-060", as: "stacked", under: ["BT1-010", "BT1-011", "BT1-012"] },
            { card: "BT1-009", as: "stackless" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    await s.ready();
    const stackedPermanentId = s.perm("stacked").permanentId;
    const stacklessPermanentId = s.perm("stackless").permanentId;
    const playPromise = advance(s.engine).verb.playInstances([s.inst("played").instanceId]);
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const returnDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: returnDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [stackedPermanentId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const deleteDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: deleteDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [stacklessPermanentId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === null);
    await playPromise;

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea.find((perm) => perm.permanentId === stackedPermanentId)?.stack).toHaveLength(
      0,
    );
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-010", "BT1-011", "BT1-012"]),
    );
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === stacklessPermanentId)).toBe(false);
    expect(
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("played").instanceId),
    ).toBe(true);
  });

  it("reacts to an own Seven Great Demon Lords play only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-061", as: "levia" }],
          hand: [
            { card: "BT12-085", as: "demonOne" },
            { card: "BT12-085", as: "demonTwo" },
            { card: "BT1-010", as: "costOne" },
            { card: "BT1-011", as: "costTwo" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-060", as: "stacked", under: ["BT1-010", "BT1-011", "BT1-012"] }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    await s.ready();
    const stackedPermanentId = s.perm("stacked").permanentId;
    const firstPlayPromise = advance(s.engine).verb.playInstances([s.inst("demonOne").instanceId]);
    await settle(() => s.state.pendingDecision !== null);
    const firstDecision = s.state.pendingDecision!;
    let response;
    if (firstDecision.kind === "selectCards") {
      response = s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("costOne").instanceId] },
      } as never);
    } else {
      response = s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [stackedPermanentId] },
      } as never);
    }
    expect(response).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === null);
    await firstPlayPromise;
    await advance(s.engine).verb.playInstances([s.inst("demonTwo").instanceId]);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("costOne").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("costTwo").instanceId)).toBe(true);
  });

  it("places a valid trash card under its own Gate when leaving play", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX6-006", as: "gate" },
        battleArea: [{ card: "EX6-061", as: "levia" }],
        trash: [{ card: "EX6-058", as: "material" }],
      },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("levia").permanentId], "byEffect");
    await settle(
      () =>
        s.state.players[0]!.breeding?.stack.some((card) => card.instanceId === s.inst("material").instanceId) === true,
    );

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.breeding?.stack.at(-1)?.instanceId).toBe(s.inst("material").instanceId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(false);
  });
});
