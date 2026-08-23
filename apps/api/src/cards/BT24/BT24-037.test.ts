import { EffectTiming } from "@aegis/shared";
import { irNode } from "../../engine/testkit/irNode.js";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_037 } from "./BT24-037.js";
import "../index.js";

describe("BT24-037 Silphymon", () => {
  it("allows yellow/red or TS level-4-or-lower stack plays", () => {
    const replacements = BT24_037.effects?.filter((entry) => entry.trigger === "AllTurns");
    expect(replacements).toHaveLength(2);
    for (const effect of replacements ?? []) {
      const play = (effect.actions?.[0] as any).actions?.[0];
      expect((effect.actions?.[0] as any).leaveCause).toBe("otherThanYourEffect");
      expect(play).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["digivolutionCards"],
        fromHost: "self",
        optional: true,
      });
      expect(play.target.filter).toMatchObject({
        levelComparison: { op: "lte", value: 4 },
        or: [{ colors: ["Red", "Yellow"] }, { nameOrTrait: [{ tokens: ["TS"], match: "trait" }] }],
      });
    }
  });
  it("models the conditional DNA attack bonuses", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = BT24_037.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({ kind: "ModifyDP", amount: -5000 });
      expect(actions[2]).toMatchObject({
        kind: "GainKeyword",
        duration: "forTheTurn",
        // The gate is the structured isDnaDigivolving condition, which evaluateCondition reads;
        // a "raw" kind would be treated as unmet and the bonus would never apply.
        condition: { kind: "isDnaDigivolving", raw: "DNA digivolving" },
      });
      expect(irNode(actions[3]!).target).toMatchObject({ sameTarget: true });
    }
  });

  it("declares the yellow level-4 plus red level-4 DNA route", () => {
    expect(BT24_037.dnaDigivolveRequirement).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Yellow", level: 4 },
          { color: "Red", level: 4 },
        ],
      },
    ]);
  });

  it("applies -5000 DP and may decline the following attack (Q5616, Q5617)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-037", as: "silphymon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("silphymon"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("silphymon").isSuspended).toBe(false);
  });

  it("DNA digivolves for 0 and grants +5000 DP and Security Attack to the same Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-035", as: "yellow" },
            { card: "BT24-011", as: "red" },
            { card: "BT24-034", as: "buffed" },
          ],
          hand: [{ card: "BT24-037", as: "silphymon" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 10000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId, s.perm("buffed").topCard.instanceId);
    s.state.memory = 3;
    await s.ready();
    const before = s.perm("buffed").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("yellow").permanentId, s.perm("red").permanentId],
        instanceId: s.inst("silphymon").instanceId,
      } as never),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-037") &&
        s.perm("buffed").currentDP === before + 5000,
      5000,
    );

    expect(s.state.memory).toBe(3);
    expect(s.perm("buffed").currentDP).toBe(before + 5000);
    expect(observe(s.engine).keywordAmount(s.perm("buffed"), "SecurityAttack")).toBe(1);
  });

  it("plays only a qualifying level-4 card from its own stack on opponent-effect removal (Q5618)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-037", as: "silphymon", under: [{ card: "BT24-027", as: "ownTarget" }] },
            { card: "BT24-037", as: "other", under: [{ card: "BT24-027", as: "otherTarget" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("silphymon").permanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("ownTarget").instanceId,
      ),
    );

    expect(s.perm("other").stack.map((card) => card.instanceId)).toContain(s.inst("otherTarget").instanceId);
  });

  it("does not play a source when removed by its owner's effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-037", as: "silphymon", under: [{ card: "BT24-027", as: "source" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("silphymon").permanentId], "byEffect")).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
  });

  it("uses the inherited leave effect to play a qualifying card from its host's stack (Q5619)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-026",
              as: "host",
              under: [{ card: "BT24-027", as: "played" }, "BT24-037"],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId),
    );

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT24-027");
  });
});
