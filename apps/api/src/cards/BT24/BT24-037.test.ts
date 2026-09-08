import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { irNode } from "../../engine/testkit/irNode.js";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_037 } from "./BT24-037.js";
import "../index.js";

describe("BT24-037 Silphymon", () => {
  it("matches the catalog identity and DNA route", () => {
    expect(getCardDefinition("BT24-037")).toMatchObject({
      cardId: "BT24-037",
      nameEn: "Silphymon",
      colors: ["Yellow", "Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      forms: ["Ultimate"],
      attributes: ["Free"],
      types: ["Beastkin", "Iliad", "TS"],
    });
  });

  it("allows yellow/red or TS level-4-or-lower stack plays", () => {
    const replacements = BT24_037.effects?.filter((entry) => entry.trigger === "AllTurns");
    expect(replacements).toHaveLength(2);
    for (const effect of replacements ?? []) {
      const replacement = effect.actions?.[0] as unknown as {
        leaveCause: string;
        actions: Array<{
          kind: string;
          from: string[];
          fromOwnDigivolutionStack: boolean;
          optional: boolean;
          target: { filter: unknown };
        }>;
      };
      const play = replacement.actions[0]!;
      expect(replacement.leaveCause).toBe("otherThanYourEffect");
      expect(play).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["digivolutionCards"],
        fromOwnDigivolutionStack: true,
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

  it("resolves the On Play DP reduction from a public play intent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-037", as: "silphymon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 7000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("silphymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 2000);

    expect(s.perm("target").currentDP).toBe(2000);
    expect(s.perm("silphymon").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("silphymon").instanceId);
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

  it("accepts the DNA follow-up attack and resolves the exact target deletion", async () => {
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
        1: {
          battleArea: [{ card: "BT1-010", as: "target", suspended: true, dp: 1000 }],
          security: [
            { card: "BT1-013", as: "security" },
            { card: "BT1-015", as: "security2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    s.state.memory = 3;
    await s.ready();
    const targetId = s.perm("target").permanentId;
    const targetCardId = s.inst("target").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("yellow").permanentId, s.perm("red").permanentId],
        instanceId: s.inst("silphymon").instanceId,
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "attackDeclared"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(targetCardId);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("security").instanceId);
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

  it("does not play a neighboring host's eligible source on opponent-effect removal", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-037", as: "departed", dp: 1000, under: [{ card: "ST1-07", as: "ownEligible" }] },
            { card: "BT24-037", as: "neighbor", dp: 13000, under: [{ card: "BT24-035", as: "neighborEligible" }] },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "redSource" }], hand: [{ card: "BT6-095", as: "option" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("neighbor").stack[0]!.instanceId, s.perm("departed").stack[0]!.instanceId);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    const departedId = s.perm("departed").permanentId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === departedId));
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(departedId);
    expect(s.perm("neighbor").stack.map((card) => card.instanceId)).toContain(s.inst("neighborEligible").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("ownEligible").instanceId,
      ),
    ).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
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
