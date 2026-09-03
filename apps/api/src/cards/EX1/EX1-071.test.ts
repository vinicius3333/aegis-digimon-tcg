import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT3/BT3-040.js";
import "../BT13/BT13-059.js";
import "../BT7/BT7-085.js";
import "./EX1-047.js";
import "./EX1-052.js";
import "./EX1-071.js";

describe("EX1-071 Win Rate: 60%!", () => {
  it("can be used with a non-white Tamer without opening a separate waiver prompt", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-085", as: "redTamer" }],
          hand: [{ card: "EX1-071", as: "option" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-071"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("redTamer").permanentId)).toBe(true);
  });

  it("does not waive the color requirement for an opponent's Tamer", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX1-071", as: "option" }] },
      1: { battleArea: [{ card: "BT1-085", as: "opponentTamer" }] },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("trashes a same-color Digimon to reduce the next battle-area digivolution by 4", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX1-071", as: "option" },
            { card: "EX1-052", as: "evo" },
            { card: "EX1-050", as: "cost" },
          ],
          battleArea: [
            { card: "EX1-047", as: "base" },
            { card: "BT1-085", as: "tamer" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("cost").instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((c) => c.cardId === "EX1-071"));
    const before = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-052");
    expect(s.state.memory).toBe(before);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("cost").instanceId)).toBe(true);
  });

  it("does not trash a different-color Digimon or reduce the evolution", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX1-071", as: "option" },
            { card: "EX1-052", as: "evo" },
            { card: "ST1-03", as: "redCard" },
          ],
          battleArea: [
            { card: "EX1-047", as: "purpleBase" },
            { card: "BT1-085", as: "tamer" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 8 && s.state.players[0]!.trash.some((card) => card.cardId === "EX1-071"));
    const before = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("purpleBase").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("purpleBase").topCard.instanceId === s.inst("evo").instanceId);

    const paidWithWinRate = before - s.state.memory;
    const control = setupEngine(
      {
        0: {
          hand: [
            { card: "EX1-052", as: "controlEvo" },
            { card: "ST1-03", as: "controlRed" },
          ],
          battleArea: [
            { card: "EX1-047", as: "controlBase" },
            { card: "BT1-085", as: "controlTamer" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    control.state.memory = 10;
    await control.ready();
    expect(
      control.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: control.perm("controlBase").permanentId,
        instanceId: control.inst("controlEvo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => control.perm("controlBase").topCard.instanceId === control.inst("controlEvo").instanceId);

    expect(paidWithWinRate).toBe(10 - control.state.memory);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("redCard").instanceId);
  });

  it("accepts a Digimon matching a continuously added base color (Q3260)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX1-071", as: "option" },
            { card: "BT1-043", as: "evo" },
            { card: "BT1-029", as: "blueCost" },
          ],
          battleArea: [
            { card: "BT3-040", as: "yellowBase" },
            { card: "BT1-085", as: "tamer" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("blueCost").instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-071"));
    const before = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowBase").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yellowBase").topCard.instanceId === s.inst("evo").instanceId);

    expect(s.state.memory).toBe(before);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("blueCost").instanceId)).toBe(true);
  });

  it("may pay with a Digimon matching either DNA material's color (Q3263)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX1-071", as: "option" },
            { card: "BT13-059", as: "examon" },
            { card: "ST9-09", as: "greenCost" },
          ],
          battleArea: [
            { card: "EX3-024", as: "blueSlayerdramon" },
            { card: "EX3-044", as: "greenBreakdramon" },
            { card: "BT1-085", as: "tamer" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("greenCost").instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-071"));
    const before = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blueSlayerdramon").permanentId, s.perm("greenBreakdramon").permanentId],
        instanceId: s.inst("examon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT13-059"));

    expect(s.state.memory).toBe(before);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("greenCost").instanceId)).toBe(true);
  });

  it("does not trash a fifth Hybrid from hand before Takuya places five from trash (Q3261)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-085", as: "takuya" }],
          hand: [
            { card: "EX1-071", as: "option" },
            { card: "BT7-011", as: "handHybrid" },
          ],
          trash: ["BT7-011", "BT7-011", "BT7-011", "BT7-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-071"));

    const takuya = s.perm("takuya");
    const activatable = observe(s.engine).activatableEffects(takuya) as Array<{ effectKey: string }>;
    const mainEffect = activatable.find((entry) => entry.effectKey === "BT7-085/main-digivolve");
    expect(mainEffect).toBeUndefined();
    expect(s.perm("takuya").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT7-011")).toHaveLength(4);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("handHybrid").instanceId)).toBe(true);
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "EX1-071", as: "securityOption", faceUp: true }] } },
      { autoOrderTriggers: true },
    );
    const id = s.inst("securityOption").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === id)).toBe(true);
  });

  it("does not reduce a matching digivolution performed in the breeding area (Q3259)", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX1-047", as: "breedingBase" },
        battleArea: [{ card: "BT1-085", as: "tamer" }],
        hand: [{ card: "EX1-071", as: "option" }, { card: "EX1-052", as: "evo" }, { card: "EX1-050", as: "cost" }],
        deck: ["BT1-009"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-071"));
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("breedingBase").permanentId,
      instanceId: s.inst("evo").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("breedingBase").topCard.cardId === "EX1-052");
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
  });
});
