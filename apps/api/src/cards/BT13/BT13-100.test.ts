import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-100.js";

describe("BT13-100 BT13-100", () => {
  it("matches Yoshino Fujieda's turn and security effects", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", controller: "mine", value: 2 } }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              { match: "traitContains", tokens: ["Vegetation"] },
              { match: "traitContains", tokens: ["Plant"] },
              { match: "traitContains", tokens: ["Fairy"] },
            ],
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                optional: true,
              },
              abortOnDecline: true,
            },
          ],
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    });
  });

  it("loads the compiled implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-100", as: "card" }] } });
    await s.ready();
    expect(s.perm("card").topCard?.cardId).toBe("BT13-100");
  });

  it("suspends Yoshino and gains memory after a natural qualifying evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-100", as: "yoshino" },
            { card: "BT1-065", as: "base" },
          ],
          hand: [{ card: "BT1-071", as: "vegiemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const baseId = s.inst("base").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("vegiemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("vegiemon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.perm("yoshino").isSuspended).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("declining the suspend cost leaves Yoshino active and grants no memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-100", as: "yoshino" },
            { card: "BT1-065", as: "base" },
          ],
          hand: [{ card: "BT1-071", as: "vegiemon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const baseId = s.inst("base").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("vegiemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("vegiemon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.perm("yoshino").isSuspended).toBe(false);
    expect(s.state.memory).toBe(2);
  });
});
