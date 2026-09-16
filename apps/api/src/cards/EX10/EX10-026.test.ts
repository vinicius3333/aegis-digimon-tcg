import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-026.js";
import "../index.js";

const CARD_ID = "EX10-026";

describe("EX10-026 SkullKnightmon", () => {
  it("matches the catalog and compiles the printed alternate digivolution requirement", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "SkullKnightmon",
      colors: ["Black", "Purple"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 3 },
        { color: "Purple", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Undead", "Bagra Army", "Twilight"],
      inheritedEffectText: "＜Blocker＞",
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ level: 3, texts: ["Knightmon"], cost: 2, isAlternate: true }],
    });
    const save = compiled.effects.find((effect) => effect.trigger === "OnDeletion")!;
    expect(save.actions[0]).toMatchObject({ kind: "PlaceUnder", position: "bottom", optional: true });
  });

  it("[On Play]: playing it from hand trashes 1 hand card and deletes a play cost 4 Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "skull" },
            { card: "BT1-013", as: "fodder" },
            { card: "BT1-014", as: "spare" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT7-020", as: "cost4" },
            { card: "BT1-038", as: "cost5" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("fodder").instanceId);
    s.state.memory = 4;
    const skullId = s.inst("skull").instanceId;
    const fodderId = s.inst("fodder").instanceId;
    const cost5Id = s.perm("cost5").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: skullId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.instanceId)).toEqual([skullId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([fodderId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard!.instanceId)).toEqual([cost5Id]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT7-020"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Play]: the optional processing condition may be declined, keeping hand and target", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "skull" },
            { card: "BT1-013", as: "fodder" },
          ],
        },
        1: { battleArea: [{ card: "BT7-020", as: "cost4" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skull").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.pendingDecision === undefined);
    await settle(() => false, 30);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("fodder").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[When Digivolving]: the normal Lv.3 route costs 3 and deletes a play cost 4 Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-065", as: "base" }],
          hand: [
            { card: CARD_ID, as: "skull" },
            { card: "BT1-013", as: "fodder" },
            { card: "BT1-014", as: "spare" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT7-020", as: "cost4" },
            { card: "BT1-038", as: "cost5" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("fodder").instanceId);
    s.state.memory = 3;
    const baseId = s.perm("base").topCard!.instanceId;
    const skullId = s.inst("skull").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: skullId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard!.instanceId).toBe(skullId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("fodder").instanceId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard!.cardId)).toEqual(["BT1-038"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[Digivolve] Lv.3 w/[Knightmon] in text: costs 2 off a Lv.3 naming [Knightmon] (Q5080)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-058", as: "base" }],
          hand: [
            { card: CARD_ID, as: "skull" },
            { card: "BT1-013", as: "spare" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 3;
    const baseId = s.perm("base").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skull").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard!.cardId === CARD_ID && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
  });

  it("[Digivolve] Lv.3 w/[Knightmon] in text: a Lv.3 without [Knightmon] anywhere pays the printed cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-065", as: "base" }],
          hand: [
            { card: CARD_ID, as: "skull" },
            { card: "BT1-013", as: "spare" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skull").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard!.cardId === CARD_ID && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(0);
  });

  it("[On Deletion] ＜Save＞: a battle deletion places it at the BOTTOM of a Tamer's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "skull" },
            { card: "BT12-094", as: "tamer", under: [{ card: "BT1-013", as: "older" }] },
          ],
          hand: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-038", as: "wall", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const skullId = s.inst("skull").instanceId;
    const olderId = s.inst("older").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("skull").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === skullId));
    await settle(() => false, 30);

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([skullId, olderId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(skullId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.instanceId)).not.toContain(skullId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Deletion] ＜Save＞ is optional: declining sends it to the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "skull" },
            { card: "BT12-094", as: "tamer" },
          ],
          hand: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-038", as: "wall", suspended: true }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const skullId = s.inst("skull").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("skull").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === skullId));
    await settle(() => false, 30);

    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(skullId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherited ＜Blocker＞: only the Digimon this card evolved into can block", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "skull" },
            { card: CARD_ID, as: "standalone" },
          ],
          hand: [
            { card: "EX10-031", as: "dark" },
            { card: "BT1-013", as: "spare" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-038", as: "attacker" }],
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const skullId = s.inst("skull").instanceId;
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("skull").permanentId,
        instanceId: s.inst("dark").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("skull").topCard!.cardId === "EX10-031" && s.state.pendingDecision === undefined);

    expect(s.perm("skull").stack.map((card) => card.instanceId)).toEqual([skullId]);
    expect(observe(s.engine).hasKeyword(s.perm("skull"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("standalone"), "Blocker")).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    const securityBefore = s.state.players[0]!.security.length;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("skull").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "blocked"));
    await settle(() => false, 30);

    expect(s.state.players[0]!.security).toHaveLength(securityBefore);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("skull").topCard!.cardId).toBe("EX10-031");
    loop.catch(() => undefined);
  });

  it("DigiXros: it is a legal [SkullKnightmon] material for EX10-031, and a stranger is not", async () => {
    const build = () =>
      setupEngine(
        {
          0: {
            battleArea: [
              { card: CARD_ID, as: "skull" },
              { card: "EX10-027", as: "axe" },
              { card: "BT1-013", as: "stranger" },
            ],
            hand: [
              { card: "EX10-031", as: "dark" },
              { card: "BT1-013", as: "spare" },
            ],
          },
          1: { battleArea: [{ card: "BT7-020", as: "theirs" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );

    const legal = build();
    await legal.ready();
    legal.state.memory = 5;
    const skullId = legal.perm("skull").topCard!.instanceId;
    const axeId = legal.perm("axe").topCard!.instanceId;
    const darkId = legal.inst("dark").instanceId;
    expect(
      legal.engine.applyIntent(0, {
        type: "playCard",
        instanceId: darkId,
        digiXros: { materialInstanceIds: [skullId, axeId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        legal.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === darkId) &&
        legal.state.pendingDecision === undefined,
    );

    expect(legal.state.memory).toBe(0);
    const xrosed = legal.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === darkId)!;
    expect(xrosed.stack.map((card) => card.instanceId).sort()).toEqual([skullId, axeId].sort());
    expect(legal.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.cardId).sort()).toEqual(
      ["BT1-013", "EX10-031"].sort(),
    );

    const illegal = build();
    await illegal.ready();
    illegal.state.memory = 6;
    const result = illegal.engine.applyIntent(0, {
      type: "playCard",
      instanceId: illegal.inst("dark").instanceId,
      digiXros: {
        materialInstanceIds: [illegal.perm("skull").topCard!.instanceId, illegal.perm("stranger").topCard!.instanceId],
      },
    });
    expect(result.ok).toBe(false);
    expect(illegal.state.memory).toBe(6);
    expect(illegal.state.players[0]!.battleArea).toHaveLength(3);
  });
});
