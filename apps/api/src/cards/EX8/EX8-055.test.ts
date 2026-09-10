import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-055.js";

describe("EX8-055", () => {
  it("matches the committed catalog identity and printed clauses", () => {
    expect(getCardDefinition("EX8-055")).toMatchObject({
      cardId: "EX8-055",
      nameEn: "Pyramidimon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Mineral", "LIBERATOR"],
      effectText: expect.stringContaining("any 3 digivolution cards"),
    });
    expect(getCardDefinition("EX8-055")?.effectText).toContain("End of Your Turn");
    expect(getCardDefinition("EX8-055")?.securityEffectText).toBeUndefined();
  });

  it("has Fragment (3) and trashes 3 Mineral/Rock digivolution cards to unsuspend and gain Security Attack +1 when digivolving and attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Fragment",
      amount: 3,
      raw: "＜Fragment (3)＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      {
        kind: "Unsuspend",
        abortOnDecline: true,
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        cost: {
          kind: "trash",
          target: {
            filter: {
              zone: "digivolutionCards",
              controller: "mine",
              nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }],
            },
            count: 3,
          },
        },
      },
      { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, duration: "forTheTurn" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "Unsuspend",
      cost: {
        kind: "trash",
        target: {
          filter: {
            zone: "digivolutionCards",
            controller: "mine",
            nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }],
          },
          count: 3,
        },
      },
    });
  });
  it("places 1 to 3 Mineral/Rock cards from trash underneath itself at end of turn", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      target: {
        filter: { zone: "trash", controller: "mine", nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] },
        count: 1,
        from: ["trash"],
      },
      underFilter: { isSelfRef: true },
      position: "bottom",
    }));
  it("places an exact Mineral card from trash underneath itself at end of turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX8-055", as: "pyramid" }], trash: ["EX8-053", "EX8-005"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).runTurn(0);

    expect(s.perm("pyramid").stack.some((card) => card.cardId === "EX8-053")).toBe(true);
    expect(s.perm("pyramid").stack.some((card) => card.cardId === "EX8-005")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX8-053")).toBe(false);
  });
  it("trashes three Mineral digivolution cards to unsuspend and gain Security Attack +1 when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-055", as: "pyramid", under: ["EX8-048", "EX8-048"], suspended: true },
            { card: "AD1-001", as: "ally", under: ["EX8-048"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("pyramid"));
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("pyramid").isSuspended).toBe(false);
    expect(s.perm("pyramid").stack).toHaveLength(0);
    expect(s.perm("ally").stack).toHaveLength(0);
    expect(observe(s.engine).keywordAmount(s.perm("pyramid"), "SecurityAttack")).toBe(1);
  });

  it("trashes three sources during a real attack, checks twice, and expires the bonus", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-055", as: "pyramid", under: ["EX8-053", "EX8-051", "EX8-049"] }],
        },
        1: { security: ["BT1-009", "BT1-010", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("pyramid").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.perm("pyramid").stack).toHaveLength(0);
    expect(observe(s.engine).keywordAmount(s.perm("pyramid"), "SecurityAttack")).toBe(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).keywordAmount(s.perm("pyramid"), "SecurityAttack")).toBe(0);
  });

  it("does nothing when only two qualifying digivolution cards can pay the exact cost (Q3938)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-055", as: "pyramid", under: ["EX8-048", "EX8-049"], suspended: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("pyramid"));
    expect(s.perm("pyramid").isSuspended).toBe(true);
    expect(s.perm("pyramid").stack).toHaveLength(2);
    expect(observe(s.engine).keywordAmount(s.perm("pyramid"), "SecurityAttack")).toBe(0);
  });

  it("places no cards only when the optional end-turn effect is declined (Q3940)", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX8-055", as: "pyramid" }], trash: ["EX8-053"] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).runTurn(0);

    expect(s.perm("pyramid").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX8-053")).toBe(true);
  });

  it("evolves legally from Black level 5 for four and rejects a non-Black source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-051", as: "base" }], hand: [{ card: "EX8-055", as: "pyramid" }] },
    });
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("pyramid").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX8-055");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX8-051"]);
    expect(s.state.memory).toBe(0);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-016", as: "base" }], hand: [{ card: "EX8-055", as: "pyramid" }] },
    });
    invalid.state.memory = 4;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("pyramid").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(invalid.state.memory).toBe(4);
  });
});
