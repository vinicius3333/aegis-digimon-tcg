import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-005.js";

describe("EX2-005 Hopmon", () => {
  it("gives its host +1000 DP while its controller has a black Tamer", async () => {
    const s = setupEngine({
      0: {
        // Legal stack: Hopmon -> Monodramon -> Guardromon.
        battleArea: [{ card: "EX2-031", as: "host", under: ["EX2-005", "EX2-030"] }, "BT10-092"],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("does not boost its host for a non-black Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-031", as: "host", under: ["EX2-005", "EX2-030"] }, "EX2-056"] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("does not grant the bonus during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-031", as: "host", under: ["EX2-005", "EX2-030"] }, "BT10-092"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("does not count a black Tamer controlled by the opponent", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-031", as: "host", under: ["EX2-005", "EX2-030"] }] },
      1: { battleArea: ["BT10-092"] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("keeps the inherited bonus through a legal hatch, paid evolution, and stack transition", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "EX2-005", as: "egg" }],
          hand: [
            { card: "EX2-030", as: "monodramon" },
            { card: "EX2-031", as: "guardromon" },
          ],
          battleArea: ["BT10-092"],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-012"],
        },
        1: { battleArea: ["BT1-009"], deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX2-005");
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: s.inst("monodramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX2-030");
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.instanceId)).toEqual([eggInstanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(2);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingPermanentId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === breedingPermanentId),
    );
    const host = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === breedingPermanentId)!;

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: s.inst("guardromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => host.topCard?.cardId === "EX2-031");
    expect(host.stack.map((card) => card.instanceId)).toEqual([eggInstanceId, s.inst("monodramon").instanceId]);
    expect(s.state.memory).toBe(1);
    expect(host.currentDP).toBe(5000);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("rejects evolving a black Digimon onto a non-black source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-015", as: "blueSource" }], hand: [{ card: "EX2-031", as: "guardromon" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueSource").permanentId,
        instanceId: s.inst("guardromon").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });
});
