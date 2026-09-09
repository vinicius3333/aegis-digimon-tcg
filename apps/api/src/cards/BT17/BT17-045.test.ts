import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-045.js";
import "./index.js";

describe("BT17-045 Argomon", () => {
  it("matches the catalog identity and alternate Argomon evolution", () => {
    expect(getCardDefinition("BT17-045")).toMatchObject({
      cardId: "BT17-045",
      nameEn: "Argomon",
      colors: ["Green", "Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Green", level: 3, memoryCost: 3 },
        { color: "Purple", level: 3, memoryCost: 3 },
      ],
      effectText:
        "[Digivolve]Lv.3 [Argomon]: Cost 2 \n\n[When Digivolving] If you don't have [Rhythm], you may play 1 [Rhythm] from your hand without paying the cost.",
      inheritedEffectText: "[On Deletion] Gain 1 memory.",
    });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Argomon"], level: 3, cost: 2, isAlternate: true }]);
  });

  it("may play Rhythm from hand when no Rhythm is in play after digivolving", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Rhythm"], match: "nameExact" }] }, count: 1 },
      condition: {
        kind: "youHaveNone",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Rhythm"], match: "nameExact" }] },
      },
    });
  });

  it("gains one memory on deletion as an inherited effect", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
  });

  it("uses the alternate Argomon route for cost 2, keeps the source stack, draws and plays Rhythm", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-042", as: "base" }],
          hand: [
            { card: "BT17-045", as: "argomon" },
            { card: "BT17-089", as: "rhythm" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [{ card: "BT1-010", as: "bonus" }, "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    const baseId = s.inst("base").instanceId;
    const argomonId = s.inst("argomon").instanceId;
    const rhythmId = s.inst("rhythm").instanceId;
    const bonusId = s.inst("bonus").instanceId;
    const permanentId = s.perm("base").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: argomonId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === rhythmId));

    // Alternate route: Cost 2, not the printed evoCost 3.
    expect(s.state.memory).toBe(0);
    const host = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === permanentId)!;
    expect(host.topCard?.instanceId).toBe(argomonId);
    expect(host.stack.map((card) => card.instanceId)).toEqual([baseId]);
    // Digivolve bonus draw plus the free Rhythm leaving hand: only the spare remains.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId, bonusId]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(
      s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === rhythmId)!.stack,
    ).toHaveLength(0);
  });

  it("also digivolves by the printed Lv.3 Green route for cost 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-042", as: "base" }],
          hand: [
            { card: "BT17-045", as: "argomon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const argomonId = s.inst("argomon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: argomonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === argomonId);

    expect(s.state.memory).toBe(0);
    // No Rhythm in hand: the optional play finds nothing and nothing else moves.
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("refuses an illegal source that matches neither the printed nor the alternate route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "redRookie" }],
        hand: [
          { card: "BT17-045", as: "argomon" },
          { card: "BT1-010", as: "spare" },
        ],
        deck: ["BT1-011"],
      },
    });
    s.state.memory = 5;
    const argomonId = s.inst("argomon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redRookie").permanentId,
        instanceId: argomonId,
      }),
    ).toMatchObject({ ok: false });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redRookie").permanentId,
        instanceId: argomonId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === argomonId)).toBe(true);
    expect(s.perm("redRookie").topCard?.cardId).toBe("BT1-009");
  });

  it("does not play a second Rhythm when a Rhythm is already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-042", as: "base" },
            { card: "BT17-089", as: "existingRhythm" },
          ],
          hand: [
            { card: "BT17-045", as: "argomon" },
            { card: "BT17-089", as: "secondRhythm" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [{ card: "BT1-010", as: "bonus" }, "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    const argomonId = s.inst("argomon").instanceId;
    const secondRhythmId = s.inst("secondRhythm").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: argomonId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.instanceId === argomonId &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("bonus").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === secondRhythmId)).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT17-089")).toHaveLength(
      1,
    );
  });

  it("gains inherited memory when its host is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-048", under: ["BT17-045"], as: "host" }] },
    });
    s.state.memory = 0;
    const permanentId = s.perm("host").permanentId;

    await advance(s.engine).verb.deletePermanent([permanentId], "byEffect");
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT17-045", "BT17-048"]);
  });
});
