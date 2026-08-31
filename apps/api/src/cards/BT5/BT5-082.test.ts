import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT5-082.js";

describe("BT5-082 Tactimon", () => {
  it("has complete residual-free runtime coverage", () => {
    expect(runtimeCompiledCard("BT5-082")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("activates all 3 effects when no other own Digimon is in play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-082", as: "tacti" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "a" },
            { card: "BT1-013", as: "b" },
            { card: "BT1-027", as: "c" },
            { card: "BT5-075", as: "notLevel3" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoChooseOption: true, autoSelectCards: true },
    );
    const tacti = s.perm("tacti");
    const before = tacti.currentDP;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: tacti.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.memory === 1 && tacti.currentDP === before + 2000 && s.state.players[1]!.battleArea.length === 1,
    );

    expect(s.state.memory).toBe(1);
    expect(tacti.currentDP).toBe(before + 2000);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("notLevel3").topCard.cardId).toBe("BT5-075");
  });

  it("activates only the chosen mode when another own Digimon is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-082", as: "tacti" },
            { card: "BT5-071", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT5-061", as: "opponent" }], security: ["BT1-009"] },
      },
      { autoChooseOption: true, autoSelectCards: true },
    );
    const beforeDP = s.perm("tacti").currentDP;
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tacti").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);

    expect(s.perm("tacti").currentDP).toBe(beforeDP);
    expect(
      s.state.players[1]?.battleArea.some((permanent) => permanent.permanentId === s.perm("opponent").permanentId),
    ).toBe(true);
  });

  it.each([0, 1, 2])("allows the controller to choose mode %s when another Digimon is in play", async (mode) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-082", as: "tacti" },
            { card: "BT5-071", as: "ally" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3a" },
            { card: "BT1-013", as: "level3b" },
            { card: "BT1-027", as: "level3c" },
            { card: "BT5-075", as: "notLevel3" },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: mode, autoSelectCards: true },
    );
    const tacti = s.perm("tacti");
    const beforeDP = tacti.currentDP;
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: tacti.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.memory === (mode === 0 ? 1 : 0) &&
        tacti.currentDP === beforeDP + (mode === 1 ? 2000 : 0) &&
        s.state.players[1]!.battleArea.length === (mode === 2 ? 1 : 4),
    );

    expect(s.state.memory).toBe(mode === 0 ? 1 : 0);
    expect(tacti.currentDP).toBe(beforeDP + (mode === 1 ? 2000 : 0));
    expect(s.state.players[1]!.battleArea.length).toBe(mode === 2 ? 1 : 4);
    expect(s.perm("notLevel3").topCard.cardId).toBe("BT5-075");
  });

  it("lets the owner choose the activation order when no other Digimon is in play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-082", as: "tacti" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3a" },
            { card: "BT1-013", as: "level3b" },
            { card: "BT1-027", as: "level3c" },
            { card: "BT5-075", as: "notLevel3" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const tacti = s.perm("tacti");
    const beforeDP = tacti.currentDP;
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: tacti.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    const chosenOrder = [2, 1, 0];
    const offeredChoices: string[][] = [];
    for (const optionIndex of chosenOrder) {
      const previousChoices = s.decisions.filter(({ req }) => req.kind === "chooseOption").length;
      await settle(() => s.decisions.filter(({ req }) => req.kind === "chooseOption").length > previousChoices);
      const request = s.decisions.filter(({ req }) => req.kind === "chooseOption").at(-1)!;
      offeredChoices.push(request.req.options?.choices ?? []);
      expect(
        s.engine.applyIntent(request.seat, {
          type: "respondDecision",
          decisionId: request.req.decisionId,
          response: { kind: "chooseOption", optionIndex },
        }),
      ).toEqual({ ok: true });
    }
    await settle(
      () => s.state.memory === 1 && tacti.currentDP === beforeDP + 2000 && s.state.players[1]!.battleArea.length === 1,
    );

    expect(offeredChoices).toHaveLength(3);
    expect(offeredChoices[0]).toEqual([
      "Gain 1 memory",
      "This Digimon gets +2000 DP for the turn",
      "Delete up to 3 level 3 Digimon",
    ]);
    expect(offeredChoices[1]).toEqual(["Gain 1 memory", "This Digimon gets +2000 DP for the turn"]);
    expect(offeredChoices[2]).toEqual(["Gain 1 memory"]);
    expect(s.state.memory).toBe(1);
    expect(tacti.currentDP).toBe(beforeDP + 2000);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("notLevel3").topCard.cardId).toBe("BT5-075");
  });
});
