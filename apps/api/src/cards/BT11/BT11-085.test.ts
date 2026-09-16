import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-086.js";
import { compiled } from "./BT11-085.js";

describe("BT11-085 WaruSeadramon", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-085")).toMatchObject({
      cardId: "BT11-085",
      colors: ["Purple", "Blue"],
      level: 5,
      playCost: 8,
      dp: 8000,
      types: ["Aquatic"],
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "OnPlay", actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"] }] },
      { trigger: "WhenDigivolving", actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"] }] },
      { trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger" }] },
    ]);
  });

  it("plays a blue level 3 from an own blue Digimon's sources when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-079", as: "base", under: [{ card: "BT1-029", as: "source" }] }],
          hand: [{ card: "BT11-085", as: "waru" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("waru").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("source").instanceId),
    );
  });

  it("also plays a purple level 3 from an own blue Digimon's sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-027", as: "base", under: [{ card: "BT10-073", as: "source" }] }],
          hand: [{ card: "BT11-085", as: "waru" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("waru").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("source").instanceId),
    );
  });

  it("inherits the effect-play watcher through a legal evolution and suppresses the second play that turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-079", as: "base", under: ["BT11-075"] }],
          hand: [
            { card: "BT11-085", as: "waru" },
            { card: "BT11-086", as: "merva-digivolve" },
            { card: "BT11-086", as: "merva-play" },
            { card: "BT11-086", as: "merva-next-turn" },
          ],
          trash: [
            { card: "BT11-079", as: "first-play" },
            { card: "BT11-079", as: "second-play" },
            { card: "BT11-079", as: "third-play" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("first-play").instanceId, s.inst("second-play").instanceId, s.inst("third-play").instanceId);
    s.state.memory = 10;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("waru").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-085" && s.state.pendingDecision === undefined);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("merva-digivolve").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("first-play").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(3);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("merva-play").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("second-play").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(-8);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("merva-next-turn").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("third-play").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(-7);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
