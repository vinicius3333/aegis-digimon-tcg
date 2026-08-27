import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST10/ST10-15.js";
import "../BT10/BT10-076.js";
import "../BT2/BT2-075.js";
import "./P-019.js";
import "./P-027.js";
import "./P-034.js";
import "./P-046.js";
import "./P-077.js";
import "./P-085.js";

describe("Purple trash promo decks", () => {
  it("turns Dracmon into Troopmon from trash, then pays Troopmon's opponent-turn source cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-085", as: "dracmon" }],
          trash: [{ card: "BT10-076", as: "troopmon" }],
          battleArea: [{ card: "BT4-097", as: "purple-tamer" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent-rookie" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dracmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const evolved = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT10-076");
      return evolved?.stack.some((card) => card.instanceId === s.inst("dracmon").instanceId) === true;
    });
    const troopmon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT10-076")!;
    const troopmonId = troopmon.permanentId;
    const liveTroopmon = () =>
      s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === troopmonId)!;
    const dracmonId = s.inst("dracmon").instanceId;
    expect(troopmon.stack.some((card) => card.instanceId === dracmonId)).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    const opponentRookie = s.perm("opponent-rookie");
    // Drive the production event bus directly: this scenario proves Troopmon's response to an
    // opposing play, while PlayWithoutCost/whenPlayed emission is covered by the engine suite.
    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: opponentRookie.permanentId,
    });
    // Auto-decisions are drained by the engine's queued continuation. Yield one event-loop turn
    // before polling microtasks so this remains deterministic under collection-wide parallel load.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await settle(
      () =>
        liveTroopmon().stack.every((card) => card.instanceId !== dracmonId) &&
        s.state.players[0]!.trash.some((card) => card.instanceId === dracmonId) &&
        s.state.memory === -1,
      2_000,
    );

    expect({
      stackCleared: liveTroopmon().stack.every((card) => card.instanceId !== dracmonId),
      movedToTrash: s.state.players[0]!.trash.some((card) => card.instanceId === dracmonId),
      memory: s.state.memory,
    }).toEqual({ stackCleared: true, movedToTrash: true, memory: -1 });
  });

  it("chains Wizardmon top-deck setup, MetalGarurumon Digi-Burst, an Option, and deck trash triggers", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-081", as: "wizardHost", under: ["P-077", "BT2-075"] },
            { card: "P-027", as: "metalGarurumon", under: ["P-046", "P-019", "P-034"] },
          ],
          hand: [
            { card: "ST10-15", as: "darknessWave" },
            { card: "BT2-107", as: "topDeckOption" },
          ],
          deck: [{ card: "P-077", as: "milledWizardmon" }, "BT1-001", "BT1-002"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 1000 }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(
      s.inst("topDeckOption").instanceId,
      s.perm("metalGarurumon").stack[1]!.instanceId,
      s.perm("metalGarurumon").stack[2]!.instanceId,
    );
    const topDeckOptionId = s.inst("topDeckOption").instanceId;
    const milledWizardmonId = s.inst("milledWizardmon").instanceId;
    const darknessWaveId = s.inst("darknessWave").instanceId;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("wizardHost").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck[0]?.instanceId === topDeckOptionId);
    await settle();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("metalGarurumon").topCard.instanceId,
        effectKey: "P-027/digi-burst-use-option",
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.memory === 2 &&
        s.state.players[0]!.trash.some((card) => card.instanceId === milledWizardmonId) &&
        s.state.players[0]!.trash.some((card) => card.instanceId === darknessWaveId),
    );

    expect(s.perm("metalGarurumon").stack.map((card) => card.cardId)).toEqual(["P-046"]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === topDeckOptionId)).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("combines inherited Retaliation and the seventh-Devimon DanDevimon play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-069", as: "attacker", under: ["P-019", "P-034"], dp: 1000 }],
          trash: [{ card: "BT4-088", as: "danDevimon" }, "BT2-074", "BT3-088", "BT4-081", "BT4-084", "BT5-027"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "defender", suspended: true, dp: 5000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const attackerId = s.perm("attacker").permanentId;
    const defenderId = s.perm("defender").permanentId;
    const danDevimonId = s.inst("danDevimon").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === defenderId) &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === danDevimonId),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === danDevimonId)).toBe(
      true,
    );
  });
});
