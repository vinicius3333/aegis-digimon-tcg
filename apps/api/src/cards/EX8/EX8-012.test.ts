import { digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX8-012.js";

describe("EX8-012", () => {
  it("registers the draw/trash digivolving effect", () =>
    expect(compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions.slice(0, 2)).toHaveLength(2));
  it("registers the once-per-turn inherited opponent-deletion memory effect", () =>
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
    }));
  it("keeps the conditional Guilmon recovery branch attached to digivolution", () => {
    expect(compiled.effects[0]?.actions[2]).toMatchObject({
      kind: "GainTriggeredEffect",
      gainedTrigger: "OnDeletion",
      duration: "untilOpponentTurnEnd",
    });
  });

  it("publishes the exact Growlmon alternate route", () => {
    expect(digivolutionRequirementsFor("EX8-012")).toContainEqual({
      names: ["Growlmon"],
      cost: 0,
      isAlternate: true,
    });
  });

  it("draws, trashes, and gains the Guilmon recovery effect over Growlmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-013", as: "growlmon" }],
          hand: [
            { card: "EX8-012", as: "xGrowlmon" },
            { card: "EX8-009", as: "guilmon" },
          ],
          deck: [
            { card: "BT1-009", as: "evolutionDraw" },
            { card: "BT1-010", as: "effectDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("growlmon").permanentId,
        instanceId: s.inst("xGrowlmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("guilmon").instanceId));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010"]),
    );

    await advance(s.engine).verb.deletePermanent([s.perm("growlmon").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("guilmon").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("guilmon").instanceId),
    ).toBe(true);
  });

  it("does not gain Guilmon recovery without a Growlmon or X Antibody stack card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "base" }],
          hand: [
            { card: "EX8-012", as: "xGrowlmon" },
            { card: "BT1-010", as: "discard" },
          ],
          trash: [{ card: "EX8-009", as: "guilmon" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xGrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("xGrowlmon").instanceId);

    await advance(s.engine).verb.deletePermanent([s.perm("base").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("guilmon").instanceId)).toBe(true);
  });

  it("expires the gained Guilmon recovery at the end of the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-013", as: "growlmon" }],
          hand: [
            { card: "EX8-012", as: "xGrowlmon" },
          ],
          trash: [{ card: "EX8-009", as: "guilmon" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-045"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("growlmon").permanentId,
        instanceId: s.inst("xGrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("growlmon").topCard.instanceId === s.inst("xGrowlmon").instanceId);

    s.state.memory = 0;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    await advance(s.engine).verb.deletePermanent([s.perm("growlmon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("guilmon").instanceId));
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("guilmon").instanceId)).toBe(true);
  });

  it("gains 1 memory when an opposing Digimon is deleted during its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", as: "host", under: [{ card: "EX8-012", as: "growlmon" }] }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("opponent").permanentId], "byEffect");
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when one of its own Digimon is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", as: "host", under: [{ card: "EX8-012", as: "growlmon" }] }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.length > 0);
    expect(s.state.memory).toBe(0);
  });

  it("gains memory only once and not on the opponent's turn or simultaneous host deletion (Q3875)", async () => {
    const oncePerTurn = setupEngine({
      0: { battleArea: [{ card: "AD1-001", as: "host", under: ["EX8-012"] }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-010", as: "second" },
        ],
      },
    });
    await oncePerTurn.ready();
    await advance(oncePerTurn.engine).verb.deletePermanent([oncePerTurn.perm("first").permanentId], "byEffect");
    await advance(oncePerTurn.engine).verb.deletePermanent([oncePerTurn.perm("second").permanentId], "byEffect");
    expect(oncePerTurn.state.memory).toBe(1);

    const opponentTurn = setupEngine({
      0: { battleArea: [{ card: "AD1-001", as: "host", under: ["EX8-012"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    await advance(opponentTurn.engine).verb.deletePermanent([opponentTurn.perm("opponent").permanentId], "byEffect");
    expect(opponentTurn.state.memory).toBe(0);

    const simultaneous = setupEngine({
      0: { battleArea: [{ card: "AD1-001", as: "host", under: ["EX8-012"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await simultaneous.ready();
    await advance(simultaneous.engine).verb.deletePermanent(
      [simultaneous.perm("host").permanentId, simultaneous.perm("opponent").permanentId],
      "byEffect",
    );
    expect(simultaneous.state.memory).toBe(0);
  });
});
