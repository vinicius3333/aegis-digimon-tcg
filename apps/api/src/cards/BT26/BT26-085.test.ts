import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-085.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT26-085 compiled behavior", () => {
  it("proves Assembly's five different-level Chronomon-text-or-Shaman materials and keywords", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.assemblyRequirement).toEqual([
      {
        reduceCost: 5,
        materials: [
          {
            count: 5,
            differentLevels: true,
            nameOrTrait: [
              { tokens: ["Chronomon"], match: "text" },
              { tokens: ["Shaman"], match: "trait" },
            ],
          },
        ],
      },
    ]);
    expect(compiled.keywords).toEqual([
      { keyword: "Collision", raw: "＜Collision＞" },
      { keyword: "Reboot", raw: "＜Reboot＞" },
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
  });

  it("protects DP and the evolution stack, then replaces leaving with a free Destroy Mode digivolution", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions).toEqual([
      expect.objectContaining({
        kind: "Restrict",
        restriction: "dpImmune",
        duration: "untilOpponentTurnEnd",
        byOpponentEffectsOnly: true,
      }),
      expect.objectContaining({ kind: "StackTrashLock", duration: "untilOpponentTurnEnd" }),
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      mode: "prevent",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Digivolve",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: { isSelf: true },
          into: { nameOrTrait: [{ tokens: ["Chronomon: Destroy Mode"], match: "nameExact" }] },
        },
      ],
    });
  });

  it("plays by Assembly with five matching cards at five different levels", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-085", as: "giantSlayer" }],
        trash: [
          { card: "BT26-001", as: "level2" },
          { card: "BT26-009", as: "level3" },
          { card: "BT26-011", as: "level4" },
          { card: "BT26-015", as: "level5" },
          { card: "BT26-016", as: "level6" },
        ],
      },
    });
    s.state.memory = 7;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("giantSlayer").instanceId,
        assembly: {
          materialInstanceIds: ["level2", "level3", "level4", "level5", "level6"].map(
            (alias) => s.inst(alias).instanceId,
          ),
        },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT26-085"));

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT26-085");
    expect(new Set(played?.stack.map(({ cardId }) => cardId))).toEqual(
      new Set(["BT26-001", "BT26-009", "BT26-011", "BT26-015", "BT26-016"]),
    );
    expect(s.state.memory).toBe(0);
  });

  it("installs the opponent DP immunity restriction on play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-085", as: "giantSlayer" }] } });

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("giantSlayer"));

    expect(observe(s.engine).isRestricted(s.perm("giantSlayer"), "dpImmune")).toBe(true);
  });

  it("replaces leaving with a free Destroy Mode digivolution from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-085", as: "giantSlayer" }],
          hand: [{ card: "BT26-060", as: "destroyMode" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("giantSlayer").permanentId], "byEffect")).toBe(0);
    await settle(() => s.perm("giantSlayer").topCard.cardId === "BT26-060");

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
