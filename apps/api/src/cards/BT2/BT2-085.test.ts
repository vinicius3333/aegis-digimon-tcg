import { EffectTiming, getCardDefinition, getCompiledCard, type PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST2/ST2-16.js";
import { default as compiled } from "./BT2-085.js";

describe("BT2-085 Joe Kido", () => {
  it("matches official metadata and publishes the typed trash watcher", () => {
    expect(getCardDefinition("BT2-085")).toMatchObject({
      nameEn: "Joe Kido",
      colors: ["Blue"],
      effectText: expect.stringContaining("digivolution cards is trashed"),
    });
    expect(compiled).toEqual(getCompiledCard("BT2-085"));
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });
  it("suspends to gain memory when an opponent's digivolution card is trashed by an effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-085", as: "joe" }] },
        1: { battleArea: [{ card: "BT1-019", as: "target", under: ["BT1-010"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const sourceId = s.perm("target").stack[0]!.instanceId;

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("target").permanentId, [sourceId], 0);

    expect(s.perm("joe").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("may decline the memory gain and keeps Joe unsuspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-085", as: "joe" }] },
        1: { battleArea: [{ card: "BT1-019", as: "target", under: ["BT1-010"] }] },
      },
      { autoDeclineOptional: true },
    );
    const sourceId = s.perm("target").stack[0]!.instanceId;

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("target").permanentId, [sourceId], 0);

    expect(s.perm("joe").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("does not activate when the controller's own digivolution card is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-085", as: "joe" },
            { card: "BT1-019", as: "ownTarget", under: ["BT1-010"] },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    const sourceId = s.perm("ownTarget").stack[0]!.instanceId;

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("ownTarget").permanentId, [sourceId], 0);

    expect(s.perm("joe").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("does not activate during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-085", as: "joe" }] },
        1: { battleArea: [{ card: "BT1-019", as: "target", under: ["BT1-010"] }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    const sourceId = s.perm("target").stack[0]!.instanceId;

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("target").permanentId, [sourceId], 1);

    expect(s.perm("joe").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("does not activate when sources are disposed of by returning their Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-085", as: "joe" }] },
        1: { battleArea: [{ card: "BT1-019", as: "target", under: ["BT1-010"] }] },
      },
      { autoAcceptOptional: true },
    );

    await advance(s.engine).verb.returnToHand([s.perm("target").topCard.instanceId]);

    expect(s.perm("joe").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-085", as: "securityTamer", faceUp: true }] } });
    const instanceId = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
  });
});

describe("BT2-085 Joe Kido — KB Q&A rulings", () => {
  it("does not activate when an opponent's Digimon is returned to hand and its digivolution cards are trashed as part of the return (Q1037)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-085", as: "joe" }], hand: [{ card: "ST2-16", as: "cocytusBreath" }] },
        1: {
          battleArea: [
            { card: "BT1-019", as: "returned", under: ["BT1-010"] },
            { card: "BT1-019", as: "stripped", under: ["BT1-010"] },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 7;
    const opponent = s.state.players[1] as PlayerState;
    const returnedId = s.perm("returned").topCard.instanceId;
    const returnedSourceId = s.perm("returned").stack[0]!.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cocytusBreath").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("returned").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.hand.some((card) => card.instanceId === returnedId));
    await settle(() => s.state.pendingDecision === undefined);

    expect(opponent.trash.some((card) => card.instanceId === returnedSourceId)).toBe(true);
    expect(s.perm("joe").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);

    const strippedSourceId = s.perm("stripped").stack[0]!.instanceId;
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("stripped").permanentId, [strippedSourceId], 0);

    expect(s.perm("joe").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });
});
