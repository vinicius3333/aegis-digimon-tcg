import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-023.js";
import "../index.js";

describe("BT21-023 Globemon", () => {
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

  it("links a level 4 or lower Digimon from the default hand/stack zones and deletes an equal-or-lower DP opponent once per turn", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
      }),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects).toContainEqual(
        expect.objectContaining({
          trigger,
          actions: [
            {
              kind: "Link",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  levelComparison: { op: "lte", value: 4 },
                  hasLinkRequirement: true,
                  or: [{ zone: "hand" }, { zone: "digivolutionCards", hostFilter: { isSelfRef: true } }],
                },
                count: 1,
              },
              from: ["hand", "digivolutionCards"],
              payCost: false,
              optional: true,
            },
          ],
        }),
      );
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenLinked",
            sourceFilter: { isSelfRef: true },
            actions: [
              {
                kind: "Delete",
                target: {
                  filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
                  count: 1,
                },
              },
            ],
          },
        ],
      }),
    );
    expect(compiled.appFusionRequirement).toEqual([{ names: ["DoGatchmon", "Timemon"], cost: 0 }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenLinking",
        isLinked: true,
        actions: [
          expect.objectContaining({
            kind: "Delete",
            target: { filter: expect.objectContaining({ controller: "opponent" }), count: 1 },
          }),
        ],
      }),
    );
  });

  it("links a legal level-4 card for free on play and preserves the 9-cost play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT21-023", as: "globemon" },
            { card: "BT21-018", as: "link" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("globemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => {
      const globemon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT21-023");
      return globemon?.linked.some((card) => card.instanceId === s.inst("link").instanceId) ?? false;
    });
    expect(s.state.memory).toBe(1);
    const globemon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT21-023")!;
    expect(globemon.currentDP).toBe(13000);
  });

  it("publicly App Fuses DoGatchmon and Timemon into Globemon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-018", as: "host", linked: [{ card: "BT21-059", as: "timemon" }] }],
          hand: [{ card: "BT21-023", as: "globemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    await advance(s.engine).verb.appFuseInto(s.perm("host").permanentId, s.inst("globemon").instanceId);
    await settle(() => s.perm("host").topCard.cardId === "BT21-023");
    expect(s.perm("host").topCard.cardId).toBe("BT21-023");
  });

  it("rejects linkless and level-5 cards and permits declining a legal link", async () => {
    for (const [card, options] of [
      ["BT1-009", { autoAcceptOptional: true, autoSelectCards: true }],
      ["BT21-023", { autoAcceptOptional: true, autoSelectCards: true }],
      ["BT21-018", { autoDeclineOptional: true }],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "BT21-023", as: "globemon" },
              { card, as: "candidate" },
            ],
          },
        },
        options,
      );
      s.state.memory = 10;
      await s.ready();
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("globemon").instanceId });
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-023"));
      const globemon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT21-023")!;
      expect(globemon.linked).toHaveLength(0);
      expect(s.state.players[0]!.hand.map((candidate) => candidate.instanceId)).toContain(
        s.inst("candidate").instanceId,
      );
    }
  });

  it("deletes only an equal-or-lower DP target once when its own stack is linked", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-023", as: "globemon", dp: 10000 }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "equal", dp: 10000 },
            { card: "BT1-010", as: "higher", dp: 11000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("globemon").permanentId });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("higher").permanentId);
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("globemon").permanentId });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("links only this Globemon's qualifying stack card, not another Digimon's stack card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-023", as: "globemon", under: [{ card: "BT21-018", as: "ownLink" }] },
            { card: "BT1-009", as: "otherHost", under: [{ card: "BT21-018", as: "otherLink" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("globemon"));
    await settle(() => s.perm("globemon").linked.length === 1);

    expect(s.perm("globemon").linked[0]?.instanceId).toBe(s.inst("ownLink").instanceId);
    expect(s.perm("otherHost").stack.map((card) => card.instanceId)).toContain(s.inst("otherLink").instanceId);
  });
});
