import { describe, expect, it } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-092.js";
import "./BT9-092.js";

describe("BT9-092 Cool Boy", () => {
  it("matches catalog values and the reveal, same-level, and security IR", () => {
    expect(getCardDefinition("BT9-092")).toMatchObject({
      colors: ["White"], kinds: ["Tamer"], playCost: 2,
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 3, add: [{ filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] } }, { filter: { kind: ["Option"], nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] } }] }] },
        { trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "whenOneOfYoursDigivolves", fireCondition: { kind: "triggerDigivolvedSameLevel" }, actions: [{ kind: "GainMemory", amount: 1, abortOnDecline: true, cost: { kind: "suspend" } }, { kind: "Draw", amount: 1 }] }] },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
      ],
    });
  });

  it("adds an X Antibody Digimon and X Antibody Option from three revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT9-092", as: "source" }],
          deck: [{ card: "BT9-062", as: "digimon" }, { card: "BT9-109", as: "option" }, "BT9-060"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const ids = [s.inst("digimon").instanceId, s.inst("option").instanceId];
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => ids.every((id) => player.hand.some((c) => c.instanceId === id)));
    expect(player.deck).toHaveLength(1);
  });

  it("suspends, gains memory, and draws after a same-level X Antibody digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT9-092", as: "coolBoy" },
            { card: "BT5-007", as: "agumon" },
          ],
          hand: [{ card: "BT9-008", as: "agumonX" }],
          deck: [
            { card: "BT1-001", as: "evolutionDraw" },
            { card: "BT1-002", as: "coolBoyDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("agumonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("coolBoyDraw").instanceId));

    expect(s.perm("coolBoy").isSuspended).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("does not trigger for an X Antibody Digimon whose level increased", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT9-092", as: "coolBoy" },
            { card: "BT5-007", as: "agumon" },
          ],
          hand: [{ card: "BT9-011", as: "growlmonX" }],
          deck: [
            { card: "BT1-009", as: "evolutionDraw" },
            "BT1-009",
            "BT1-009",
            "BT1-009",
            { card: "BT1-009", as: "untouched" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("growlmonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("coolBoy").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("untouched").instanceId)).toBe(true);
  });

  it("draws nothing when suspending Cool Boy is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT9-092", as: "coolBoy" },
            { card: "BT5-007", as: "agumon" },
          ],
          hand: [{ card: "BT9-008", as: "agumonX" }],
          deck: [
            { card: "BT1-009", as: "evolutionDraw" },
            "BT1-009",
            "BT1-009",
            "BT1-009",
            { card: "BT1-009", as: "untouched" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("agumonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("coolBoy").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("untouched").instanceId)).toBe(true);
    expect(s.state.memory).toBe(3);
  });
});
