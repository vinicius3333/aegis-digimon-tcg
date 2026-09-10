import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-073.js";
import "./index.js";
import "./BT20-078.js";

describe("BT20-073 MetalPhantomon", () => {
  it("publishes the complete catalog identity and printed clauses", () => {
    expect(getCardDefinition("BT20-073")).toMatchObject({
      nameEn: "MetalPhantomon",
      colors: ["Purple", "Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Cyborg", "X-Antibody", "Ghost"],
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 4 },
        { color: "Black", level: 4, memoryCost: 4 },
      ],
      effectText: expect.stringContaining("By deleting 1 of your Digimon"),
      inheritedEffectText: "[On Deletion] ＜De-Digivolve 1＞ 1 of your opponent's Digimon.",
    });
    expect(getCardDefinition("BT20-073")?.effectText).toContain("＜Blocker＞");
    expect(getCardDefinition("BT20-073")?.effectText).toContain("[On Play] [When Digivolving]");
    expect(getCardDefinition("BT20-073")?.effectText).toContain("delete 1 of your opponent's level 5 or lower Digimon");
  });

  it("has Blocker", () => {
    expect(compiled.effects.find((effect) => !effect.isInherited)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Blocker" }],
    });
  });

  it("maps exact cost, opposing level boundary, and inherited target", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const action = compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0];
      expect(action).toMatchObject({
        kind: "Delete",
        optional: true,
        abortOnDecline: true,
        cost: {
          kind: "deleteOwn",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
        },
        target: {
          filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
          count: 1,
        },
      });
    }
    expect(compiled.effects.find((effect) => effect.isInherited)?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
  });

  it("publishes the printed stats, evolution routes, and live Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-073", as: "metal" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("metal"), "Blocker")).toBe(true);
  });

  it("on play and evolution deletes one own Digimon to delete level 5 while preserving level 6", async () => {
    for (const mode of ["play", "digivolve"] as const) {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT20-063", as: "cost" },
              ...(mode === "digivolve" ? [{ card: "BT20-068", as: "base" }] : []),
            ],
            hand: [{ card: "BT20-073", as: "metal" }],
            deck: ["BT20-047"],
          },
          1: {
            battleArea: [
              { card: "BT20-071", as: "level5" },
              { card: "BT20-076", as: "level6" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.perm("cost").permanentId, s.perm("level5").permanentId);
      const costPermanentId = s.perm("cost").permanentId;
      const level5PermanentId = s.perm("level5").permanentId;
      s.state.memory = mode === "play" ? 7 : 4;
      const result =
        mode === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("metal").instanceId,
            });
      expect(result).toEqual({ ok: true });
      await settle(
        () =>
          !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === costPermanentId) &&
          !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level5PermanentId),
      );
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-076"]);
      expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-063")).toBe(true);
    }
  });

  it("allows the paid deletion effect to be declined", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT20-073", as: "metal" }], battleArea: [{ card: "BT20-063", as: "cost" }] },
        1: { battleArea: [{ card: "BT20-071", as: "target" }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-073")).toBe(true);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT20-063");
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT20-071");
  });

  it("when inherited, de-digivolves the chosen opponent by exactly 1 on a public effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-078", dp: 11000, under: ["BT20-073"], as: "host" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT20-071", under: ["BT20-070"], as: "target" }],
          hand: [{ card: "BT20-076", as: "remover" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("remover").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId));
    await settle(() => s.perm("target").topCard.cardId === "BT20-070");
    expect(s.perm("target").topCard.cardId).toBe("BT20-070");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publicly builds a purple level-4 to MetalPhantomon stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-068", as: "base" },
            { card: "BT20-063", as: "cost" },
          ],
          hand: [
            { card: "BT20-073", as: "metal" },
            { card: "BT20-078", as: "next" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT20-071", as: "level5" },
            { card: "BT20-076", as: "level6" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("cost").permanentId, s.perm("level5").permanentId);
    s.state.memory = 8;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metal").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-073");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("next").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-078");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT20-068", "BT20-073"]));
  });
});
