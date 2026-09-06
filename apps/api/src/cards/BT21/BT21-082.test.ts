import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-082.js";
import "../index.js";

describe("BT21-082 Takuya Kanbara", () => {
  it("plays from security, enables paid Hybrid/Hero digivolution, and gates the inherited trigger to opponent security", () => {
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "Security" }));
    const mainAction = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0];
    expect(mainAction).toMatchObject({
      kind: "Digivolve",
      payCost: true,
      target: { filter: { kind: ["Digimon", "Tamer"] } },
      into: { nameOrTrait: [{ tokens: ["Hybrid", "Hero"], match: "trait" }] },
      reduceCostScaling: {
        per: 1,
        unit: "distinctNames",
        filter: { controller: "mine", kind: ["Tamer"], colors: ["Red"] },
      },
    });
    const inherited = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(inherited).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    expect(inherited?.actions[0]).toMatchObject({
      event: "whenSecurityRemoved",
      fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "opponent" },
      actions: [expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true })],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("Q4595 counts itself and evolves into a Hybrid for 1 less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-082", as: "takuya" }],
          hand: [{ card: "BT21-013", as: "agunimon" }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("takuya"));
    await settle(() => s.perm("takuya").topCard.instanceId === s.inst("agunimon").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("resolves the reduced Hybrid evolution at the public start of main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-082", as: "takuya" }],
          hand: [{ card: "BT21-013", as: "agunimon" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("takuya").topCard.instanceId === s.inst("agunimon").instanceId);
    expect(s.perm("takuya").topCard.instanceId).toBe(s.inst("agunimon").instanceId);
    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("counts different red Tamer names once each", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-082", as: "takuya" },
            { card: "BT21-082", as: "duplicate" },
            { card: "BT1-085", as: "tai" },
          ],
          hand: [{ card: "BT21-013", as: "agunimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("takuya").permanentId);
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("takuya"));
    await settle(() => s.perm("takuya").topCard.instanceId === s.inst("agunimon").instanceId);
    expect(s.state.memory).toBe(2);
  });

  it("does not evolve into a non-Hybrid non-Hero card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-082", as: "takuya" }], hand: [{ card: "BT1-009", as: "other" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("takuya"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("other").instanceId)).toBe(true);
  });

  it("inherited watcher plays one red Tamer only for opponent security removal", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-013", as: "host", under: [{ card: "BT21-082", as: "source" }] }],
          hand: [
            { card: "BT1-085", as: "first" },
            { card: "BT10-087", as: "second" },
          ],
          security: ["BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("first").instanceId);

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("first").instanceId)).toBe(true);

    await advance(s.engine).verb.trashFromSecurity(1, 1);
    await settle(() =>
      s.state.players[0]!.battleArea.some((card) => card.topCard.instanceId === s.inst("first").instanceId),
    );
    await advance(s.engine).verb.trashFromSecurity(1, 1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("second").instanceId)).toBe(true);
  });

  it("triggers the inherited Tamer play from a public opponent security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 6000 },
            { card: "BT21-013", as: "host", under: [{ card: "BT21-082", as: "source" }] },
          ],
          hand: [{ card: "BT1-085", as: "tamer" }],
          security: [{ card: "BT1-009", as: "own-security" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { security: [{ card: "BT1-090", as: "opponent-security" }], deck: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 0 &&
        s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT1-085"),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("tamer").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(false);
  });

  it("plays itself from security without paying cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT21-082", as: "takuya" }] } });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("takuya"));
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(0);
  });
});
