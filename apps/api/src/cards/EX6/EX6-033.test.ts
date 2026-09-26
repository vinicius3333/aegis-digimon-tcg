import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-033.js";

describe("EX6-033 Turuiemon", () => {
  it("suspends one Digimon on play and digivolving and inherits attack DP reduction", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Suspend",
      optional: true,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "Suspend",
      optional: true,
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -2000 }],
    });
  });

  it("publicly suspends an opposing Digimon when played", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX6-033", as: "turuiemon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.perm("opponent").topCard!.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("turuiemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("turuiemon") !== undefined);
    expect(s.state.memory).toBe(5);
    await settle(() => s.perm("opponent").isSuspended);
    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("publicly evolves from a legal level 3, pays three memory, and preserves the source stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX6-032", as: "base" }], hand: [{ card: "EX6-033", as: "turuiemon" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("turuiemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === s.inst("turuiemon").instanceId);
    expect(s.state.memory).toBe(7);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX6-032"]);
  });

  it("publicly suspends an opposing Digimon when digivolving", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-032", as: "base" }], hand: [{ card: "EX6-033", as: "turuiemon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.perm("opponent").topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("turuiemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === s.inst("turuiemon").instanceId);
    await settle(() => s.perm("opponent").isSuspended);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX6-032"]);
  });

  it("publicly attacks and reduces an opposing Digimon by 2000 from its inherited attack effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-060", as: "host", under: ["EX6-033"] }] },
      1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
    });
    await s.ready();
    const before = s.perm("opponent").currentDP;
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("opponent").currentDP).toBe(before - 2000);
  });
});
