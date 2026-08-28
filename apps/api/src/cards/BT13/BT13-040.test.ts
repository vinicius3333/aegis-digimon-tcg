import { describe, expect, it } from "vitest";
import { definitionOf } from "../../engine/cards/cardData.js";
import { compiled } from "./BT13-040.js";
import { advance } from "../../engine/testkit/advance.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-040 Magnamon", () => {
  it("keeps both bracketed Veemon references exact", () => {
    const play = compiled.effects[1]!.actions[0] as unknown as {
      actions: [{ target: { filter: { or: [{ nameOrTrait: [{ tokens: string[]; match: string }] }] } } }];
    };
    const branches = play.actions[0].target.filter.or;
    const handReference = branches[0]!.nameOrTrait[0]!;
    const stackReference = branches[1]!.nameOrTrait[0]!;

    expect(handReference).toEqual({ tokens: ["Veemon"], match: "nameExact" });
    expect(stackReference).toEqual({ tokens: ["Veemon"], match: "nameExact" });
    expect(matchNameOrTrait(definitionOf("BT12-021"), handReference as never)).toBe(true);
    expect(matchNameOrTrait(definitionOf("BT12-022"), handReference as never)).toBe(false);
  });

  it("keeps Blocker and replaces leaving play with draw plus optional Veemon play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [expect.objectContaining({ keyword: "Blocker" })],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          actions: [
            { kind: "Draw", controller: "mine", amount: 1 },
            {
              kind: "PlayWithoutCost",
              from: ["hand", "digivolutionCards"],
              payCost: false,
              optional: true,
              target: {
                filter: {
                  controller: "mine",
                  or: [
                    { zone: "hand", nameOrTrait: [{ match: "nameExact", tokens: ["Veemon"] }] },
                    {
                      zone: "digivolutionCards",
                      nameOrTrait: [{ match: "nameExact", tokens: ["Veemon"] }],
                      hostFilter: { isSelfRef: true },
                    },
                  ],
                },
                count: 1,
              },
            },
          ],
        },
      ],
    });
  });

  it("exposes Blocker on the live Magnamon permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-040", as: "magna" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("magna"), "Blocker")).toBe(true);
  });

  it("does not draw or offer a Veemon play merely from continuous recomputation", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-040", as: "magna", under: ["BT12-021"] }],
          hand: ["BT12-021"],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await s.engine.recomputeContinuousEffects();
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
  });

  it("draws, plays Veemon from its sources for free, then still leaves the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-040", as: "magna", under: [{ card: "BT12-021", as: "source-veemon" }] }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const magnaId = s.perm("magna").topCard.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("magna").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT12-021"));

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === magnaId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("source-veemon").instanceId)).toBe(
      false,
    );
  });

  it("plays an existing Veemon from hand when leaving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-040", as: "magna" }],
          hand: [{ card: "BT12-021", as: "hand-veemon" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("magna").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("hand-veemon").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("hand-veemon").instanceId)).toBe(
      true,
    );
  });

  it("may play a Veemon drawn by the preceding mandatory draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-040", as: "magna" }],
          deck: [{ card: "BT12-021", as: "drawn-veemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("magna").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("drawn-veemon").instanceId));
    expect(
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("drawn-veemon").instanceId),
    ).toBe(true);
  });

  it("does not offer a Veemon from another Digimon's sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-040", as: "magna" },
            { card: "BT13-041", as: "other-host", under: [{ card: "BT12-021", as: "wrong-host-veemon" }] },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("magna").permanentId]);
    expect(s.perm("other-host").stack.some(({ instanceId }) => instanceId === s.inst("wrong-host-veemon").instanceId)).toBe(
      true,
    );
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
  });

  it("may decline the Veemon play after drawing and Magnamon still leaves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-040", as: "magna" }],
          hand: [{ card: "BT12-021", as: "veemon" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("magna").permanentId]);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("veemon").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("alternately digivolves from Veemon for 3 and normally from yellow level 3 for 4", async () => {
    for (const [baseCardId, alternate, expectedMemory] of [
      ["BT12-021", true, 2],
      ["BT13-036", false, 1],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "BT13-040", as: "magna" }] },
      });
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("magna").instanceId,
          ...(alternate ? { alternateRequirementIndex: 0 } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT13-040");
      expect(s.state.memory).toBe(expectedMemory);
    }
  });

  it("requires the exact Veemon name for its alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Veemon"], cost: 3, isAlternate: true }]);
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-022", as: "exveemon" }], hand: [{ card: "BT13-040", as: "magna" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("exveemon").permanentId,
        instanceId: s.inst("magna").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
  });

  it("rejects the alternate evolution from a non-Veemon", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-036", as: "base" }], hand: [{ card: "BT13-040", as: "magna" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magna").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
  });
});
