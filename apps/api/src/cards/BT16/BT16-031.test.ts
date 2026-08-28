import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-031.js";
import "../index.js";

describe("BT16-031", () => {
  it("models Barrier", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Barrier" }] });
  });

  it("returns a multicolor red and purple level 6 or lower Digimon from trash", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Return",
        to: "hand",
        optional: true,
        abortOnDecline: true,
        cost: { kind: "trash" },
      });
      expect(effect.actions?.[0]).toMatchObject({
        target: {
          filter: {
            zone: "trash",
            colorCount: 2,
            multicolor: true,
            colors: ["Red", "Purple"],
            levelComparison: { op: "lte", value: 6 },
          },
        },
      });
    }
    expect(compiled.effects?.[3]).toMatchObject({
      isInherited: true,
      actions: [{ kind: "ModifySecurityDP", amount: -3000, duration: "forTheTurn" }],
    });
  });

  it("trashes a hand card to return a qualifying multicolor Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT16-031", as: "gatomon" },
            { card: "BT1-009", as: "cost" },
          ],
          trash: [{ card: "BT16-010", as: "target" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gatomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT16-010"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT16-010")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("returns a qualifying card when digivolving from Salamon for 2 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-030", as: "salamon" }],
          hand: [
            { card: "BT16-031", as: "gatomon" },
            { card: "BT1-009", as: "cost" },
          ],
          trash: [{ card: "BT16-010", as: "target" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("salamon").permanentId,
        instanceId: s.inst("gatomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("salamon").topCard?.cardId === "BT16-031");

    expect(s.perm("salamon").topCard?.cardId).toBe("BT16-031");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT16-010")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("requires exactly two colors and rejects invalid level or color candidates", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT16-031", as: "gatomon" },
            { card: "BT1-009", as: "cost" },
          ],
          trash: [
            { card: "BT18-042", as: "threeColor" },
            { card: "BT10-071", as: "singleColor" },
            { card: "BT9-082", as: "levelSeven" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gatomon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT18-042", "BT10-071", "BT9-082"]);
  });

  it("encodes Salamon as the two-memory alternate evolution requirement", () => {
    expect(digivolutionRequirementsFor("BT16-031")).toEqual([
      { names: ["Salamon"], cost: 2, isAlternate: true },
    ]);
  });

  it("changes opposing Security Digimon DP without changing battle-area DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-031", as: "host", dp: 4000, under: ["BT16-031"] }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).securityDp(1)).toBe(-3000);
    expect(s.perm("host").currentDP).toBe(4000);
  });
});
