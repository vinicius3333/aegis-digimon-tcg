import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./EX6-037.js";

describe("EX6-037 Spadamon", () => {
  it("pays 1 and places itself under a level 3 or Legend-Arms Digimon to draw", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 1,
      cost: { kind: "payMemory", memory: 1 },
      additionalCosts: [
        { kind: "place", position: "bottom", underOrFilters: [{ nameOrTrait: [{ tokens: ["Legend-Arms"] }] }] },
      ],
    }));
  it("draws two by trashing a Legend-Arms card on play and inherits low-DP deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 2,
      cost: {
        kind: "trash",
        target: { filter: { zone: "hand", nameOrTrait: [{ match: "trait", tokens: ["Legend-Arms"] }] } },
      },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", value: 3000 } } } }],
    });
  });

  it("publicly pays 1, places itself under a level-3 Digimon, and draws", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host" }],
          hand: [{ card: "EX6-037", as: "spada" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const [effect] = JSON.parse(s.inst("spada").activatableEffectsJson || "[]") as Array<{ effectKey: string }>;
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("spada").instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === s.inst("spada").instanceId));
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("publicly trashes a Legend-Arms card and draws two on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX6-037", as: "spada" },
            { card: "EX6-007", as: "cost" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("spada").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("publicly deletes an opposing 3000 DP Digimon from its inherited attack effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-060", as: "host", under: ["EX6-037"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("resolves its inherited low-DP deletion only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-060", as: "host", under: ["EX6-037"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-009", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("first").instanceId);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.instanceId).toBe(s.inst("second").instanceId);
  });

  it("rejects the hand effect when no eligible host is present", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX6-037", as: "spada" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const [effect] = JSON.parse(s.inst("spada").activatableEffectsJson || "[]") as Array<{ effectKey: string }>;
    expect(effect).toBeUndefined();
  });

  it("publicly places itself under a Legend-Arms host without requiring a level-3 host", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-010", as: "host" }], hand: [{ card: "EX6-037", as: "spada" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const [effect] = JSON.parse(s.inst("spada").activatableEffectsJson || "[]") as Array<{ effectKey: string }>;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("spada").instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === s.inst("spada").instanceId));
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("spada").instanceId)).toBe(true);
  });

  it("leaves the hand card and memory unchanged when the optional activation is declined", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-009", as: "host" }], hand: [{ card: "EX6-037", as: "spada" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const [effect] = JSON.parse(s.inst("spada").activatableEffectsJson || "[]") as Array<{ effectKey: string }>;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("spada").instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("spada").instanceId)).toBe(true);
  });
});
