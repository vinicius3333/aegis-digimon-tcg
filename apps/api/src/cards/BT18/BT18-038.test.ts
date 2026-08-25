import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT18-038.js";

describe("BT18-038 ArkhaiAngemon", () => {
  it("gains the Angel trait and resolves its security placement path", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-038", as: "arkhai" }],
          hand: ["BT1-063"],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasEffectiveTrait(s.perm("arkhai"), "Angel")).toBe(true);
    await advance(s.engine).fireForInstance(EffectTiming.OnPlay, s.perm("arkhai").topCard!);

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT1-063")).toBe(true);
    assertNoLoudGap(s);
  });

  it("may decline the bottom placement but must still take top security when starting at 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-038", as: "arkhai" }],
          hand: [{ card: "BT1-063", as: "declinedAngel" }],
          security: [{ card: "BT1-009", as: "topSecurity" }, "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.OnPlay, s.perm("arkhai").topCard!);

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("topSecurity").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("declinedAngel").instanceId)).toBe(
      true,
    );
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("uses the Angel-trait alternate requirement to evolve from a blue level 4 for 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-023", as: "blueAngel" }],
        hand: [{ card: "BT18-038", as: "arkhai" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueAngel").permanentId,
        instanceId: s.inst("arkhai").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blueAngel").topCard?.instanceId === s.inst("arkhai").instanceId);

    expect(s.state.memory).toBe(2);
    expect(s.perm("blueAngel").stack.map(({ cardId }) => cardId)).toEqual(["BT3-023"]);
    assertNoLoudGap(s);
  });

  it("recovers the exact deck card when a host carrying its inherited effect is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-063", as: "host", under: ["BT18-038"] }],
        security: [{ card: "BT1-009", as: "oldSecurity" }],
        deck: [{ card: "BT1-010", as: "recovered" }],
      },
    });
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId])).toBe(1);

    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("recovered").instanceId);
    expect(s.state.players[0]!.security[1]!.instanceId).toBe(s.inst("oldSecurity").instanceId);
    assertNoLoudGap(s);
  });
});
