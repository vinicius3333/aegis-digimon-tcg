import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-032.js";

describe("BT22-032 ShoeShoemon", () => {
  it("plays a level-3 Puppet from hand on deletion and applies inherited -2000 DP", () => {
    const onDeletion = compiled.effects.find((entry) => entry.trigger === "OnDeletion");
    expect(onDeletion?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          levels: [3],
          nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }],
        },
        count: 1,
      },
    });
    const inherited = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(inherited).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
  });

  it("plays exactly one level-3 Puppet free from a mixed hand on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-032", as: "shoeShoemon" }],
          hand: [
            { card: "ST19-03", as: "eligible" },
            { card: "ST19-06", as: "wrongLevel" },
            { card: "BT22-024", as: "wrongTrait" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeletion, s.perm("shoeShoemon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST19-03"));

    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "ST19-03")).toHaveLength(
      1,
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("wrongLevel").instanceId,
      s.inst("wrongTrait").instanceId,
    ]);
  });

  it("allows the optional deletion play to be refused", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-032", as: "shoeShoemon" }],
          hand: [{ card: "ST19-03", as: "eligible" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();

    const resolution = advance(s.engine).fire(EffectTiming.OnDeletion, s.perm("shoeShoemon"));
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

  it("applies inherited -2000 DP once per turn from a realistic Puppet stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-036", under: ["BT22-032"], as: "host" }] },
        1: {
          battleArea: [
            { card: "BT22-024", as: "firstTarget" },
            { card: "BT22-024", as: "secondTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const firstDP = s.perm("firstTarget").currentDP;
    const secondDP = s.perm("secondTarget").currentDP;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle();

    expect(s.perm("firstTarget").currentDP).toBe(firstDP - 2000);
    expect(s.perm("secondTarget").currentDP).toBe(secondDP);
  });
});
