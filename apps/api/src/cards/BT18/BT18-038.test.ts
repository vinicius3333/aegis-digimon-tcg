import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-038.js";
import "./BT18-019.js";

describe("BT18-038 ArkhaiAngemon", () => {
  it("gains the Angel trait and resolves its security placement path", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-038", as: "arkhai" },
            { card: "BT1-063", as: "angel" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "SecurityManipulation", op: "placeAsSecurity", from: ["hand"], toTop: false, optional: true },
        {
          kind: "SecurityManipulation",
          op: "toHand",
          amount: 1,
          optional: false,
          condition: { kind: "securityAtLeast", value: 4 },
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Angel"] }],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["Angel"], cost: 3, isAlternate: true }]);
    await s.ready();

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arkhai").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 3 && s.state.players[0]!.hand.length === 1);

    expect(observe(s.engine).hasEffectiveTrait(s.perm("arkhai"), "Angel")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT1-063")).toBe(true);
    assertNoLoudGap(s);
  });

  it("may decline the bottom placement but must still take top security when starting at 4", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-038", as: "arkhai" },
            { card: "BT1-063", as: "declinedAngel" },
          ],
          security: [{ card: "BT1-009", as: "topSecurity" }, "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arkhai").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 3);

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("topSecurity").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("declinedAngel").instanceId)).toBe(
      true,
    );
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("uses the Angel-trait alternate requirement to evolve from a blue level 4 for 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-023", as: "blueAngel" }],
        hand: [{ card: "BT18-038", as: "arkhai" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueAngel").permanentId,
        instanceId: s.inst("arkhai").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blueAngel").topCard?.instanceId === s.inst("arkhai").instanceId);

    expect(s.state.memory).toBe(2);
    expect(s.perm("blueAngel").stack.map(({ cardId }) => cardId)).toEqual(["BT3-023"]);
    assertNoLoudGap(s);
  });

  it("recovers the exact deck card when a host carrying its inherited effect is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-063", as: "host", under: ["BT18-038"] }],
          security: [{ card: "BT1-009", as: "oldSecurity" }],
          deck: [{ card: "BT1-010", as: "recovered" }],
        },
        1: { hand: [{ card: "BT18-019", as: "opponentRemover" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentRemover").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 2);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("host").permanentId)).toBe(
      false,
    );
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("recovered").instanceId);
    expect(s.state.players[0]!.security[1]!.instanceId).toBe(s.inst("oldSecurity").instanceId);
    assertNoLoudGap(s);
  });
});
