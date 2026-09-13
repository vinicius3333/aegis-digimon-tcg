import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-084.js";
import { compiled } from "./BT11-006.js";

describe("BT11-006 Tsunomon", () => {
  it("matches the catalog and carries the complete inherited contract", () => {
    expect(getCardDefinition("BT11-006")).toMatchObject({
      cardId: "BT11-006",
      nameEn: "Tsunomon",
      colors: ["Purple"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser"],
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When an effect trashes a card in your hand, this Digimon gets +1000 DP for the turn.",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenTrashedFromHand",
              requireByEffect: true,
              actions: [
                {
                  kind: "ModifyDP",
                  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                  amount: 1000,
                  duration: "forTheTurn",
                },
              ],
            },
          ],
          isInherited: true,
          frequency: "OncePerTurn",
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("gives its host +1000 DP when an opponent's effect trashes its controller's card (Q2047)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-079", as: "host", under: ["BT11-006"] },
            { card: "BT11-079", as: "second" },
            { card: "BT11-079", as: "third" },
          ],
          hand: [
            { card: "BT11-084", as: "first-evo" },
            { card: "BT11-084", as: "second-evo" },
            { card: "BT11-084", as: "third-evo" },
            { card: "BT1-010", as: "discard-one" },
            { card: "BT1-011", as: "discard-two" },
            { card: "BT1-012", as: "discard-three" },
            { card: "BT1-013", as: "discard-four" },
            { card: "BT1-014", as: "discard-five" },
            { card: "BT1-015", as: "discard-six" },
          ],
          deck: [
            "BT1-016",
            "BT1-017",
            "BT1-018",
            "BT1-019",
            "BT1-020",
            "BT1-021",
            "BT1-022",
            "BT1-023",
            "BT1-024",
            "BT1-025",
            "BT1-026",
            "BT1-027",
          ],
        },
        1: { deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    for (const alias of [
      "discard-one",
      "discard-two",
      "discard-three",
      "discard-four",
      "discard-five",
      "discard-six",
    ]) {
      preferred.push(s.inst(alias).instanceId);
    }
    s.state.memory = 10;
    const hostPermanentId = s.perm("host").permanentId;
    const before = s.perm("host").currentDP;
    const eggSourceId = s.perm("host").stack[0]!.instanceId;
    const firstSourceId = s.perm("host").topCard!.instanceId;
    const firstEvoId = s.inst("first-evo").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: hostPermanentId, instanceId: firstEvoId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.instanceId === firstEvoId && s.state.pendingDecision === undefined);
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.state.memory).toBe(7);
    expect(s.perm("host").permanentId).toBe(hostPermanentId);
    expect(s.perm("host").topCard?.instanceId).toBe(firstEvoId);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([eggSourceId, firstSourceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      ["discard-one", "discard-two"].map((alias) => s.inst(alias).instanceId),
    );

    const secondSourceId = s.perm("second").topCard!.instanceId;
    const secondEvoId = s.inst("second-evo").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("second").permanentId,
        instanceId: secondEvoId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("second").topCard?.instanceId === secondEvoId && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(4);
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      ["discard-one", "discard-two", "discard-three", "discard-four"].map((alias) => s.inst(alias).instanceId),
    );
    expect(s.perm("second").stack.map(({ instanceId }) => instanceId)).toEqual([secondSourceId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(6000);

    const thirdSourceId = s.perm("third").topCard!.instanceId;
    const thirdEvoId = s.inst("third-evo").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("third").permanentId, instanceId: thirdEvoId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("third").topCard?.instanceId === thirdEvoId && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      ["discard-one", "discard-two", "discard-three", "discard-four", "discard-five", "discard-six"].map(
        (alias) => s.inst(alias).instanceId,
      ),
    );
    expect(s.perm("third").stack.map(({ instanceId }) => instanceId)).toEqual([thirdSourceId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("applies the boost only once across two effect-trash events in the turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-075", as: "host", under: ["BT11-006"] }],
        hand: [
          { card: "BT1-010", as: "first" },
          { card: "BT1-011", as: "second" },
        ],
      },
    });
    const before = s.perm("host").currentDP;

    await advance(s.engine).verb.trash([s.inst("first").instanceId]);
    await settle(() => s.perm("host").currentDP === before + 1000);
    await advance(s.engine).verb.trash([s.inst("second").instanceId]);

    expect(s.perm("host").currentDP).toBe(before + 1000);
  });

  it("does not trigger when a rules path trashes a card in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-075", as: "host", under: ["BT11-006"] }],
        hand: [{ card: "BT1-010", as: "discard" }],
      },
    });
    const before = s.perm("host").currentDP;

    await advance(s.engine).fireSubTrigger("whenTrashedFromHand", {
      handTrashedSeat: 0,
      trashedFromHandCardId: "BT1-010",
      trashedFromHandInstanceId: s.inst("discard").instanceId,
    });

    expect(s.perm("host").currentDP).toBe(before);
  });

  it("does not trigger outside its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-075", as: "host", under: ["BT11-006"] }],
        hand: [{ card: "BT1-010", as: "discard" }],
      },
    });
    const before = s.perm("host").currentDP;
    s.state.turnSeat = 1;

    await advance(s.engine).verb.trash([s.inst("discard").instanceId], 1);

    expect(s.perm("host").currentDP).toBe(before);
  });
});
