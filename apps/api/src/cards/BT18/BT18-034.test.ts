import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-034.js";

describe("BT18-034 Lucemon", () => {
  it("keeps the alternate digivolution requirement and the Q4999 exclusion visible in the compiled IR", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Cupimon"], cost: 5, isAlternate: true }]);
    expect(compiled.effects[2]).toMatchObject({
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["trash"],
          payCost: false,
          ignoreRequirements: false,
          optional: true,
          cost: { kind: "placeAsSecurity", destination: "security", position: "top" },
          into: { excludeCardIds: ["BT7-111"] },
        },
      ],
    });
  });

  it("trashes the hand cost, lets the opponent trash security, and recovers when they decline", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-034", as: "lucemon" },
            { card: "BT1-001", as: "cost" },
          ],
          deck: ["BT1-002"],
          security: ["BT1-003"],
        },
        1: { security: ["BT1-003"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("cost").instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lucemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("lucemon").instanceId),
    );
    await settle(() => s.state.players[0]!.security.length === 2 && s.state.players[1]!.security.length === 1);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security[0]!.cardId).toBe("BT1-002");
    assertNoLoudGap(s);
  });

  it("recovers the exact deck card when the opponent has no security to trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-034", as: "lucemon" },
            { card: "BT1-001", as: "cost" },
          ],
          deck: ["BT1-002"],
          security: ["BT1-003"],
        },
        1: { security: [] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lucemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("lucemon").instanceId),
    );
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT1-002"));

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security[0]!.cardId).toBe("BT1-002");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not recover when the opponent accepts and trashes their top security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-034", as: "lucemon" }],
          hand: [{ card: "BT1-009", as: "handCost" }],
          deck: [{ card: "BT1-010", as: "recoveryCard" }],
          security: ["BT1-011"],
        },
        1: { security: [{ card: "BT1-012", as: "opponentTopSecurity" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    s.state.turnSeat = 0;
    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("handCost").instanceId)).toBe(true);
    expect(
      s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("opponentTopSecurity").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.deck.some(({ instanceId }) => instanceId === s.inst("recoveryCard").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("places a level 6 Digimon on top of security to digivolve into a legal Chaos Mode from trash for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-034", as: "lucemon" },
            { card: "BT1-063", as: "levelSixCost" },
          ],
          trash: [{ card: "BT18-082", as: "chaosMode" }],
          security: [{ card: "BT1-009", as: "oldTopSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).runTurn(0);

    expect(s.perm("lucemon").topCard?.instanceId).toBe(s.inst("chaosMode").instanceId);
    expect(s.perm("lucemon").stack.map(({ cardId }) => cardId)).toEqual(["BT18-034"]);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("levelSixCost").instanceId);
    expect(s.state.players[0]!.security[1]!.instanceId).toBe(s.inst("oldTopSecurity").instanceId);
    // runTurn completes the turn and passes priority, normalizing memory.
    expect(s.state.memory).toBe(-3);
    assertNoLoudGap(s);
  });

  it("rejects BT7-111 under Q4999 without paying the level 6 security cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-034", as: "lucemon" },
            { card: "BT1-063", as: "levelSixCost" },
          ],
          trash: [{ card: "BT7-111", as: "illegalChaosMode" }],
          security: [{ card: "BT1-009", as: "oldTopSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).runTurn(0);

    expect(s.perm("lucemon").topCard?.cardId).toBe("BT18-034");
    expect(s.perm("levelSixCost")).toBeDefined();
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("oldTopSecurity").instanceId,
    ]);
    expect(
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("illegalChaosMode").instanceId),
    ).toBe(true);
    assertNoLoudGap(s);
  });
});
