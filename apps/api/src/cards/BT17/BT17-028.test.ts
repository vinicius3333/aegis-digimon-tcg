import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-028.js";
import "./index.js";
import "../BT1/BT1-029.js";
import "../BT19/BT19-021.js";

describe("BT17-028", () => {
  it("registers lowest-level return, security-to-hand, and deletion effects", () => {
    expect(compiled.effects).toHaveLength(4);
    expect(compiled.effects?.map((effect) => effect.trigger)).toEqual([
      "OnPlay",
      "WhenDigivolving",
      "YourTurn",
      "OnDeletion",
    ]);
    expect(compiled.effects?.[2]).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToHand",
          oncePerTurnKey: "BT17-028/hand-add",
          actions: [{ kind: "SecurityManipulation", op: "toHand", controller: "opponent", amount: 1, toTop: true }],
        },
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToOpponentHand",
          oncePerTurnKey: "BT17-028/hand-add",
          actions: [{ kind: "SecurityManipulation", op: "toHand", controller: "opponent", amount: 1, toTop: true }],
        },
      ],
    });
  });

  it("keeps the DigiXros recipe as exact Lobomon/KendoGarurumon aliases with -3", () => {
    expect(compiled.digiXrosRequirement).toEqual([
      {
        count: 3,
        materials: [{ names: ["Lobomon"] }, { names: ["KendoGarurumon"] }],
      },
    ]);
  });

  it("returns only the opposing Digimon with the strictly lowest level on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT17-028", as: "ancient" }] },
        1: {
          battleArea: [
            { card: "BT1-029", as: "lowest" },
            { card: "BT4-025", as: "higher" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 12;
    await s.ready();
    const lowestId = s.perm("lowest").topCard.instanceId;
    const higherId = s.perm("higher").topCard.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ancient").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === lowestId));

    expect(s.state.players[1]!.hand.some((card) => card.instanceId === lowestId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === higherId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === lowestId)).toBe(false);
  });

  it("returns the opposing lowest-level Digimon and draws the bonus card when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-038", as: "base" }],
          hand: [{ card: "BT17-028", as: "ancient" }],
          deck: [{ card: "BT1-012", as: "bonus" }],
        },
        1: {
          battleArea: [
            { card: "BT1-029", as: "lowest" },
            { card: "BT4-025", as: "higher" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();
    const lowestId = s.perm("lowest").topCard.instanceId;
    const higherId = s.perm("higher").topCard.instanceId;
    const bonusId = s.inst("bonus").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ancient").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === lowestId));

    expect(s.perm("base").topCard.cardId).toBe("BT17-028");
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT1-038");
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === lowestId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === higherId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bonusId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("rejects digivolving onto an off-color level-5 source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-013", as: "redBase" }],
          hand: [{ card: "BT17-028", as: "ancient" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("ancient").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.perm("redBase").topCard.cardId).toBe("BT17-013");
  });

  it("moves the opponent's top security to hand when its On Play effect returns a Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT17-028", as: "ancient" }] },
        1: {
          battleArea: [{ card: "BT1-029", as: "target" }],
          security: [{ card: "BT1-010", as: "topSecurity" }, "BT1-011"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 12;
    await s.ready();
    const targetId = s.perm("target").topCard!.instanceId;
    const topSecurityId = s.inst("topSecurity").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ancient").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.hand.some((card) => card.instanceId === targetId) &&
        s.state.players[1]!.hand.some((card) => card.instanceId === topSecurityId),
    );

    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === topSecurityId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  // The [Your Turn] effect carries two SubTrigger buses sharing one oncePerTurnKey:
  // whenEffectAddsToOpponentHand (above) and whenEffectAddsToHand (here). Both fire.
  // The earlier red was a fixture defect, not an engine seam: BT1-029 (the effect Draw
  // that feeds your own hand) was never imported, so its IR was unregistered and playing
  // it drew nothing. See docs/audits/BT17-reaudit/TEST-FIXTURE-CARD-REGISTRATION.md.
  it("moves the opponent's top security to hand when an effect adds to your own hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-028", as: "ancient" },
            { card: "BT1-029", as: "gabumon" },
          ],
          deck: [{ card: "BT1-012", as: "drawn" }],
        },
        1: { security: [{ card: "BT1-010", as: "topSecurity" }, "BT1-011"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 15;
    await s.ready();
    const topSecurityId = s.inst("topSecurity").instanceId;
    const drawnId = s.inst("drawn").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ancient").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-028"));

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gabumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === topSecurityId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === topSecurityId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("moves security once per turn and resets on the controller's next turn (Q2775)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-028", as: "ancient" },
            { card: "BT19-021", as: "bounce1" },
            { card: "BT19-021", as: "bounce2" },
            { card: "BT1-012", as: "spare" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-029", as: "opp1" },
            { card: "BT1-029", as: "opp2" },
            { card: "BT1-029", as: "opp3" },
          ],
          security: ["BT1-010", "BT1-011", "BT1-012"],
          deck: ["BT1-013", "BT1-014", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 18;
    await s.ready();

    // BT17-028's own On Play adds to the opponent's hand: the watcher fires once (3 -> 2).
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ancient").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 2);
    expect(s.state.players[1]!.security).toHaveLength(2);

    // Same turn, a second opponent-hand add (BT19-021) is refused by Once Per Turn (stays 2).
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bounce1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(2);

    // The controller's next turn resets the once-per-turn budget: it fires again (2 -> 1).
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 5;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bounce2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not move security from the digivolution bonus draw alone (Q2774)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-038", as: "base" }],
          hand: [{ card: "BT17-028", as: "ancient" }],
          deck: [{ card: "BT1-012", as: "bonus" }],
        },
        1: { security: ["BT1-010", "BT1-011"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();
    const bonusId = s.inst("bonus").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ancient").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === bonusId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bonusId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.hand).toHaveLength(0);
  });

  it("DigiXroses Lobomon and KendoGarurumon for the printed -3 reduction", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-028", as: "ancient" }],
          battleArea: [
            { card: "BT4-025", as: "lobomon" },
            { card: "BT4-027", as: "kendo" },
          ],
        },
        1: { battleArea: [{ card: "BT1-029", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 6;
    await s.ready();
    const targetId = s.perm("target").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ancient").instanceId,
        digiXros: {
          materialInstanceIds: [s.perm("lobomon").topCard.instanceId, s.perm("kendo").topCard.instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-028"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("ancient").stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT4-025", "BT4-027"]));
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("recovers a Tamer and Hybrid Digimon from trash, then plays a Tamer on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-028", as: "ancient" }],
          trash: [
            { card: "BT17-081", as: "tamer" },
            { card: "BT17-011", as: "hybrid" },
          ],
          hand: [{ card: "BT17-083", as: "playable" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-083"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT17-081")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT17-011")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-083")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT17-028")).toBe(true);
  });

  it("may play a Tamer on deletion without recovering anything first (Q2776)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-028", as: "ancient" }],
          hand: [{ card: "BT17-081", as: "tamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const tamerId = s.inst("tamer").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === tamerId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === tamerId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT17-028")).toBe(true);
  });
});
