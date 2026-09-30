import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { digivolveTrashingUnderCards } from "./underCardTrash.testSupport.js";

describe("RB1-016 Amphimon", () => {
  it("prevents one blue Digimon deletion by returning three Jellymon-text cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-016", as: "amphimon" }],
          trash: ["RB1-011", "RB1-011", "RB1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("amphimon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.deck.length === 3);

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("amphimon").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "RB1-011")).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("does not prevent deletion when fewer than three Jellymon-text cards are available", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "RB1-016", as: "amphimon" }], trash: ["RB1-011", "RB1-011"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("amphimon").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "RB1-011")).toHaveLength(2);
  });

  it("trashes up to two paid blue cards into separate opponent stacks when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-014", as: "base" }],
          hand: [{ card: "RB1-016", as: "amphimon" }, "RB1-011", "RB1-011"],
        },
        1: {
          battleArea: [
            { card: "RB1-024", as: "first", under: ["RB1-017", "RB1-020"] },
            { card: "RB1-025", as: "second", under: ["RB1-017", "RB1-020"] },
            { card: "RB1-020", as: "returnable" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("amphimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "RB1-011").length === 2);

    expect(s.state.memory).toBe(6);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["RB1-014"]);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "RB1-011")).toHaveLength(2);
    expect(s.perm("second").stack).toHaveLength(2);
    expect(s.state.players[1]!.deck).toHaveLength(1);
  });

  it("uses the once-per-turn deletion replacement only once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "RB1-016", as: "amphimon" },
            { card: "RB1-012", as: "ally" },
          ],
          trash: ["RB1-011", "RB1-011", "RB1-011", "RB1-011", "RB1-011", "RB1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const amphimonId = s.perm("amphimon").permanentId;

    await advance(s.engine).verb.deletePermanent([s.perm("ally").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.deck.length === 3);
    await advance(s.engine).verb.deletePermanent([amphimonId], "byEffect");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === amphimonId)).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("resets the same Amphimon replacement on its next owner turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "RB1-016", as: "amphimon" },
            { card: "RB1-012", as: "firstAlly" },
            { card: "RB1-012", as: "secondAlly" },
          ],
          trash: ["RB1-011", "RB1-011", "RB1-011", "RB1-011", "RB1-011", "RB1-011"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const amphimonId = s.perm("amphimon").permanentId;
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("firstAlly").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.deck.length === 8);
    const secondReplacementIds = s.state.players[0]!.trash.filter((card) => card.cardId === "RB1-011").map(
      (card) => card.instanceId,
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === amphimonId)).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const beforeSecondReplacementDeck = s.state.players[0]!.deck.length;
    await advance(s.engine).verb.deletePermanent([s.perm("secondAlly").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.deck.length === beforeSecondReplacementDeck + 3);
    expect(secondReplacementIds.every((id) => s.state.players[0]!.deck.some((card) => card.instanceId === id))).toBe(
      true,
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === amphimonId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });
});

describe("RB1-016 Amphimon — KB Q&A rulings", () => {
  it("trashes a card under a different opponent Digimon and Tamer for each blue card (Q4093)", async () => {
    const { s } = await digivolveTrashingUnderCards({
      baseId: "RB1-014",
      evolvingId: "RB1-016",
      opponent: [
        { card: "RB1-024", as: "digimon", under: [{ card: "RB1-017", as: "digimonLower" }, { card: "RB1-020", as: "digimonUpper" }] },
        { card: "RB1-034", as: "tamer", under: [{ card: "BT1-010", as: "tamerLower" }, { card: "BT1-011", as: "tamerUpper" }] },
      ],
      targetAliases: ["digimon", "tamer"],
      underAliases: ["digimonLower", "tamerUpper"],
    });

    expect(s.perm("digimon").stack.map((card) => card.instanceId)).toEqual([s.inst("digimonUpper").instanceId]);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("tamerLower").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-011", "RB1-017"]);
  });

  it("lets its player trash any card under the target, not only the bottom one (Q4094)", async () => {
    const { s } = await digivolveTrashingUnderCards({
      baseId: "RB1-014",
      evolvingId: "RB1-016",
      blueCards: 1,
      opponent: [
        {
          card: "RB1-024",
          as: "digimon",
          under: [
            { card: "RB1-017", as: "bottom" },
            { card: "RB1-020", as: "middle" },
            { card: "BT1-009", as: "upper" },
          ],
        },
      ],
      targetAliases: ["digimon"],
      underAliases: ["middle"],
    });
    const stackChoice = s.decisions.filter(({ req }) => req.kind === "selectCards").at(-1)!.req;

    expect(JSON.stringify(stackChoice.options)).toContain(s.inst("bottom").instanceId);
    expect(JSON.stringify(stackChoice.options)).toContain(s.inst("upper").instanceId);
    expect(s.perm("digimon").stack.map((card) => card.instanceId)).toEqual([
      s.inst("bottom").instanceId,
      s.inst("upper").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("middle").instanceId]);
  });
});
