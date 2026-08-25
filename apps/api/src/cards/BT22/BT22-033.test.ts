import { describe, expect, it } from "vitest";
import { EffectTiming, appFusionCostFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-033.js";

describe("BT22-033 Mediamon", () => {
  it("keeps App Fusion, -4000 DP triggers, and both linked play effects", () => {
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Musimon", "Recomon", "Mcmon"], cost: 0 }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -4000,
        duration: "forTheTurn",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          triggerFilter: { isSelfRef: true },
          actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
        },
      ],
    });
    const whenAttacking = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(whenAttacking).toMatchObject({ isLinked: true });
    expect(whenAttacking?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          levels: [3],
          nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
        },
        count: 1,
      },
    });
  });

  it("implements all six Q5214 App Fusion arrangements and rejects duplicate materials", () => {
    for (const topName of ["Musimon", "Recomon", "Mcmon"]) {
      for (const linkedName of ["Musimon", "Recomon", "Mcmon"]) {
        expect(appFusionCostFor("BT22-033", { topName, linkedNames: [linkedName] })).toBe(
          linkedName === topName ? undefined : 0,
        );
      }
    }
  });

  it("applies -4000 DP through both printed timings", async () => {
    for (const timing of [EffectTiming.OnPlay, EffectTiming.WhenDigivolving]) {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT22-033", as: "mediamon" }] },
          1: { battleArea: [{ card: "BT22-024", as: "opponent" }] },
        },
        { autoSelectCards: true },
      );
      await s.ready();
      const originalDP = s.perm("opponent").currentDP;

      await advance(s.engine).fire(timing, s.perm("mediamon"));
      await settle(() => s.perm("opponent").currentDP === originalDP - 4000);

      expect(s.perm("opponent").currentDP).toBe(originalDP - 4000);
    }
  });

  it("plays exactly one level-3 Appmon free when Mediamon itself gets linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-033", as: "mediamon" }],
          hand: [
            { card: "BT21-009", as: "link" },
            { card: "BT22-030", as: "eligible" },
            { card: "BT22-033", as: "wrongLevel" },
            { card: "BT22-019", as: "wrongTrait" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("mediamon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-030"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("wrongLevel").instanceId,
      s.inst("wrongTrait").instanceId,
    ]);
  });

  it("does not react to another stack getting linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-033", as: "mediamon" },
            { card: "BT22-032", as: "other" },
          ],
          hand: [{ card: "BT22-030", as: "eligible" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("other").permanentId });

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("eligible").instanceId]);
  });

  it("uses the Link face from a realistic host and allows its optional play to be refused", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-035", linked: [{ card: "BT22-033", as: "mediamon" }], as: "host" }],
          hand: [{ card: "BT22-030", as: "eligible" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();

    const resolution = advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolution;

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("eligible").instanceId]);
  });
});
