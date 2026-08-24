import { describe, expect, it } from "vitest";
import { assemblyRequirementFor, digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-047.js";
import "../index.js";

describe("BT26-047 TyrantKabuterimon", () => {
  it("encodes immediate optional battle and the suspend-paid Option immunity/DP effect in every printed window", () => {
    expect(digivolutionRequirementsFor("BT26-047")).toContainEqual({
      level: 5,
      traits: ["Insectoid", "TS"],
      cost: 3,
      isAlternate: true,
    });
    expect(assemblyRequirementFor("BT26-047")).toEqual([
      { reduceCost: 6, materials: [{ traits: ["Larva", "Insectoid", "Titan"], count: 4, differentLevels: true }] },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effects = compiled.effects?.filter((effect) => effect.trigger === trigger) ?? [];
      expect(effects).toHaveLength(2);
      expect(effects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            actions: [{ kind: "Battle", optional: true, attacker: expect.any(Object), defender: expect.any(Object) }],
          }),
          expect.objectContaining({
            actions: [
              expect.objectContaining({
                kind: "CostGatedBlock",
                cost: { kind: "suspend", target: expect.any(Object) },
                actions: [
                  expect.objectContaining({ kind: "Restrict", restriction: "beAffected", fromSourceKind: ["Option"] }),
                  expect.objectContaining({ kind: "ModifyDP", amount: 3000 }),
                ],
              }),
            ],
          }),
        ]),
      );
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [{ kind: "CostGatedBlock", cost: { kind: "suspend" } }],
    });
  });

  it("publicly buffs suspended Insectoid or Titan Digimon and protects them from opposing Options", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-047", as: "tyrant" },
            { card: "BT26-045", as: "eligible", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tyrant"));

    expect(s.perm("eligible").currentDP).toBe(14000);
    const continuous = (
      s.engine as unknown as { continuous: { hasRestriction: (id: string, kind: string, source?: string) => boolean } }
    ).continuous;
    expect(continuous.hasRestriction(s.perm("eligible").permanentId, "beAffected", "Option")).toBe(true);
  });

  it("offers the two simultaneous On Play effects for ordering (Q7043)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-047", as: "tyrant" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );

    const resolving = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("tyrant"));
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const pending = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    const keys = request.options?.triggerKeys ?? [];
    expect(keys).toHaveLength(2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "orderTriggers", order: [keys[1]!] },
      }),
    ).toEqual({ ok: true });
    await resolving;
  });
});
