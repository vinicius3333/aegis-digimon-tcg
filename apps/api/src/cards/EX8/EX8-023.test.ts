import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import {
  devimonOverLockedBase,
  effectTriggeredFor,
  medievalGallantmonReactivation,
  skadimonOverLockedBase,
} from "./whenDigivolvingLock.testSupport.js";
import { compiled } from "./EX8-023.js";

describe("EX8-023", () => {
  it("matches committed catalog identity and every printed text field", () => {
    expect(getCardDefinition("EX8-023")).toMatchObject({
      cardId: "EX8-023",
      nameEn: "PolarBearmon",
      colors: ["Blue", "Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Blue", level: 4, memoryCost: 4 },
        { color: "Yellow", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Ice-Snow", "LIBERATOR"],
      effectText: expect.stringContaining("Trash any 2 digivolution cards"),
      inheritedEffectText:
        "[Your Turn] While your opponent has no Digimon with digivolution cards, this Digimon with the [Ice-Snow]\u00a0trait gains ＜Piercing＞and ＜Security Attack +1＞.",
    });
  });

  it("inherits conditional Piercing and Security Attack +1", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [
        { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Piercing" } } },
        { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } } },
      ],
    }));

  it("grants both inherited keywords only while the opponent has no stacked Digimon", async () => {
    const open = setupEngine({
      0: { battleArea: [{ card: "EX8-028", as: "host", under: [{ card: "EX8-023", as: "polar" }] }] },
      1: { battleArea: [{ card: "BT1-009", as: "empty" }] },
    });
    await open.ready();
    await settle(() => observe(open.engine).hasPierce(open.perm("host")));
    expect(observe(open.engine).hasPierce(open.perm("host"))).toBe(true);
    expect(observe(open.engine).keywordAmount(open.perm("host"), "SecurityAttack")).toBe(1);

    const stacked = setupEngine({
      0: { battleArea: [{ card: "EX8-028", as: "host", under: [{ card: "EX8-023", as: "polar" }] }] },
      1: { battleArea: [{ card: "BT1-009", as: "stacked", under: ["BT1-001"] }] },
    });
    await stacked.ready();
    expect(observe(stacked.engine).hasPierce(stacked.perm("host"))).toBe(false);
    expect(observe(stacked.engine).keywordAmount(stacked.perm("host"), "SecurityAttack")).toBe(0);
  });

  it("has Ice Clad, trashes 2 digivolution cards, and restricts a card with no digivolution cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({
      keyword: "IceClad",
      raw: "＜Ice Clad＞",
    });
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 2, scope: "acrossDigimon" });
    expect(actions[1]).toMatchObject({ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" });
    expect(actions[2]).toMatchObject({
      kind: "Restrict",
      restriction: "cannotActivateWhenDigivolving",
      target: { sameTarget: true },
    });
  });

  it("uses Ice Clad source count to win a lower-DP battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-023", as: "polar", dp: 1000, under: ["BT1-001"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 15000, suspended: true }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("polar"), "IceClad")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("polar").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
  it("trashes two opposing digivolution cards and applies both printed restrictions on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-023", as: "polar" }] },
        1: { battleArea: [{ card: "EX8-022", as: "opponent", under: ["BT1-004", "BT1-028"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("polar").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "suspend"));
    expect(s.perm("opponent").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "cannotActivateWhenDigivolving")).toBe(true);
  });

  it("trashes sources and applies both restrictions when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-022", as: "frigimon" }],
          hand: [{ card: "EX8-023", as: "polar" }],
        },
        1: { battleArea: [{ card: "BT1-024", as: "opponent", under: ["BT1-009", "AD1-001"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("frigimon").permanentId,
        instanceId: s.inst("polar").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "suspend"));

    expect(s.perm("opponent").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "cannotActivateWhenDigivolving")).toBe(true);
  });

  it("can trash the two cards from different opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-023", as: "polar" }] },
        1: {
          battleArea: [
            { card: "EX8-022", as: "opponent-a", under: ["BT1-028"] },
            { card: "EX8-022", as: "opponent-b", under: ["BT1-028"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("polar").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("opponent-a").stack.length === 0 && s.perm("opponent-b").stack.length === 0);
    expect(s.perm("opponent-a").stack).toHaveLength(0);
    expect(s.perm("opponent-b").stack).toHaveLength(0);
  });

  it("keeps both restrictions after the chosen Digimon gains a source and blocks its digivolving effect (Q3882–Q3888)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-023", as: "polar" },
            { card: "BT1-024", as: "victim" },
          ],
        },
        1: {
          battleArea: [{ card: "EX8-019", as: "penguinmon" }],
          hand: [{ card: "EX8-022", as: "frigimon" }],
          deck: ["BT1-045"],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("polar"));
    await settle(() => observe(s.engine).isRestricted(s.perm("penguinmon"), "suspend"));
    expect(observe(s.engine).isRestricted(s.perm("penguinmon"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("penguinmon"), "cannotActivateWhenDigivolving")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("penguinmon").permanentId,
        instanceId: s.inst("frigimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("penguinmon").topCard.instanceId === s.inst("frigimon").instanceId);

    expect(s.perm("penguinmon").stack).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("penguinmon"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("penguinmon"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(s.perm("victim").stack).toHaveLength(0);
    expect(s.state.memory).toBe(0);

    s.state.memory = 0;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).isRestricted(s.perm("penguinmon"), "suspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("penguinmon"), "cannotActivateWhenDigivolving")).toBe(false);
  });

  it("gains Piercing as the last opposing stack is deleted in battle and checks security (Q3883)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-028", as: "host", under: ["BT1-037", "EX8-023"] }] },
      1: {
        battleArea: [{ card: "BT1-009", dp: 1000, as: "target", suspended: true, under: ["BT1-001"] }],
        security: 1,
      },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("meets the inherited condition with no opposing Digimon and uses the Ice-Snow route for 3 (Q6042)", async () => {
    const empty = setupEngine({
      0: { battleArea: [{ card: "EX8-028", as: "host", under: ["EX8-023"] }] },
    });
    await empty.ready();
    expect(observe(empty.engine).hasPierce(empty.perm("host"))).toBe(true);
    expect(observe(empty.engine).keywordAmount(empty.perm("host"), "SecurityAttack")).toBe(1);

    expect(digivolutionRequirementsFor("EX8-023")).toContainEqual({
      level: 4,
      traits: ["Ice-Snow"],
      cost: 3,
      isAlternate: true,
    });
    const evolution = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-022", as: "frigimon" }], hand: [{ card: "EX8-023", as: "polar" }] },
      },
      { autoSelectCards: true },
    );
    evolution.state.memory = 3;
    expect(
      evolution.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: evolution.perm("frigimon").permanentId,
        instanceId: evolution.inst("polar").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => evolution.perm("frigimon").topCard.instanceId === evolution.inst("polar").instanceId);
    expect(evolution.state.memory).toBe(0);
  });

  it("accepts the printed standard level-4 evolution route", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-022", as: "frigimon" }], hand: [{ card: "EX8-023", as: "polar" }] },
        1: {
          battleArea: [{ card: "EX8-022", as: "stacked-opponent", under: ["BT1-004", "BT1-028"] }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("frigimon").permanentId,
        instanceId: s.inst("polar").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("frigimon").topCard.instanceId === s.inst("polar").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("stacked-opponent").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("stacked-opponent"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("stacked-opponent"), "cannotActivateWhenDigivolving")).toBe(true);
  });
});

describe("EX8-023 PolarBearmon — KB Q&A rulings", () => {
  it("keeps the locked Digimon's When Digivolving effect from triggering when it digivolves (Q3884)", async () => {
    const s = await skadimonOverLockedBase("EX8-023", 10);

    expect(effectTriggeredFor(s, "EX8-028")).toBe(false);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("iceSnow").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("locked"), "cannotActivateWhenDigivolving")).toBe(true);
  });

  it("still lets the locked Digimon activate a [When Digivolving] [When Attacking] effect at attack timing (Q3885)", async () => {
    const s = await skadimonOverLockedBase("EX8-023", 10);
    const seatZeroSourceLessIds = s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId);
    expect(effectTriggeredFor(s, "EX8-028")).toBe(false);

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("locked"), {
      attackerPermanentId: s.perm("locked").permanentId,
    });
    await settle(() => s.state.players[0]!.security.length === 3 && s.state.pendingDecision === undefined);

    expect(effectTriggeredFor(s, "EX8-028")).toBe(true);
    expect(seatZeroSourceLessIds).toContain(s.state.players[0]!.security.at(-1)?.instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("locked"), "cannotActivateWhenDigivolving")).toBe(true);
  });

  it("keeps another effect from activating the locked Digimon's When Digivolving effect (Q3886)", async () => {
    const s = await medievalGallantmonReactivation("EX8-023", 10);

    expect(s.perm("deletable").isSuspended).toBe(false);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("deletable").permanentId),
    ).toBe(true);
  });

  it("does not let the locked Digimon pay just the 'by' cost of its When Digivolving effect (Q3887)", async () => {
    const s = await devimonOverLockedBase("EX8-023", 10);

    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("payable").instanceId);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.decisions.some(({ req }) => req.sourceCardId === "EX8-059")).toBe(false);
  });
});
