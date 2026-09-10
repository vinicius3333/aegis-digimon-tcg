import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-019.js";

describe("EX8-019", () => {
  it("matches the catalog identity and every printed text field", () => {
    expect(getCardDefinition("EX8-019")).toMatchObject({
      cardId: "EX8-019",
      nameEn: "Penguinmon",
      colors: ["Blue", "Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Blue", level: 2, memoryCost: 1 },
        { color: "Yellow", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Avian", "LIBERATOR", "Ice-Snow"],
      effectText: expect.stringContaining("[Digivolve][Hiyarimon]: Cost 0"),
      inheritedEffectText:
        "[When Attacking] Give 1 of your opponent's Digimon ＜Security Attack -1＞until the end of their turn.",
    });
  });
  it("traces the Ice-Snow cost replacement, Rule trait, and inherited modifier", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true, zone: "battleArea" },
      into: {
        controllerDefault: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Ice-Snow"], match: "trait" }],
      },
      actions: [{ event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      grant: "trait",
      tokens: ["Ice-Snow"],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      keyword: { keyword: "SecurityAttack", amount: -1, raw: "＜Security Attack -1＞" },
      duration: "untilOpponentTurnEnd",
    });
  });
  it("inherits giving an opposing Digimon Security Attack -1 when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: -1 },
      duration: "untilOpponentTurnEnd",
    }));
  it("exposes the Ice-Snow trait on live state", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-019", as: "penguinmon" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("penguinmon"), "Ice-Snow")).toBe(true);
  });
  it("reduces an opposing Digimon's Security Attack during a real host attack", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-037", as: "host", under: [{ card: "EX8-019", as: "penguinmon" }] }],
          security: ["BT1-045"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponent" },
            { card: "BT1-010", as: "otherOpponent" },
          ],
          security: ["BT1-045"],
          deck: ["BT1-046"],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("opponent").permanentId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack") === -1);
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("otherOpponent"), "SecurityAttack")).toBe(0);
    await settle(() => !observe(s.engine).isAttacking());

    s.state.memory = 0;
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponent").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-045"]);
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(0);
  });

  it("reduces an Ice-Snow evolution by 1 in the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-019", as: "penguinmon" }],
        hand: [{ card: "BT1-032", as: "frigimon" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("penguinmon").permanentId,
        instanceId: s.inst("frigimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("penguinmon").topCard.instanceId === s.inst("frigimon").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("does not reduce an Ice-Snow evolution in breeding (Q3881)", async () => {
    const s = setupEngine({
      0: { breeding: { card: "EX8-019", as: "penguinmon" }, hand: [{ card: "BT1-032", as: "frigimon" }] },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("penguinmon").permanentId,
        instanceId: s.inst("frigimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("penguinmon").topCard.instanceId === s.inst("frigimon").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("does not discount a non-Ice-Snow evolution in the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-019", as: "base" }],
        hand: [{ card: "BT1-037", as: "gorillamon" }],
        deck: ["BT1-045"],
      },
    });
    await s.ready();
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gorillamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-045"));
    expect(s.perm("base").topCard.cardId).toBe("BT1-037");
    expect(s.state.memory).toBe(1); // Gorillamon's printed cost is 1, with no Ice-Snow discount.
  });

  it("uses the Hiyarimon alternate route for 0 and rejects another off-color egg", async () => {
    expect(digivolutionRequirementsFor("EX8-019")).toContainEqual({
      names: ["Hiyarimon"],
      cost: 0,
      isAlternate: true,
    });
    const eligible = setupEngine({
      0: { breeding: { card: "BT8-002", as: "hiyarimon" }, hand: [{ card: "EX8-019", as: "penguinmon" }] },
    });
    await eligible.ready();
    expect(
      eligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eligible.perm("hiyarimon").permanentId,
        instanceId: eligible.inst("penguinmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => eligible.perm("hiyarimon").topCard.instanceId === eligible.inst("penguinmon").instanceId);
    expect(eligible.state.memory).toBe(0);

    const standardYellow = setupEngine({
      0: { breeding: { card: "BT5-003", as: "yellowEgg" }, hand: [{ card: "EX8-019", as: "penguinmon" }] },
    });
    standardYellow.state.memory = 1;
    await standardYellow.ready();
    expect(
      standardYellow.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: standardYellow.perm("yellowEgg").permanentId,
        instanceId: standardYellow.inst("penguinmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => standardYellow.perm("yellowEgg").topCard.instanceId === standardYellow.inst("penguinmon").instanceId,
    );
    expect(standardYellow.state.memory).toBe(0);

    const ineligible = setupEngine({
      0: { breeding: { card: "BT2-005", as: "kapurimon" }, hand: [{ card: "EX8-019", as: "penguinmon" }] },
    });
    await ineligible.ready();
    expect(
      ineligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ineligible.perm("kapurimon").permanentId,
        instanceId: ineligible.inst("penguinmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
