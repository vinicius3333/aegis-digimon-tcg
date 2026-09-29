import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-106.js";

describe("BT7-106 Brave Metal", () => {
  it("deletes an opposing Digimon with play cost 6 or less", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT7-056"], hand: [{ card: "BT7-106", as: "option" }] },
        1: { battleArea: [{ card: "BT7-044", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("may use the loaded X-Antibody alternative to delete a higher-cost non-X Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT7-056",
              under: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
            },
          ],
          hand: [{ card: "BT7-106", as: "option" }],
        },
        1: { battleArea: [{ card: "BT7-066", as: "highCostTarget" }] },
      },
      { autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

describe("BT7-106 Brave Metal — KB Q&A rulings", () => {
  const loadedDorumon = {
    card: "BT7-056",
    under: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
  };
  const opponentBoardCardIds = (s: ReturnType<typeof setupEngine>) =>
    s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId);

  it("deletes an opposing play cost 6 or less [X Antibody] Digimon without a loaded [X Antibody] Digimon (Q1671)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT7-056"], hand: [{ card: "BT7-106", as: "option" }] },
        1: {
          battleArea: ["BT7-056", "BT7-066"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(opponentBoardCardIds(s)).toEqual(["BT7-066"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT7-056");
    const offeredChoices = s.decisions
      .filter(({ req }) => req.kind === "chooseOption")
      .flatMap(({ req }) => req.options?.choices ?? []);
    expect(offeredChoices).not.toContain("Instead, delete a Digimon without [X Antibody] in its traits");
  });

  it("still lets the owner delete an opposing play cost 6 or less [X Antibody] Digimon with a loaded [X Antibody] Digimon (Q1672)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [loadedDorumon], hand: [{ card: "BT7-106", as: "option" }] },
        1: {
          battleArea: ["BT7-056", "BT7-066"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    const optionRequests = () => s.decisions.filter(({ req }) => req.kind === "chooseOption");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => optionRequests().length > 0);
    const request = optionRequests().at(-1)!;
    expect(request.req.options?.choices).toEqual([
      "Delete a Digimon with play cost 6 or less",
      "Instead, delete a Digimon without [X Antibody] in its traits",
    ]);
    expect(
      s.engine.applyIntent(request.seat, {
        type: "respondDecision",
        decisionId: request.req.decisionId,
        response: { kind: "chooseOption", optionIndex: 0 },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(opponentBoardCardIds(s)).toEqual(["BT7-066"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT7-056");
  });
});
