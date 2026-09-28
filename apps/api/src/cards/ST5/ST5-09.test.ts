import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST5-09.js";

describe("ST5-09 MetalGreymon", () => {
  it("is fully represented with the opponent-turn Blocker duration", () => {
    expect(runtimeCompiledCard("ST5-09")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [{ kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" }],
        },
      ],
    });
  });

  it("gives an own Digimon Blocker when digivolving", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST5-08", as: "base" },
            { card: "ST5-03", as: "target" },
          ],
          hand: [{ card: "ST5-09", as: "evolving" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("target"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);
  });

  it("may grant Blocker to itself and keeps it after another digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST5-08", as: "self" }],
          hand: [
            { card: "ST5-09", as: "metalGreymon" },
            { card: "ST5-12", as: "machinedramon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("self").permanentId,
        instanceId: s.inst("metalGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("self"), "Blocker"));
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("self").permanentId,
        instanceId: s.inst("machinedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("self").topCard.instanceId === s.inst("machinedramon").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("self"), "Blocker")).toBe(true);
  });
});

describe("ST5-09 MetalGreymon — KB Q&A rulings", () => {
  async function opponentAttacksPlayer(s: ReturnType<typeof setupEngine>, attacker: string): Promise<void> {
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm(attacker).permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
  }

  it("can give Blocker to MetalGreymon itself, which can then block (Q665)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST5-07", as: "self" },
            { card: "ST5-05", as: "bystander" },
          ],
          hand: [{ card: "ST5-09", as: "metalGreymon" }],
          security: 1,
        },
        1: { battleArea: [{ card: "ST5-05", as: "attacker" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("self").permanentId, s.perm("self").topCard.instanceId);
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("self").permanentId,
        instanceId: s.inst("metalGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("self"), "Blocker"));
    expect(s.perm("self").topCard.cardId).toBe("ST5-09");
    expect(observe(s.engine).hasKeyword(s.perm("self"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("bystander"), "Blocker")).toBe(false);

    await opponentAttacksPlayer(s, "attacker");
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("bystander").permanentId }).ok,
    ).toBe(false);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("self").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("self").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("keeps the granted Blocker after the Digimon digivolves into a Digimon without Blocker (Q666)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST5-07", as: "base" },
            { card: "ST5-05", as: "target" },
          ],
          hand: [
            { card: "ST5-09", as: "metalGreymon" },
            { card: "ST5-07", as: "jazardmon" },
          ],
          security: 1,
        },
        1: { battleArea: [{ card: "ST5-05", as: "attacker" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId, s.perm("target").topCard.instanceId);
    s.state.memory = 10;
    expect(getCardDefinition("ST5-07")?.effectText ?? "").not.toContain("Blocker");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metalGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("target"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("target").permanentId,
        instanceId: s.inst("jazardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.instanceId === s.inst("jazardmon").instanceId);
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);

    await opponentAttacksPlayer(s, "attacker");
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("target").permanentId })).toEqual(
      { ok: true },
    );
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
