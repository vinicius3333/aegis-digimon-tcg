import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-009.js";

describe("EX8-009", () => {
  it("reveals 3 for Growlmon/Gallantmon and X Antibody cards on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand" },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
    });
  });
  it("inherits once-per-turn memory gain when an opposing Digimon is deleted during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "onDeletionOf", actions: [{ kind: "GainMemory", amount: 1 }] }],
    }));
  it("selects the printed name and X Antibody matches from the live reveal", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-009", as: "guilmon" }],
          deck: [
            { card: "AD1-003", as: "growlmon" },
            { card: "BT10-016", as: "xantibody" },
            { card: "AD1-001", as: "decoy" },
            { card: "BT1-045", as: "anchor" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guilmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.cardId === "AD1-003") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "BT10-016"),
    );
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["AD1-003", "BT10-016"]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-045", "AD1-001"]);
  });

  it("matches X Antibody by trait rather than requiring the words in the card name", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-009", as: "guilmon" }],
          deck: [
            { card: "AD1-003", as: "growlmon" },
            { card: "BT10-080", as: "traitOnlyXAntibody" },
            { card: "AD1-001", as: "decoy" },
            { card: "BT1-045", as: "anchor" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guilmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.cardId === "AD1-003") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "BT10-080"),
    );
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["AD1-003", "BT10-080"]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-045", "AD1-001"]);
  });

  it("gains memory for only the first opposing deletion during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX8-009", as: "guilmon" }] }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "opponent1" },
          { card: "BT1-010", as: "opponent2" },
        ],
      },
    });
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("opponent1").permanentId], "byEffect");
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
    await advance(s.engine).verb.deletePermanent([s.perm("opponent2").permanentId], "byEffect");
    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory on the opponent's turn or when its host is deleted simultaneously (Q3874)", async () => {
    const opponentTurn = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX8-009"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await opponentTurn.ready();
    opponentTurn.state.turnSeat = 1;
    opponentTurn.state.memory = 0;
    await advance(opponentTurn.engine).verb.deletePermanent([opponentTurn.perm("opponent").permanentId], "byEffect");
    expect(opponentTurn.state.memory).toBe(0);

    const simultaneous = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX8-009"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await simultaneous.ready();
    simultaneous.state.memory = 0;
    await advance(simultaneous.engine).verb.deletePermanent(
      [simultaneous.perm("host").permanentId, simultaneous.perm("opponent").permanentId],
      "byEffect",
    );
    expect(simultaneous.state.memory).toBe(0);
  });

  it("uses the Gigimon alternate for 0", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT12-001", as: "gigimon" },
          hand: [{ card: "EX8-009", as: "guilmon" }],
        },
      },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gigimon").permanentId,
        instanceId: s.inst("guilmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("gigimon").topCard.instanceId === s.inst("guilmon").instanceId,
    );
    expect(s.state.memory).toBe(0);
    expect(s.perm("gigimon").topCard.cardId).toBe("EX8-009");
  });

  it("finds both When Digivolving matches from a battle-area Guilmon base", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-009", as: "guilmonBase" }],
          hand: [{ card: "EX8-009", as: "guilmon" }],
          deck: [
            { card: "BT1-046", as: "digivolveDraw" },
            { card: "AD1-003", as: "growlmon" },
            { card: "BT10-080", as: "traitOnlyXAntibody" },
            { card: "AD1-001", as: "decoy" },
            { card: "BT1-045", as: "anchor" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("guilmonBase").permanentId,
        instanceId: s.inst("guilmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.cardId === "AD1-003") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "BT10-080"),
    );
    expect(s.state.memory).toBe(0);
    expect(s.perm("guilmonBase").topCard.cardId).toBe("EX8-009");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-046", "AD1-003", "BT10-080"]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-045", "AD1-001"]);
  });
});
