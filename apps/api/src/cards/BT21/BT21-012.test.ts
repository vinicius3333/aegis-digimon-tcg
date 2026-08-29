import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-012.js";
import "../index.js";

describe("BT21-012 Flamemon", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("plays a red Tamer with inherited effects by suspending this Digimon, then places it under that Tamer", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "Main",
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: { hasInheritedEffects: true, controller: "mine", kind: ["Tamer"], colors: ["Red"] },
              count: 1,
            },
            from: ["hand"],
            payCost: false,
            cost: {
              kind: "suspend",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              raw: "By suspending this Digimon",
            },
            optional: true,
            abortOnDecline: true,
          },
          {
            kind: "PlaceUnder",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            underFilter: { lastPlayed: true, controllerDefault: "mine", kind: ["Tamer"] },
            condition: { kind: "ifThisEffectActed", raw: "you did" },
          },
        ],
      }),
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "ModifyDP",
            amount: 2000,
            duration: "permanent",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          },
        ],
      }),
    ]);
  });

  it("suspends Flamemon, plays an eligible red Tamer for free, then places Flamemon under it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-012", as: "flamemon" }],
          hand: [{ card: "BT21-082", as: "takuya" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("flamemon").topCard.instanceId,
        effectKey: `BT21-012/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-082"));
    const tamer = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT21-082")!;
    expect(tamer.stack.map((card) => card.instanceId)).toContain(s.inst("flamemon").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(3);
  });

  it("places Flamemon under the Tamer played by this effect, not an existing Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-012", as: "flamemon" },
            { card: "BT1-085", as: "existing" },
          ],
          hand: [{ card: "BT21-082", as: "takuya" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("flamemon").topCard.instanceId,
        effectKey: `BT21-012/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-082"));

    expect(s.perm("takuya").stack.map((card) => card.instanceId)).toContain(s.inst("flamemon").instanceId);
    expect(s.perm("existing").stack.map((card) => card.instanceId)).not.toContain(s.inst("flamemon").instanceId);
  });

  it.each([
    ["a red Tamer without inherited effects", "BT1-085"],
    ["a non-red Tamer with inherited effects", "BT17-083"],
  ])("does not pay the suspension cost for %s", async (_label, tamer) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-012", as: "flamemon" }],
          hand: [{ card: tamer, as: "tamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("flamemon").topCard.instanceId,
      effectKey: `BT21-012/ir-${EffectTiming.OnDeclaration}-0`,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("flamemon").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("may decline without suspending or moving Flamemon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-012", as: "flamemon" }],
          hand: [{ card: "BT21-082", as: "takuya" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("flamemon").topCard.instanceId,
      effectKey: `BT21-012/ir-${EffectTiming.OnDeclaration}-0`,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("flamemon").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("grants inherited +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-013", as: "host", dp: 5000, under: ["BT21-012"] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(7000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(5000);
  });
});
