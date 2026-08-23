import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST13-11.js";

describe("ST13-11 TiaLudomon", () => {
  it("places itself under a red host and grants Reboot to a chosen Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST13-05", as: "host" },
            { card: "ST13-07", as: "recipient" },
          ],
          hand: [{ card: "ST13-11", as: "tia" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("host").permanentId, s.perm("recipient").permanentId);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tia").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("recipient"), "Reboot"));
    expect(s.perm("host").stack.some((card) => card.cardId === "ST13-11")).toBe(true);
  });

  it("may decline the placement cost and grants no Reboot", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST13-05", as: "host" },
            { card: "ST13-07", as: "recipient" },
          ],
          hand: [{ card: "ST13-11", as: "tia" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tia").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST13-11"));

    expect(s.perm("host").stack.some((card) => card.cardId === "ST13-11")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Reboot")).toBe(false);
  });

  it("grants Blocker to its inherited host on the opponent's turn while a red ally is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST13-12", as: "blocker", under: ["ST13-11"] },
          { card: "ST13-05", as: "red-ally" },
        ],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("blocker"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blocker").isSuspended);

    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
