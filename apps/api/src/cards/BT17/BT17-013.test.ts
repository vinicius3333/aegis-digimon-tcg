import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT14/BT14-062.js";
import "./BT17-016.js";
import { compiled } from "./BT17-013.js";

describe("BT17-013", () => {
  it("deletes an opposing Digimon at 6000 DP or less and grants Security Attack +1 if it did not delete", () => {
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { dp: { op: "lte", value: 6000 } } },
    });
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: 1 },
      duration: "forTheTurn",
      condition: { kind: "ifThisEffectDidNotDelete" },
    });
  });

  it("unsuspends once per turn when an opposing Digimon is deleted", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { deleteCause: "byEffect" },
          actions: [
            { kind: "Unsuspend", optional: true, condition: { kind: "selfHasNameContaining", names: ["Gallantmon"] } },
          ],
        },
      ],
    });
  });

  it("deletes only an opposing Digimon at 6000 DP or less when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-015", as: "base" }],
          hand: [{ card: "BT17-013", as: "wargrowlmon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 6000, as: "within" },
            { card: "BT1-009", dp: 6001, as: "above" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const withinInstanceId = s.perm("within").topCard!.instanceId;
    const aboveInstanceId = s.perm("above").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wargrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === withinInstanceId));

    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === withinInstanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.instanceId === aboveInstanceId)).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "SecurityAttack")).toBe(false);
  });

  it("gains Security Attack +1 when no opposing Digimon can be deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-015", as: "base" }],
          hand: [{ card: "BT17-013", as: "wargrowlmon" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 6001, as: "above" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wargrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack") === 1);

    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("unsuspends a Gallantmon host when another effect deletes an opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-016", as: "gallant", suspended: true, under: ["BT17-013"] },
            { card: "BT1-015", as: "base" },
          ],
          hand: [{ card: "BT17-013", as: "wargrowlmon" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wargrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("gallant").isSuspended);

    expect(s.perm("gallant").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("matches the catalog printed text, stats and evolution cost", () => {
    expect(getCardDefinition("BT17-013")).toMatchObject({
      cardId: "BT17-013",
      nameEn: "WarGrowlmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      types: ["Cyborg"],
      evoCosts: [{ color: "Red", level: 4, memoryCost: 3 }],
      effectText:
        "[When Digivolving] Delete 1 of your opponent's Digimon with 6000 DP or less. If this effect didn't delete, this Digimon gains ＜Security Attack +1＞for the turn.",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When an effect deletes an opponent's Digimon, you may unsuspend this Digimon with [Gallantmon]\u00a0in its name.",
    });
  });

  // Q2739: with a legal target the deletion is mandatory — declining every optional prompt
  // still deletes, and no Security Attack +1 is handed out.
  it("cannot decline the deletion while a legal target exists (Q2739)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-015", as: "base" }],
          hand: [{ card: "BT17-013", as: "wargrowlmon" }, "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 6000, as: "target" }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();
    const targetInstanceId = s.perm("target").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wargrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(targetInstanceId);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(0);
  });

  // Q2740: a deletion-proof target is still a legal choice, and choosing it turns the clause
  // into the "didn't delete" branch. BT14-062 Datamon is 6000 DP and can't be deleted by
  // opponent effects; the plain BT1-009 next to it proves the pick was a real choice.
  it("grants Security Attack +1 when the chosen target cannot be deleted (Q2740)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-015", as: "base" }],
          hand: [{ card: "BT17-013", as: "wargrowlmon" }, "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT14-062", as: "datamon" },
            { card: "BT1-009", dp: 3000, as: "plain" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
    );
    s.state.memory = 3;
    await s.ready();
    preferInstanceIds.push(s.perm("datamon").topCard!.instanceId);
    const datamonInstanceId = s.perm("datamon").topCard!.instanceId;
    const plainInstanceId = s.perm("plain").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wargrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack") === 1);

    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(1);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.instanceId)).toEqual(
      expect.arrayContaining([datamonInstanceId, plainInstanceId]),
    );
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not unsuspend a host whose name lacks Gallantmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-015", as: "notGallantmon", suspended: true, under: ["BT17-013"] },
            { card: "BT1-015", as: "base" },
          ],
          hand: [{ card: "BT17-013", as: "wargrowlmon" }, "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wargrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("notGallantmon").isSuspended).toBe(true);
  });

  it("unsuspends only once per turn and resets on your next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-016", as: "gallant", suspended: true, under: ["BT17-013"] },
            { card: "BT1-015", as: "baseOne" },
            { card: "BT1-015", as: "baseTwo" },
          ],
          hand: [
            { card: "BT17-013", as: "firstWarGrowlmon" },
            { card: "BT17-013", as: "secondWarGrowlmon" },
            "BT1-009",
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 3000, as: "firstTarget" },
            { card: "BT1-009", dp: 3000, as: "secondTarget" },
            { card: "BT1-009", dp: 3000, as: "thirdTarget" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          hand: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("baseOne").permanentId,
        instanceId: s.inst("firstWarGrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("gallant").isSuspended);
    expect(s.perm("gallant").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);

    // Re-suspend as plumbing so the second deletion has something to undo.
    await advance(s.engine).verb.suspend([s.perm("gallant").permanentId]);
    expect(s.perm("gallant").isSuspended).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("baseTwo").permanentId,
        instanceId: s.inst("secondWarGrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.perm("gallant").isSuspended).toBe(true);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await advance(s.engine).verb.suspend([s.perm("gallant").permanentId]);

    await advance(s.engine).verb.deletePermanent([s.perm("thirdTarget").permanentId], "byEffect");
    await settle(() => !s.perm("gallant").isSuspended);
    expect(s.perm("gallant").isSuspended).toBe(false);
  });
});
