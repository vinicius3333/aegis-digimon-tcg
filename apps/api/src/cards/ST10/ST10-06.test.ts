import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT9/BT9-074.js";
import "../BT9/BT9-091.js";
import "./ST10-06.js";
import "./ST10-09.js";

describe("ST10-06 Mastemon", () => {
  it("places a yellow or purple Digimon from trash on top of security when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST10-05", as: "base" }], hand: [{ card: "ST10-06", as: "mastemon" }], trash: [{ card: "ST10-07", as: "secured" }] } }, { autoOrderTriggers: true, autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("mastemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((c) => c.instanceId === s.inst("secured").instanceId));
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("secured").instanceId)).toBe(false);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(false);
  });

  it("plays a level 5 or lower Digimon from security after DNA digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST10-05", as: "yellow" }, { card: "ST10-12", as: "purple" }],
        hand: [{ card: "ST10-06", as: "mastemon" }],
        security: [{ card: "ST10-14", as: "existingSecurity" }],
        trash: [{ card: "ST10-11", as: "played" }],
      },
      1: { battleArea: [{ card: "ST10-09", as: "target" }] },
    }, { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true });
    expect(s.engine.applyIntent(0, {
      type: "dnaDigivolve",
      materialPermanentIds: [s.perm("yellow").permanentId, s.perm("purple").permanentId],
      instanceId: s.inst("mastemon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("played").instanceId));
    expect(s.state.players[0]!.security.every((card) => card.instanceId !== s.inst("played").instanceId)).toBe(true);
    const securityChoice = s.decisions.find(({ req }) =>
      req.kind === "selectCards" && req.options?.candidateInstanceIds?.includes(s.inst("played").instanceId),
    )?.req;
    expect(securityChoice?.options?.candidateInstanceIds).toEqual([s.inst("played").instanceId]);
    expect(securityChoice?.options).toMatchObject({ min: 0, max: 1 });
    expect(securityChoice?.options?.visibleCards).toEqual(expect.arrayContaining([
      { instanceId: s.inst("played").instanceId, cardId: "ST10-11" },
      { instanceId: s.inst("existingSecurity").instanceId, cardId: "ST10-14" },
    ]));
  });

  it("deletes an opponent Digimon no higher than another Digimon played by an effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST10-06", as: "mastemon" }],
        security: [{ card: "ST10-09", as: "witchmon", faceUp: true }],
      },
      1: { battleArea: [{ card: "ST10-09", as: "target" }] },
    }, { autoOrderTriggers: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("witchmon"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("runs the Mastemon and Meiko deck line by placing and playing Meicoomon from security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST10-05", as: "yellowMaterial" },
          { card: "ST10-12", as: "purpleMaterial" },
          { card: "BT9-091", as: "meiko" },
        ],
        hand: [{ card: "ST10-06", as: "mastemon" }],
        trash: [{ card: "BT9-074", as: "meicoomon" }],
      },
      1: { battleArea: [{ card: "ST10-09", as: "deleteTarget" }] },
    }, {
      autoAcceptOptional: true,
      autoOrderTriggers: true,
      autoSelectCards: true,
    });
    s.state.memory = 0;
    const meicoomonId = s.inst("meicoomon").instanceId;
    const targetId = s.perm("deleteTarget").permanentId;

    expect(s.engine.applyIntent(0, {
      type: "dnaDigivolve",
      materialPermanentIds: [
        s.perm("yellowMaterial").permanentId,
        s.perm("purpleMaterial").permanentId,
      ],
      instanceId: s.inst("mastemon").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === meicoomonId) &&
      !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId) &&
      s.perm("meiko").isSuspended &&
      s.state.memory === 1,
    );

    expect(s.state.players[0]!.security.some((card) => card.instanceId === meicoomonId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === meicoomonId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    expect(s.perm("meiko").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });
});
