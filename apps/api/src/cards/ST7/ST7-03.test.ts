import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../P/P-103.js";
import "./ST7-03.js";
import "./ST7-06.js";
import "./ST7-07.js";
import "./ST7-09.js";

describe("ST7-03 Guilmon", () => {
  it("digivolves into Gallantmon for 4 ignoring requirements when the opponent has level 6", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST7-03", as: "guilmon" }], hand: [{ card: "ST7-09", as: "gallantmon" }] },
      1: { battleArea: ["ST7-09"] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("guilmon").permanentId,
        instanceId: s.inst("gallantmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("guilmon").topCard.cardId === "ST7-09");
    expect(s.state.memory).toBe(1);
  });

  it("draws once when an opposing Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: { deck: [{ card: "ST7-02", as: "drawn" }], battleArea: [{ card: "ST7-09", as: "host", under: ["ST7-03"] }] },
        1: { battleArea: ["ST7-02"], security: ["ST7-01"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("drawn").instanceId));
  });

  it("draws only once across two opposing deletions in the same turn", async () => {
    const s = setupEngine({
      0: {
        deck: [
          { card: "ST7-02", as: "firstDraw" },
          { card: "ST7-02", as: "secondDraw" },
        ],
        battleArea: [{ card: "ST7-09", as: "host", under: ["ST7-03"] }],
      },
      1: {
        battleArea: [
          { card: "ST7-02", as: "first" },
          { card: "ST7-02", as: "second" },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId]);
    await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId]);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not use the alternate path for a near-name Gallantmon card", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST7-03", as: "guilmon" }], hand: [{ card: "BT17-018", as: "crimson" }] },
      1: { battleArea: ["ST7-09"] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("guilmon").permanentId,
        instanceId: s.inst("crimson").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("does not draw when its host and the opposing Digimon are deleted simultaneously", async () => {
    const s = setupEngine({
      0: {
        deck: [{ card: "ST7-02", as: "wouldDraw" }],
        battleArea: [{ card: "ST7-09", as: "host", under: ["ST7-03"] }],
      },
      1: { battleArea: [{ card: "ST7-02", as: "opponent" }] },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId, s.perm("opponent").permanentId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});

describe("ST7-03 Guilmon — KB Q&A rulings", () => {
  async function battleWithGuilmonInherited(hostCard: string) {
    const s = setupEngine({
      0: {
        deck: [{ card: "ST7-02", as: "wouldDraw" }],
        battleArea: [{ card: hostCard, as: "host", under: ["ST7-03"] }],
      },
      1: { battleArea: [{ card: "ST7-06", as: "defender", suspended: true }], security: ["ST7-01"] },
    });
    s.state.memory = 3;
    await s.ready();
    const defenderInstanceId = s.perm("defender").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === defenderInstanceId));
    return s;
  }

  it("does not draw when its host and the opposing Digimon are deleted in the same battle (Q681)", async () => {
    const mutual = await battleWithGuilmonInherited("ST7-06");
    expect(mutual.state.players[0]!.battleArea).toHaveLength(0);
    expect(mutual.state.players[0]!.hand).toHaveLength(0);
    expect(mutual.state.players[0]!.deck).toHaveLength(1);

    const survivor = await battleWithGuilmonInherited("ST7-07");
    await settle(() => survivor.state.players[0]!.hand.length === 1);
    expect(survivor.state.players[0]!.battleArea).toHaveLength(1);
    expect(survivor.state.players[0]!.hand[0]!.instanceId).toBe(survivor.inst("wouldDraw").instanceId);
  });

  it("digivolves into Gallantmon through Offense Training's digivolve effect when the opponent has level 6 (Q682)", async () => {
    const trainGuilmon = async (opponentDigimon: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "ST7-03", as: "guilmon" },
              { card: "P-103", as: "training" },
            ],
            hand: [{ card: "ST7-09", as: "gallantmon" }],
          },
          1: { battleArea: [opponentDigimon] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 6;
      s.state.turnCount = 1;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: s.inst("training").instanceId,
          effectKey: `P-103/ir-${EffectTiming.OnDeclaration}-0`,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.trash.some((card) => card.cardId === "P-103") && s.state.pendingDecision === undefined,
      );
      return s;
    };

    const qualified = await trainGuilmon("ST7-09");
    expect(qualified.perm("guilmon").topCard.instanceId).toBe(qualified.inst("gallantmon").instanceId);
    expect(qualified.state.memory).toBe(4);

    const unqualified = await trainGuilmon("ST7-07");
    expect(unqualified.perm("guilmon").topCard.cardId).toBe("ST7-03");
    expect(unqualified.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["ST7-09"]);
    expect(unqualified.state.memory).toBe(6);
  });
});
