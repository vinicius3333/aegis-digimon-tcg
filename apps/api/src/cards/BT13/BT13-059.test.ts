import { dnaDigivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-059.js";
import { dnaDigivolveCostFor } from "../../engine/effects/primitives.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-059 Examon", () => {
  it("keeps DNA materials, same-target unsuspend restriction, and the once-per-turn modal", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.dnaDigivolveRequirement).toContainEqual(
      expect.objectContaining({
        cost: 4,
        materials: [{ namesExact: ["Slayerdramon"] }, { namesExact: ["Breakdramon"] }],
      }),
    );
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: expect.arrayContaining([expect.objectContaining({ kind: "Suspend" })]),
    });
    for (const effect of compiled.effects.slice(0, 2)) {
      expect(effect.actions).toEqual([
        { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
        {
          kind: "Restrict",
          restriction: "unsuspend",
          duration: "untilOpponentNextUnsuspendPhase",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, sameTarget: true },
        },
      ]);
    }
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenSuspended",
          actions: [expect.objectContaining({ kind: "Modal", choose: 1, optional: true })],
        }),
      ],
    });
  });

  it("suspends an opponent Digimon on play and keeps the selected target restricted", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT13-059", as: "examon" }] }, 1: { battleArea: [{ card: "BT1-015", as: "target" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 30;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("examon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended, 3000);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("uses exact named DNA materials and enters unsuspended", async () => {
    expect(dnaDigivolutionRequirementsFor("BT13-059")).toEqual([
      { cost: 4, materials: [{ namesExact: ["Slayerdramon"] }, { namesExact: ["Breakdramon"] }] },
    ]);
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-027", as: "slayer" }, { card: "BT1-026", as: "breaker" }],
        hand: [{ card: "BT13-059", as: "examon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("slayer").permanentId, s.perm("breaker").permanentId],
        instanceId: s.inst("examon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-059"));
    const result = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT13-059")!;
    expect(result.isSuspended).toBe(false);
  });

  it("rejects DNA materials whose names only extend Slayerdramon or Breakdramon", () => {
    const evolving = getCardDefinition("BT13-059")!;
    const slayer = getCardDefinition("BT20-027")!;
    const breaker = getCardDefinition("BT1-026")!;

    expect(dnaDigivolveCostFor(evolving, [{ ...slayer, nameEn: "Slayerdramon (X Antibody)" }, breaker])).toBeUndefined();
    expect(dnaDigivolveCostFor(evolving, [slayer, { ...breaker, nameEn: "Breakdramon: X Antibody" }])).toBeUndefined();
  });

  it("resolves the All Turns optional modal from the natural On Play suspension event", async () => {
    const preferredTargets: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-059", as: "examon" }, { card: "BT1-015", as: "ally", suspended: true }] },
        1: { battleArea: [{ card: "BT1-015", as: "opponent" }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferInstanceIds: preferredTargets,
        preferOptionIndex: 1,
      },
    );
    preferredTargets.push(s.perm("ally").permanentId);
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("examon"));

    expect(s.decisions.some((decision) => decision.req.kind === "chooseOption")).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("ally").isSuspended).toBe(false);
  });
});
