import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST22-09 High-Speed Plug-In H", () => {
  it("restricts an opposing Digimon from suspending and adds itself to hand from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "ST22-09", as: "option" }, "BT1-090"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const option = s.inst("option").instanceId;
    const opponent = s.perm("opponent");
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: opponent.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === option));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === option)).toBe(true);
    expect(observe(s.engine).isRestricted(opponent, "beSuspended")).toBe(true);
  });
});

describe("ST22-09 High-Speed Plug-In H — KB Q&A rulings", () => {
  it.each([true, false])(
    "gives its host Digimon <Jamming> as that Digimon's own effect (linked=%s) (Q5433)",
    async (linked) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "ST22-03", as: "host", linked: linked ? [{ card: "ST22-09", as: "linkCard" }] : [] }],
          },
          1: { security: ["EX12-037", "ST1-02"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      const hostId = s.perm("host").permanentId;
      expect(observe(s.engine).hasKeyword(hostId, "Jamming")).toBe(linked);

      expect(
        s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking(), 3000);

      expect(s.state.players[1]!.security).toHaveLength(1);
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(linked);
    },
  );

  it("links by paying its link cost while Option use is prohibited (Q5434)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST22-07", as: "tamer" },
          { card: "ST22-03", as: "host" },
        ],
        hand: [{ card: "ST22-09", as: "option" }],
      },
      1: {
        battleArea: [{ card: "BT11-095", as: "whiteSource" }],
        hand: [{ card: "EX1-072", as: "shutdown" }],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("shutdown").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("shutdown").instanceId));
    s.state.turnSeat = 0;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "play-prohibited",
    });
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("option").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 1);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([s.inst("option").instanceId]);
    expect(s.state.memory).toBe(3);
  });
});
