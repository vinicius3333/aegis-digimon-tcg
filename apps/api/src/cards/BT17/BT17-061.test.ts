import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-061.js";
import "./index.js";

describe("BT17-061 Goblimon", () => {
  it("matches the catalog and the complete IR contract", () => {
    expect(getCardDefinition("BT17-061")).toMatchObject({
      cardId: "BT17-061",
      nameEn: "Goblimon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Purple", level: 2, memoryCost: 0 },
        { color: "Green", level: 2, memoryCost: 0 },
      ],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Demon"],
      effectText:
        "[On Play] By deleting 1 of your other Digimon, delete 1 of your opponent's level 4 or lower Digimon.",
      inheritedEffectText: "＜Retaliation＞.",
    });
    expect(compiled.effects).toEqual([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "Delete",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
              count: 1,
            },
            cost: {
              kind: "deleteOwn",
              target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
              raw: "By deleting 1 of your other Digimon",
            },
            optional: true,
            abortOnDecline: true,
          },
        ],
      },
      {
        trigger: "Static",
        actions: [],
        isInherited: true,
        keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }],
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("does not resolve the deletion when no other own Digimon can pay the cost", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT17-061", as: "goblimon" }, "BT1-009"] },
        1: { battleArea: [{ card: "BT4-025", as: "levelFour" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const levelFourId = s.perm("levelFour").permanentId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("goblimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-061"));

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([levelFourId]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(0);
  });

  it("deletes another own Digimon to delete only the level-4 opponent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-061", as: "goblimon" }, "BT1-009"],
          battleArea: [{ card: "BT1-010", as: "costDigimon" }],
        },
        1: {
          battleArea: [
            { card: "BT4-025", as: "levelFour" },
            { card: "BT17-025", as: "levelFive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const costId = s.perm("costDigimon").permanentId;
    const levelFourId = s.perm("levelFour").permanentId;
    const levelFiveId = s.perm("levelFive").permanentId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("goblimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === levelFourId));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT17-061"]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === costId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([levelFiveId]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT4-025"]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(0);
  });

  it("keeps both Digimon when the optional cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-061", as: "goblimon" }, "BT1-009"],
          battleArea: [{ card: "BT1-010", as: "costDigimon" }],
        },
        1: { battleArea: [{ card: "BT4-025", as: "levelFour" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const costId = s.perm("costDigimon").permanentId;
    const levelFourId = s.perm("levelFour").permanentId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("goblimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-061"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === costId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([levelFourId]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(0);
  });

  it.each([
    ["Purple", "BT10-006"],
    ["Green", "BT1-007"],
  ])("digivolves from a level 2 %s source in breeding for 0 memory", async (_color, egg) => {
    const s = setupEngine({
      0: { breeding: { card: egg, as: "egg" }, hand: [{ card: "BT17-061", as: "goblimon" }], deck: ["BT1-009"] },
    });
    s.state.memory = 0;
    await s.ready();
    const eggInstanceId = s.inst("egg").instanceId;
    const eggPermanentId = s.perm("egg").permanentId;
    const goblimonId = s.inst("goblimon").instanceId;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: eggPermanentId, instanceId: goblimonId })).toEqual(
      { ok: true },
    );
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === goblimonId);

    expect(s.state.players[0]!.breeding?.permanentId).toBe(eggPermanentId);
    expect(s.state.players[0]!.breeding?.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("refuses a level 2 Red source that matches neither digivolution requirement", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT1-001", as: "egg" }, hand: [{ card: "BT17-061", as: "goblimon" }], deck: ["BT1-009"] },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("goblimon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT1-001");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT17-061"]);
  });

  it("grants inherited Retaliation and deletes the winning battle opponent", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-025", dp: 5000, under: ["BT17-061"], as: "host" }] },
      1: { battleArea: [{ card: "BT17-025", dp: 6000, suspended: true, as: "target" }] },
    });
    const hostId = s.perm("host").permanentId;
    const targetId = s.perm("target").permanentId;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT17-061", "BT4-025"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT17-025"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("builds a real stack from a played Goblimon and grants Retaliation once buried", async () => {
    // Realistic stack over two public routes: BT17-061 is played from the hand (cost 3),
    // then BT3-080 Saberdramon digivolves onto it (Purple Lv4 from a Purple Lv3, 2
    // memory). Retaliation is inherited, so it is absent while Goblimon is the top card
    // and present only after Saberdramon buries it.
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-061", as: "goblimon" },
            { card: "BT3-080", as: "saberdramon" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const goblimonId = s.inst("goblimon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: goblimonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-061"));

    // Step 1: on the field as the top card, cost 3 paid, no other Digimon to pay the
    // [On Play] cost, and its own inherited keyword is not active on itself.
    const hosted = s.state.players[0]!.battleArea[0]!;
    expect(hosted.topCard?.instanceId).toBe(goblimonId);
    expect(hosted.stack).toHaveLength(0);
    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).hasKeyword(hosted, "Retaliation")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hosted.permanentId,
        instanceId: s.inst("saberdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]?.topCard?.cardId === "BT3-080");

    // Step 2: Saberdramon buries Goblimon, pays 2 memory, draws the digivolve bonus, and
    // now inherits Retaliation from the Goblimon underneath.
    const evolved = s.state.players[0]!.battleArea[0]!;
    expect(evolved.permanentId).toBe(hosted.permanentId);
    expect(evolved.stack.map((card) => card.instanceId)).toEqual([goblimonId]);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(observe(s.engine).hasKeyword(evolved, "Retaliation")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
