import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { observe } from "./testkit/observe.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("BT20 Bakemon and new Violet Discord arena scenario", () => {
  it("does not let Violet observe the evolution that played it", async () => {
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
    expect(
      s.events.some((event) => event.kind === "effectTriggered" && event.sourceInstanceId === "dev-violet-new-tamer"),
    ).toBe(false);
    expect(observe(s.engine).hasKeyword(bakemon, "Rush")).toBe(false);
    expect(violet.isSuspended).toBe(false);
  });

  it("lets an established Violet trigger without also triggering the newly played copy", async () => {
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
    expect(
      s.events.filter(
        (event) => event.kind === "effectTriggered" && event.sourceInstanceId === s.inst("newViolet").instanceId,
      ),
    ).toHaveLength(0);
    expect(establishedViolet.isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ghostmon"), "Rush")).toBe(true);
    expect(newViolet.isSuspended).toBe(false);
  });

  it("does not let Violet played by an effect-driven Bakemon evolution see that evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-098", as: "option" },
            { card: "BT23-087", as: "establishedViolet" },
            { card: "BT23-061", as: "firstGhost" },
            { card: "BT23-061", as: "effectGhost" },
          ],
          hand: [
            { card: "BT4-080", as: "firstEvolver" },
            { card: "BT20-068", as: "effectBakemon" },
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
        permanentId: s.perm("firstGhost").permanentId,
        instanceId: s.inst("firstEvolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("effectGhost").topCard.instanceId === s.inst("effectBakemon").instanceId);
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("newViolet").instanceId),
    );
    await settle(() => !s.state.pendingDecision);

    const newViolet = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("newViolet").instanceId,
    )!;
    expect(s.perm("establishedViolet").isSuspended).toBe(true);
    expect(newViolet.isSuspended).toBe(false);
  });

  it("does not let Growlmon's newly played Takato react to that Growlmon evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-007", as: "base" }],
          hand: [
            { card: "BT19-009", as: "growlmon" },
            { card: "BT19-080", as: "takato" },
          ],
          deck: Array(12).fill("BT1-009"),
        },
        1: { deck: Array(12).fill("BT1-009"), security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("takato").instanceId),
    );
    await settle(() => !s.state.pendingDecision);

    const takato = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("takato").instanceId,
    )!;
    expect(takato.isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Raid")).toBe(false);
  });

  it("lets an established Takato react to Growlmon's evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-007", as: "base" },
            { card: "BT19-080", as: "takato" },
          ],
          hand: [{ card: "BT19-009", as: "growlmon" }],
          deck: Array(12).fill("BT1-009"),
        },
        1: { deck: Array(12).fill("BT1-009"), security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takato").isSuspended && !s.state.pendingDecision);

    expect(observe(s.engine).hasKeyword(s.perm("base"), "Raid")).toBe(true);
  });
});
