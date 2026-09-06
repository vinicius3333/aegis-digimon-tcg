import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-029.js";
import "../index.js";

describe("BT21-029 compiled implementation", () => {
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

  it("shares one once-per-turn delete budget and places Petrification for either opponent event", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "SecurityAttack", amount: 1 }],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Progress" }] });
    const deleteEffects = compiled.effects.filter((effect) =>
      ["WhenDigivolving", "EndOfAttack"].includes(effect.trigger),
    );
    expect(deleteEffects).toHaveLength(2);
    expect(
      deleteEffects.every((effect) => effect.frequency === "OncePerTurn" && effect.sharedUseKey === "ir-shared-0"),
    ).toBe(true);
    const tokenEffect = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(tokenEffect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          actions: [
            {
              kind: "PlayToken",
              tokens: ["Petrification Token"],
              count: 1,
              payCost: false,
              controller: "mine",
              placedAs: "opponentDigimon",
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          actions: [
            {
              kind: "PlayToken",
              tokens: ["Petrification Token"],
              count: 1,
              payCost: false,
              controller: "mine",
              placedAs: "opponentDigimon",
            },
          ],
        },
      ],
    });
  });

  it("exposes Security Attack +1 and Progress", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT21-029", as: "medusamon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("medusamon"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("medusamon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("medusamon"), "Progress")).toBe(true);
  });

  it("evolves from a red level 5, may delete exactly one lowest-DP Digimon, and pays 4", async () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, colors: ["Red"], cost: 4, isAlternate: false }]);
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-024", as: "base", under: ["BT21-014"] }],
          hand: [{ card: "BT21-029", as: "medusamon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 3000 },
            { card: "BT1-010", as: "high", dp: 4000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("medusamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT21-029");
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowId));

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT21-014", "BT21-024"]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(highId);
  });

  it("may decline the deletion and preserves every opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-029", as: "medusamon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("medusamon"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("target").permanentId,
    );
  });

  it("uses one shared delete activation across digivolution and end of attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-024", as: "base" }],
          hand: [{ card: "BT21-029", as: "medusamon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 2000 },
            { card: "BT1-010", as: "second", dp: 3000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const firstId = s.perm("first").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("medusamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstId));
    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("base"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("second").permanentId,
    );
    expect(
      s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard.cardId === "TOKEN-Petrification-Token"),
    ).toHaveLength(1);
  });

  it("plays a token from a real opponent Digimon deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-029", as: "medusamon", dp: 12000 }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 1000, suspended: true }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("medusamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId.startsWith("TOKEN-Petrification")));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-Petrification-Token")).toBe(true);
  });

  it.each([
    { event: "onDeletionOf" as const, payload: { subjectPermanentId: "replace-me" } },
    { event: "whenSecurityRemoved" as const, payload: { removedFromSecuritySeat: 1 as const } },
  ])(
    "plays one token under the opponent for $event and observes the once-per-turn limit",
    async ({ event, payload }) => {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT21-029", as: "medusamon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      });
      await s.ready();
      const victimId = s.perm("victim").permanentId;
      if (event === "onDeletionOf") {
        await advance(s.engine).verb.deletePermanent([victimId], "byEffect");
        await advance(s.engine).fireSubTrigger(event, {
          deletedPermanentId: victimId,
          deletedControllerSeat: 1,
          deletedTopCardId: "BT1-009",
        });
      } else {
        await advance(s.engine).fireSubTrigger(event, payload);
        await advance(s.engine).fireSubTrigger(event, payload);
      }

      const tokens = s.state.players[1]!.battleArea.filter((permanent) =>
        permanent.topCard.cardId.startsWith("TOKEN-Petrification"),
      );
      expect(tokens).toHaveLength(1);
      expect(tokens[0]!.controllerSeat).toBe(1);
      expect(tokens[0]!.currentDP).toBe(3000);
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId.startsWith("TOKEN-"))).toBe(
        false,
      );
    },
  );
});
