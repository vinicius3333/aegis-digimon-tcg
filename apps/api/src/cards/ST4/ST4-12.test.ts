import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type SeatSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT4/BT4-090.js";
import "./ST4-12.js";

describe("ST4-12 Rosemon", () => {
  it("stops an opposing Digimon from attacking or blocking when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST4-10", as: "base" }],
          hand: [{ card: "ST4-12", as: "evolving" }],
          security: ["ST4-03"],
          deck: ["ST1-02", "ST1-02"],
        },
        1: {
          battleArea: [{ card: "ST4-10", as: "target" }],
          hand: [{ card: "ST4-12", as: "targetEvolution" }],
          deck: ["ST1-02", "ST1-02"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).isRestricted(s.perm("target"), "attack") &&
        observe(s.engine).isRestricted(s.perm("target"), "block"),
    );
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("target").permanentId,
        instanceId: s.inst("targetEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.instanceId === s.inst("targetEvolution").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(false);
  });
});

describe("ST4-12 Rosemon — KB Q&A rulings", () => {
  async function restrictWithRosemon(opponent: SeatSpec, restrictedAlias = "target") {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST4-10", as: "rosemon" }],
          hand: [{ card: "ST4-12", as: "evolving" }],
          security: ["ST4-03"],
          deck: ["ST1-02", "ST1-02"],
        },
        1: { deck: ["ST1-02", "ST1-02"], ...opponent },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rosemon").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm(restrictedAlias), "attack"));
    await drainMicrotasks();
    return s;
  }

  it("still lets you attack the restricted Digimon while it is suspended (Q654)", async () => {
    const s = await restrictWithRosemon({ battleArea: [{ card: "ST4-10", as: "target", suspended: true }] });
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rosemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.some((c) => c.cardId === "ST4-10")).toBe(true);
  });

  it("keeps the restriction after the restricted Digimon digivolves (Q655)", async () => {
    const s = await restrictWithRosemon({
      battleArea: [
        { card: "ST4-10", as: "target" },
        { card: "ST4-03", as: "unrestricted" },
      ],
      hand: [{ card: "ST4-12", as: "targetEvolution" }],
    });
    expect(observe(s.engine).isRestricted(s.perm("unrestricted"), "attack")).toBe(false);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("target").permanentId,
        instanceId: s.inst("targetEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.instanceId === s.inst("targetEvolution").instanceId);
    await drainMicrotasks();
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);

    // Control: an unrestricted Digimon may attack in the same turn.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("unrestricted").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
  });

  it("stops the restricted Digimon from attacking even through an effect that lets it attack (Q656)", async () => {
    async function digivolveIntoChaosmon(s: Awaited<ReturnType<typeof restrictWithRosemon>>) {
      s.state.turnSeat = 1;
      s.state.memory = 10;
      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("target").permanentId,
          instanceId: s.inst("chaosmon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("target").topCard.instanceId === s.inst("chaosmon").instanceId);
      await drainMicrotasks(2000);
    }
    const opponent = (): SeatSpec => ({
      battleArea: [{ card: "ST4-13", as: "target", suspended: true }],
      hand: [{ card: "BT4-090", as: "chaosmon" }],
    });

    const restricted = await restrictWithRosemon(opponent());
    await digivolveIntoChaosmon(restricted);
    expect(restricted.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toContain("ST4-12");
    expect(restricted.perm("target").isSuspended).toBe(false);

    // Control: with Rosemon's restriction spent on another Digimon, Chaosmon's granted attack deletes Rosemon.
    const unrestricted = await restrictWithRosemon(
      {
        battleArea: [
          { card: "ST4-03", as: "decoy" },
          { card: "ST4-13", as: "target", suspended: true },
        ],
        hand: [{ card: "BT4-090", as: "chaosmon" }],
      },
      "decoy",
    );
    expect(observe(unrestricted.engine).isRestricted(unrestricted.perm("target"), "attack")).toBe(false);
    await digivolveIntoChaosmon(unrestricted);
    await settle(() => !unrestricted.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST4-12"), 2000);
  });
});
