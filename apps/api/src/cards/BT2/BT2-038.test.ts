import type { PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-038.js";

describe("BT2-038 RizeGreymon", () => {
  it("plays a yellow Tamer from hand without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-035", as: "base" }],
          hand: [
            { card: "BT2-038", as: "evolving" },
            { card: "BT1-087", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      player.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
    );
    expect(s.state.memory).toBe(0);
  });

  it("suppresses the played Tamer's On Play effect even when another yellow Tamer is already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-035", as: "base" },
            { card: "BT2-087", as: "existingTamer" },
          ],
          hand: [
            { card: "BT2-038", as: "evolving" },
            { card: "BT1-087", as: "playedTamer" },
          ],
          security: [{ card: "BT2-033", as: "securityCard" }],
          deck: [{ card: "BT2-034", as: "deckTop" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("playedTamer").instanceId,
      ),
    );

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.hand[0]!.cardId).toBe("BT2-034");
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("securityCard").instanceId);
    expect(s.events.some((event) => event.kind === "effectActivated" && event.sourceCardId === "BT1-087")).toBe(false);
  });

  it("allows declining the optional Tamer play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-035", as: "base" }],
          hand: [
            { card: "BT2-038", as: "evolving" },
            { card: "BT1-087", as: "candidate" },
          ],
        },
      },
      { autoAcceptOptional: false },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolving").instanceId);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("grants Security Attack +1 to its host while its owner has 3 yellow Tamers", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-041", as: "host", under: ["BT2-038"] }, "BT1-087", "BT1-087", "BT1-087"],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("does not grant Security Attack +1 with only 2 yellow Tamers or during the opponent's turn", async () => {
    const twoTamers = setupEngine({
      0: { battleArea: [{ card: "BT2-041", as: "host", under: ["BT2-038"] }, "BT1-087", "BT1-087"] },
    });
    await twoTamers.engine.recomputeContinuousEffects();
    expect(observe(twoTamers.engine).keywordAmount(twoTamers.perm("host"), "SecurityAttack")).toBe(0);

    const opponentTurn = setupEngine({
      0: {
        battleArea: [{ card: "BT2-041", as: "host", under: ["BT2-038"] }, "BT1-087", "BT1-087", "BT1-087"],
      },
    });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.engine.recomputeContinuousEffects();
    expect(observe(opponentTurn.engine).keywordAmount(opponentTurn.perm("host"), "SecurityAttack")).toBe(0);
  });
});
