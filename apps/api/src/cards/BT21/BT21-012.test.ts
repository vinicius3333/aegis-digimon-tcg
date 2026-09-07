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
            cost: {
              kind: "suspend",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              raw: "By suspending this Digimon",
            },
            abortOnDecline: true,
            kind: "CostGatedBlock",
            actions: [
              expect.objectContaining({ kind: "PlayWithoutCost", optional: true }),
              expect.objectContaining({ kind: "PlaceUnder" }),
            ],
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
  ])("pays suspension cost even when play fails for %s", async (_label, tamer) => {
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
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("flamemon").topCard.instanceId,
        effectKey: `BT21-012/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("flamemon").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("may decline the inner play after paying suspension, leaving Flamemon suspended", async () => {
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
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("flamemon").topCard.instanceId,
        effectKey: `BT21-012/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("flamemon").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("pays the mandatory suspension cost even when no eligible Tamer exists", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT21-012", as: "flamemon" }] } }, { autoAcceptOptional: true });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("flamemon").topCard.instanceId,
        effectKey: `BT21-012/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("flamemon").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("rejects activation when Flamemon is already suspended", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT21-012", as: "flamemon", suspended: true }] } });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("flamemon").topCard.instanceId,
        effectKey: `BT21-012/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("flamemon").isSuspended).toBe(true);
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

  it("gets inherited DP only after a legal public evolution carries Flamemon under a level 4 host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-001", as: "egg" }],
        hand: [
          { card: "BT21-012", as: "flamemon" },
          { card: "BT21-015", as: "host" },
        ],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("flamemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT21-012");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT21-015");
    expect(s.perm("egg").currentDP).toBe(7000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("egg").currentDP).toBe(5000);
  });
});
