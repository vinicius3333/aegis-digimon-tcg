import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import "../cards/index.js";
import { setupEngine, settle, assertNoLoudGap } from "./testkit/harness.js";
import { advance } from "./testkit/advance.js";

describe("deck card truth: newly executable complex effects", () => {
  it("EX5-048 binds the selected opponent Digimon and grants its timed attack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-048", as: "source" }],
          battleArea: [{ card: "BT1-009", suspended: true, as: "attackTarget" }],
          deck: ["BT1-028", "BT1-028", "BT1-028"],
        },
        1: { battleArea: [{ card: "BT1-028", dp: 5000, as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 50;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => false, 100);
    expect(s.perm("victim").currentDP).toBe(2000);
    expect(s.perm("victim").isSuspended).toBe(false);

    s.state.turnSeat = 1;
    void (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnStartMainPhase,
    );
    await settle(() => s.perm("victim").isSuspended, 150);
    expect(s.perm("victim").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("EX6-021 pays its security-to-hand cost once before both nested effects", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX6-021", as: "source" }, "BT1-053"],
          security: ["BT1-090", "BT1-090"],
          battleArea: [{ card: "BT1-009", as: "victim", dp: 7000 }],
        },
        1: { battleArea: [{ card: "BT1-028", as: "opponent", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 50;
    const securityBefore = s.state.players[0]!.security.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => false, 120);
    expect(s.state.players[0]!.security.length).toBe(securityBefore - 1);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-090")).toBe(true);
    expect(s.perm("opponent").currentDP).toBe(3000);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT1-053")).toBe(true);
    assertNoLoudGap(s);
  });

  it("BT23-059 reacts when an Option permanent is actually trashed from the field", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-059", as: "justimon", suspended: true }] },
      1: { battleArea: [{ card: "BT25-100", as: "option" }] },
    });
    await advance(s.engine).verb.trash([s.perm("option").topCard.instanceId], 0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT25-100")).toBe(false);
    expect(s.perm("justimon").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("ST15-12 unsuspends for an effect-driven security removal", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST15-12", as: "wargreymon", suspended: true }], security: ["BT1-090"] } },
      { autoAcceptOptional: true },
    );
    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    expect(s.perm("wargreymon").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("EX5-034 binds one opponent target and applies both suspended-trigger effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-034", as: "bancho" },
            { card: "BT1-009", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT1-028", dp: 7000, as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await settle(() => s.perm("victim").currentDP === 3000, 200);

    expect(s.perm("victim").currentDP).toBe(3000);
    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("victim").permanentId, "SecurityAttack")).toBe(true);
    assertNoLoudGap(s);
  });

  it("BT18-034 routes its shared On Play/Start Main clause to both real timings", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-034", as: "lucemon" }, { card: "BT1-009", as: "payment" }],
          security: ["BT1-090", "BT1-090"],
        },
        1: { security: ["BT1-090", "BT1-090"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 50;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lucemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId), 200);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

});
