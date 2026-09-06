import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-073.js";
import "./index.js";

describe("BT20-073 MetalPhantomon", () => {
  it("has Blocker", () => {
    expect(compiled.effects.find((effect) => !effect.isInherited)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Blocker" }],
    });
  });

  it("costs one own Digimon to delete one opposing level 5 or lower Digimon on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Delete",
            optional: true,
            abortOnDecline: true,
            cost: { kind: "deleteOwn", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } },
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
              count: 1,
            },
          },
        ],
      });
    }
  });

  it("inherits De-Digivolve 1 against one opposing Digimon on deletion", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        { kind: "DeDigivolve", amount: 1, target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
      ],
    });
  });

  it("publishes the printed stats, evolution routes, and live Blocker", async () => {
    expect(getCardDefinition("BT20-073")).toMatchObject({
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 4 },
        { color: "Black", level: 4, memoryCost: 4 },
      ],
    });
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
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-073"));
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT20-063");
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT20-071");
  });

  it("when inherited, de-digivolves the chosen opponent by exactly 1 on host deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-074", under: ["BT20-073"], as: "host" }] },
      1: { battleArea: [{ card: "BT20-071", under: ["BT20-070"], as: "target" }] },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    expect(s.perm("target").topCard.cardId).toBe("BT20-070");
    expect(s.perm("target").stack).toHaveLength(0);
  });

  it("publicly builds a purple level-4 to MetalPhantomon stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-068", as: "base" }],
        hand: [
          { card: "BT20-073", as: "metal" },
          { card: "BT20-078", as: "next" },
        ],
      },
    });
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
