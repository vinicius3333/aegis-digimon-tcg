import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { observe } from "./testkit/observe.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("BT20 Bakemon and new Violet Discord arena scenario", () => {
  it.fails("does not let Violet observe the evolution that played it", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-bt20-bakemon-violet-retroactive", s.state, [BLUE_DECK, RED_DECK]);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: "dev-perm-0-violet-ghostmon",
        instanceId: "dev-violet-bakemon",
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === "dev-violet-new-tamer") &&
        !s.state.pendingDecision,
    );

    const violet = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === "dev-violet-new-tamer")!;
    const bakemon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === "dev-violet-bakemon")!;
    expect(observe(s.engine).hasKeyword(bakemon, "Rush")).toBe(false);
    expect(violet.isSuspended).toBe(false);
  });

  it.fails("lets an established Violet trigger without also triggering the newly played copy", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-063", as: "ghostmon" },
            { card: "BT23-087", as: "establishedViolet" },
          ],
          hand: [
            { card: "BT20-068", as: "bakemon" },
            { card: "BT23-087", as: "newViolet" },
          ],
          deck: Array(12).fill("BT1-009"),
        },
        1: { deck: Array(12).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ghostmon").permanentId,
        instanceId: s.inst("bakemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("newViolet").instanceId),
    );
    await settle(() => !s.state.pendingDecision);

    const establishedViolet = s.perm("establishedViolet");
    const newViolet = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("newViolet").instanceId,
    )!;
    expect(establishedViolet.isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ghostmon"), "Rush")).toBe(true);
    expect(newViolet.isSuspended).toBe(false);
  });
});
