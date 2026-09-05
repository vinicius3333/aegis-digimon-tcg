import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-085.js";
import "../BT5/BT5-015.js";
import "../BT2/BT2-020.js";
import "./EX1-051.js";

describe("EX1-051 Infermon", () => {
  it("gains 1 memory when an opponent digivolves into level 5 or higher on their turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-051", as: "infermon" }],
          hand: ["BT1-009"],
          deck: ["BT1-001", "BT1-002"],
          security: ["BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-021", as: "opponent" },
            { card: "BT1-021", as: "opponentTwo" },
          ],
          hand: [
            { card: "BT5-015", as: "evo" },
            { card: "BT5-015", as: "evoTwo" },
          ],
          deck: ["BT1-001", "BT1-002"],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("opponent").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").topCard.cardId === "BT5-015");
    expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "gainMemory")).toHaveLength(1);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("opponentTwo").permanentId,
        instanceId: s.inst("evoTwo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponentTwo").topCard.cardId === "BT5-015");
    expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "gainMemory")).toHaveLength(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("gives all other Digimon with the host's name +2000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-072", as: "host", under: ["EX1-047", "EX1-051"] },
          { card: "BT11-072", as: "other", dp: 11000 },
          { card: "EX1-051", as: "wrongName", dp: 7000 },
        ],
      },
    });
    await s.ready();
    expect(s.perm("other").currentDP).toBe(13000);
    expect(s.perm("wrongName").currentDP).toBe(7000);
  });

  it("does not trigger for a breeding-area digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-051", as: "infermon" }],
          hand: ["BT1-009"],
          deck: ["BT1-001", "BT1-002"],
          security: ["BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "filler" }],
          breeding: { card: "EX1-047", as: "breeding" },
          hand: [{ card: "EX1-050", as: "evo" }, "BT1-009"],
          deck: ["BT1-001", "BT1-002"],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === "Breeding" && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("breeding").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("breeding").topCard.cardId === "EX1-050");
    expect(s.events.some((event) => event.kind === "memoryChanged" && event.reason === "gainMemory")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not trigger during your own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-051", as: "infermon" },
          { card: "EX1-047", as: "base" },
        ],
        hand: [{ card: "EX1-050", as: "evo" }],
        deck: ["BT1-001", "BT1-002"],
        security: ["BT1-001", "BT1-001"],
      },
      1: { deck: ["BT1-001", "BT1-002"], security: ["BT1-001", "BT1-001"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-050");
    expect(s.events.some((event) => event.kind === "memoryChanged" && event.reason === "gainMemory")).toBe(false);
  });

  it("does not gain memory when the opponent's digivolution deletes this source (Q3238)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-051", as: "infermon", dp: 6000 }],
          hand: ["BT1-009"],
          deck: ["BT1-001", "BT1-002"],
          security: ["BT1-001", "BT1-001"],
        },
        1: {
          hand: [{ card: "BT2-020", as: "evo" }],
          battleArea: [
            { card: "BT1-085", as: "tai" },
            { card: "BT1-021", as: "base" },
          ],
          deck: ["BT1-001", "BT1-002"],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.events.some((event) => event.kind === "memoryChanged" && event.reason === "gainMemory")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
