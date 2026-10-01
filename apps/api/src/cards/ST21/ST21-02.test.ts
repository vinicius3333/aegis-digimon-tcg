import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST21-02 Gomamon", () => {
  it("matches the All Turns memory restriction and Tamer exception", () => {
    const action = runtimeCompiledCard("ST21-02")?.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0];

    expect(action).toEqual({
      kind: "RestrictMemoryGain",
      seat: "opponent",
      exceptTamerEffects: true,
      duration: "permanent",
    });
  });

  it("blocks only the opponent's non-Tamer effect memory gain on the live board", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST21-02", as: "gomamon" }] } });
    await s.ready();

    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Option"])).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Tamer"])).toBe(true);
    expect(observe(s.engine).canGainMemoryFromEffect(0, ["Digimon"])).toBe(true);
  });
});

describe("ST21-02 Gomamon — KB Q&A rulings", () => {
  async function useHammerSparkWithMimi(gomamonSeat: 0 | 1) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST2-03", as: "blueDigimon" },
            { card: "BT3-096", as: "mimi" },
            ...(gomamonSeat === 0 ? [{ card: "ST21-02", as: "gomamon" }] : []),
          ],
          hand: [{ card: "ST2-13", as: "hammerSpark" }],
        },
        1: { battleArea: gomamonSeat === 1 ? [{ card: "ST21-02", as: "gomamon" }] : [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hammerSpark").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("mimi").isSuspended && s.state.pendingDecision === undefined);
    return s;
  }

  it("stops the opponent's Option memory gain but not their Tamer's memory gain (Q4470)", async () => {
    const restricted = await useHammerSparkWithMimi(1);
    const gains = restricted.events.filter((event) => event.kind === "memoryChanged" && event.reason === "gainMemory");
    expect(gains).toHaveLength(1);
    expect(restricted.state.memory).toBe(4);

    const unaffectedController = await useHammerSparkWithMimi(0);
    expect(unaffectedController.state.memory).toBe(5);
  });

  it("lets a Tamer that is also treated as a Digimon gain memory by its effect (Q4471)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-087", as: "marcus" },
            { card: "ST1-03", as: "agumon" },
          ],
          hand: [{ card: "BT17-087", as: "secondMarcus" }],
        },
        1: { battleArea: [{ card: "ST21-02", as: "gomamon" }], security: ["ST1-03"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 10;
    await s.ready();
    preferInstanceIds.push(s.perm("marcus").topCard.instanceId);
    expect(observe(s.engine).canGainMemoryFromEffect(0, ["Digimon"])).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondMarcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.battleArea.length === 3);
    expect(s.state.memory).toBe(6);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("marcus").isSuspended).toBe(true);
    expect(s.state.memory).toBe(7);
  });
});
