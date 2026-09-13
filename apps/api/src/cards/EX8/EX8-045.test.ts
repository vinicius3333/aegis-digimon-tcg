import { beforeEach, describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { cite } from "../../engine/conformance/_kb.js";
import "./index.js";
import "../BT20/BT20-035.js";
import "../BT5/BT5-112.js";
import "../EX9/EX9-043.js";
import { compiled } from "./EX8-045.js";

describe("EX8-045", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0293",
      "4-7-9/10: a face-down stacked card has no referenceable card information",
      "1220b7f0fc0cb6ccc76d4ad371d1f788922a265df857413971108e64da24bc0f",
    );
  });
  it("matches the committed catalog identity, evolution, printed clauses, and no Security effect", () => {
    expect(getCardDefinition("EX8-045")).toMatchObject({
      cardId: "EX8-045",
      nameEn: "Callismon",
      colors: ["Green", "Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Green", level: 5, memoryCost: 4 },
        { color: "Purple", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Dark Animal", "NSo"],
      effectText:
        "[When Digivolving] Suspend 1 of your opponent's Digimon or Tamers. Then, return 1 of their suspended Tamers to the bottom of the deck.\n[Your Turn] For each color in this Digimon's digivolution cards, it gets +1000 DP. While your opponent has no Digimon with equal or higher DP, this Digimon gets ＜Piercing＞and ＜Security Attack +1＞.",
    });
    expect(getCardDefinition("EX8-045")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("EX8-045")?.securityEffectText).toBeUndefined();
  });

  it("keeps the activated Piercing check when Fortitude restores an equal-DP opponent (Q3931)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-045", as: "callismon" }] },
        1: {
          battleArea: [{ card: "BT20-035", as: "fortitude", dp: 1000, suspended: true, under: ["BT11-053"] }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    const oldId = s.perm("fortitude").permanentId;
    const cardId = s.inst("fortitude").instanceId;
    expect(observe(s.engine).hasPierce(s.perm("callismon"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("callismon").permanentId,
        target: { kind: "permanent", permanentId: oldId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    const replay = s.state.players[1]!.battleArea.find((p) => p.topCard.instanceId === cardId);
    expect(replay).toBeDefined();
    expect(replay!.permanentId).not.toBe(oldId);
    expect(replay!.currentDP).toBe(12000);
    expect(observe(s.engine).hasPierce(s.perm("callismon"))).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("loses the second check when the first Security effect plays a higher-DP Digimon (Q3932/Q6043)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-045", as: "callismon" }] },
        1: { security: ["BT5-112", "BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("callismon"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("callismon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT5-112")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("callismon"), "SecurityAttack")).toBe(0);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });
  it("suspends an opposing Digimon or Tamer and returns an opposing suspended Tamer to the bottom of the deck when digivolving", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      {
        kind: "Suspend",
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
      },
      {
        kind: "Return",
        to: "deckBottom",
        target: { filter: { controllerDefault: "opponent", suspended: true, kind: ["Tamer"] }, count: 1 },
      },
    ]));
  it("gains +1000 DP per your Digimon color and conditionally gains Piercing and Security Attack +1", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions ?? [];
    expect(actions[0]).toMatchObject({
      kind: "ModifyDP",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      amount: 1000,
      duration: "permanent",
      scaling: { per: 1, unit: "colors", filter: { zone: "digivolutionCards" } },
    });
    expect(actions[1]).toMatchObject({
      kind: "Aura",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      effect: { kind: "keyword", keyword: { keyword: "Piercing" } },
      while: {
        kind: "opponentHasNone",
        filter: { controllerDefault: "opponent", kind: ["Digimon"], dp: { op: "gte", relativeToSource: true } },
      },
    });
    expect(actions[2]).toMatchObject({
      kind: "Aura",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
      while: {
        kind: "opponentHasNone",
        filter: { controllerDefault: "opponent", kind: ["Digimon"], dp: { op: "gte", relativeToSource: true } },
      },
    });
  });
  it("applies the multicolor DP bonus and both conditional keywords on live state", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX8-045", as: "callismon", under: ["BT11-053", "BT8-039", "BT1-045", "BT10-080"] },
          { card: "BT1-009", as: "unrelated" },
        ],
      },
      1: { battleArea: [{ card: "AD1-001", as: "target" }] },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("callismon"))).toBe(true);
    await settle(() => observe(s.engine).hasPierce(s.perm("callismon")));

    expect(s.perm("callismon").currentDP).toBe(15000); // three distinct source colors, not source-card count/other-Digimon colors.
    expect(observe(s.engine).hasPierce(s.perm("callismon"))).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("callismon"), "SecurityAttack")).toBe(1);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("callismon").currentDP).toBe(12000);
    expect(observe(s.engine).hasPierce(s.perm("callismon"))).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("callismon"), "SecurityAttack")).toBe(0);
  });

  it.each([
    ["BT1-009", "red"],
    ["BT2-044", "green control"],
  ])("ignores a face-down %s card placed by MetalTyrannomon when counting source colors (%s)", async (placedCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-070", as: "base" }],
          hand: [
            { card: "EX9-043", as: "metal" },
            { card: "EX8-045", as: "callismon" },
          ],
          trash: [placedCard],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    const placedId = s.state.players[0]!.trash[0]!.instanceId;
    const metalId = s.inst("metal").instanceId;
    const callismonId = s.inst("callismon").instanceId;
    s.state.memory = 8;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: metalId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX9-043");
    expect(s.perm("base").stack.map((card) => [card.instanceId, card.cardId, card.faceUp])).toEqual([
      [placedId, placedCard, false],
      [s.inst("base").instanceId, "BT1-070", true],
    ]);
    expect(s.state.memory).toBe(4);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: callismonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX8-045");
    expect(s.perm("base").stack.map((card) => [card.instanceId, card.cardId, card.faceUp])).toEqual([
      [placedId, placedCard, false],
      [s.inst("base").instanceId, "BT1-070", true],
      [metalId, "EX9-043", true],
    ]);
    expect(s.perm("base").topCard.instanceId).toBe(callismonId);
    expect(s.perm("base").currentDP).toBe(14000);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("loses both conditional keywords when an opposing Digimon reaches the source DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-045", as: "callismon", under: ["BT11-053", "BT8-039", "BT1-045", "BT10-080"] }] },
      1: { battleArea: [{ card: "AD1-001", as: "target", dp: 15000 }] },
    });
    await s.ready();
    await settle(() => !observe(s.engine).hasPierce(s.perm("callismon")));
    expect(s.perm("callismon").currentDP).toBe(15000);
    expect(observe(s.engine).hasPierce(s.perm("callismon"))).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("callismon"), "SecurityAttack")).toBe(0);
  });

  it("uses Security Attack +1 on a player attack while its conditional keywords are active", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-045", as: "callismon", under: ["BT11-053", "BT8-039", "BT1-045", "BT10-080"] }] },
      1: {
        battleArea: [{ card: "AD1-001", as: "target", dp: 5000, suspended: true }],
        security: ["BT1-009", "BT1-009", "BT1-009"],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("callismon"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("callismon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1); // two checks from base +1 Security Attack.
  });

  it("evolves, suspends one opponent and bottoms a different suspended Tamer", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-053", as: "callismon" }],
          hand: [{ card: "EX8-045", as: "evolved" }],
          deck: ["BT1-045"],
        },
        1: {
          battleArea: [
            { card: "AD1-001", as: "digimon" },
            { card: "BT1-087", as: "tamer", suspended: true },
            { card: "BT1-087", as: "unsuspendedTamer" },
          ],
          deck: ["BT1-046"],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("digimon").permanentId);
    const tamerId = s.inst("tamer").instanceId;
    await s.ready();
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("callismon").permanentId,
        instanceId: s.inst("evolved").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.at(-1)?.instanceId === tamerId);
    expect(s.perm("callismon").topCard.cardId).toBe("EX8-045");
    expect(s.state.memory).toBe(0);
    expect(s.perm("digimon").isSuspended).toBe(true);
    expect(s.perm("unsuspendedTamer").isSuspended).toBe(false);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-046", "BT1-087"]);
    expect(s.state.players[1]!.deck[1]!.instanceId).toBe(tamerId);
  });

  it("also evolves legally from a Purple level-5 source for four", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-080", as: "base" }], hand: [{ card: "EX8-045", as: "callismon" }] },
    });
    await s.ready();
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("callismon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX8-045");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT10-080"]);
    expect(s.state.memory).toBe(0);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-059", as: "base" }], hand: [{ card: "EX8-045", as: "callismon" }] },
    });
    await invalid.ready();
    invalid.state.memory = 4;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("callismon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("can suspend and bottom the same opposing Tamer on evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-053", as: "base" }],
          hand: [{ card: "EX8-045", as: "callismon" }],
          deck: ["BT1-045"],
        },
        1: { battleArea: [{ card: "BT1-087", as: "tamer" }], deck: ["BT1-046"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("callismon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-046", "BT1-087"]);
  });
});
