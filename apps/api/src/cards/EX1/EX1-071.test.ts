import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT3/BT3-040.js";
import "../BT13/BT13-059.js";
import "../EX2/EX2-070.js";
import "../BT7/BT7-085.js";
import "../BT7/BT7-112.js";
import "../BT8/BT8-057.js";
import "../BT10/BT10-050.js";
import "../BT10/BT10-052.js";
import "../BT15/BT15-045.js";
import "../BT6/BT6-087.js";
import "../BT6/BT6-018.js";
import "../BT12/BT12-017.js";
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
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-071"));

    const takuya = s.perm("takuya");
    const activatable = observe(s.engine).activatableEffects(takuya) as Array<{ effectKey: string }>;
    const mainEffect = activatable.find((entry) => entry.effectKey === "BT7-085/main-digivolve");
    expect(mainEffect).toBeUndefined();
    expect(s.perm("takuya").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT7-011")).toHaveLength(4);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("handHybrid").instanceId)).toBe(true);
  });

  it("trashes a red card when reducing a red-base-to-white digivolution (Q3258)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-020", as: "redBase" },
            { card: "BT1-085", as: "tamer" },
          ],
          hand: [
            { card: "EX1-071", as: "option" },
            { card: "AD1-005", as: "whiteEvo" },
            { card: "BT1-020", as: "redCost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("redCost").instanceId);
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
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("whiteEvo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("redBase").topCard.cardId === "AD1-005");
    expect(s.state.memory).toBe(before);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("redCost").instanceId)).toBe(true);
  });

  it("trashes a card matching either color of a multicolor base (Q3262)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-040", as: "multicolorBase" },
            { card: "BT1-085", as: "tamer" },
          ],
          hand: [
            { card: "EX1-071", as: "option" },
            { card: "BT11-041", as: "evo" },
            { card: "BT3-040", as: "yellowCost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("yellowCost").instanceId);
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
        permanentId: s.perm("multicolorBase").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("multicolorBase").topCard.cardId === "BT11-041");
    expect(s.state.memory).toBe(before);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("yellowCost").instanceId)).toBe(true);
  });

  it("reduces an effect-driven Digimon evolution after Win Rate is used (Q3264)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "agumon" },
            { card: "BT6-087", as: "tai" },
          ],
          hand: [
            { card: "EX1-071", as: "option" },
            { card: "BT6-018", as: "bond" },
            { card: "BT1-020", as: "redCost" },
          ],
          deck: ["BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("redCost").instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-071"));
    const before = s.state.memory;
    const tai = s.perm("tai");
    const mainEffect = (observe(s.engine).activatableEffects(tai) as Array<{ effectKey: string }>).find(
      (entry) => entry.effectKey === "BT6-087/main-digivolve-bond-of-bravery",
    );
    expect(mainEffect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: tai.topCard.instanceId,
        effectKey: mainEffect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard.cardId === "BT6-018");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("redCost").instanceId)).toBe(true);
    expect(s.state.memory).toBe(before);
  });

  it("does not let Win Rate bypass Digivolution Plug-In S's printed cost cap (Q3359)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-047", as: "base" },
            { card: "BT1-085", as: "tamer" },
          ],
          hand: [
            { card: "EX1-071", as: "option" },
            { card: "EX2-070", as: "plugIn" },
            { card: "BT11-041", as: "tooExpensive" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-071"));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("plugIn").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX2-070"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tooExpensive").instanceId)).toBe(true);
    expect(s.perm("base").topCard.cardId).toBe("EX1-047");
  });

  it("processes Susanoomon's alternate Tamer effect before Win Rate (Q1688)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-085", as: "takuya" }],
          hand: [
            { card: "EX1-071", as: "option" },
            { card: "BT7-112", as: "susanoomon" },
            { card: "BT1-020", as: "sameColorHand" },
          ],
          trash: [
            "BT7-011",
            "BT7-011",
            "BT7-011",
            "BT7-011",
            "BT7-011",
            "BT7-011",
            "BT7-011",
            "BT7-011",
            "BT7-011",
            "BT7-011",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
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
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("susanoomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT7-112");
    expect(s.state.memory).toBe(before - 7);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("sameColorHand").instanceId)).toBe(true);
  });

  it("keeps Win Rate's pending reduction after Shivamon suspends and locks Options (Q1736)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX1-071", as: "option" },
            { card: "BT15-045", as: "suspender" },
            { card: "BT10-052", as: "greenEvo" },
            { card: "ST9-09", as: "greenCost" },
            { card: "BT1-106", as: "lockedOption" },
          ],
          battleArea: [
            { card: "BT10-050", as: "greenBase" },
            { card: "BT1-085", as: "tamer" },
          ],
          deck: ["BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT8-057", as: "shivamon" }],
          deck: ["BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001"],
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
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("shivamon").isSuspended);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lockedOption").instanceId }).ok).toBe(false);
    const before = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenBase").permanentId,
        instanceId: s.inst("greenEvo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greenBase").topCard.cardId === "BT10-052");
    expect(s.state.memory).toBe(before);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("greenCost").instanceId)).toBe(true);
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

  it("adds itself to its owner's hand during a real security check", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      1: { security: [{ card: "EX1-071", as: "securityOption" }] },
    });
    const id = s.inst("securityOption").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === id));

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === id)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === id)).toBe(false);
  });

  it("does not reduce a matching digivolution performed in the breeding area (Q3259)", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX1-047", as: "breedingBase" },
          battleArea: [{ card: "BT1-085", as: "tamer" }],
          hand: [
            { card: "EX1-071", as: "option" },
            { card: "EX1-052", as: "evo" },
            { card: "EX1-050", as: "cost" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-071"));
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("breedingBase").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("breedingBase").topCard.cardId === "EX1-052");
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
  });
});
