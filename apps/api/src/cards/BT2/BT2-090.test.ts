import { EffectTiming, type PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-090.js";

describe("BT2-090 Matt Ishida", () => {
  it("sets memory to 3 at the start of its owner's turn when memory is 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-090", as: "matt" }] } });
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("matt"));
    expect(s.state.memory).toBe(3);
  });

  it("does not lower memory when it is already above 2", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-090", as: "matt" }] } });
    s.state.memory = 4;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("matt"));

    expect(s.state.memory).toBe(4);
  });

  it("returns a purple Digimon from trash to hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT2-090", as: "source" }],
          trash: [
            { card: "BT2-067", as: "purple" },
            { card: "BT1-010", as: "red" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const purpleId = s.inst("purple").instanceId;
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === purpleId));
    expect(player.trash.map((card) => card.instanceId)).toContain(s.inst("red").instanceId);
  });

  it("offers exactly purple Digimon and purple Options from the controller's trash", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT2-090", as: "source" }],
        trash: [
          { card: "BT2-067", as: "purpleDigimon" },
          { card: "ST6-15", as: "purpleOption" },
          { card: "BT1-010", as: "redDigimon" },
          { card: "BT2-091", as: "redOption" },
        ],
      },
    });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === selection.decisionId)!.req;

    expect(request.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.inst("purpleDigimon").instanceId, s.inst("purpleOption").instanceId]),
    );
    expect(request.options!.candidateInstanceIds).toHaveLength(2);
    expect(request.options).toMatchObject({ min: 1, max: 1 });
  });

  it("returns a purple Option from trash to hand", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT2-090", as: "source" }], trash: [{ card: "ST6-15", as: "option" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT2-090", as: "securityTamer", faceUp: true }],
          trash: [{ card: "BT2-067", as: "recovered" }],
        },
      },
      { autoSelectCards: true },
    );
    const instanceId = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("recovered").instanceId)).toBe(true);
  });
});
