import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-071.js";
import "./BT13-058.js";

describe("BT13-071 Giromon", () => {
  it("keeps Blocker and inherited opponent-turn security trash", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
  });

  it("naturally trashes once when two opposing Leopardmon effects suspend two hosts", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", under: ["BT13-071"], as: "host" },
            { card: "BT1-010", as: "secondTarget" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT13-056", as: "firstLeopardmon" },
            { card: "BT13-056", as: "secondLeopardmon" },
          ],
          hand: [{ card: "BT13-058", as: "firstMode" }, { card: "BT13-058", as: "secondMode" }],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("firstLeopardmon").permanentId,
        instanceId: s.inst("firstMode").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("secondTarget").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("secondLeopardmon").permanentId,
        instanceId: s.inst("secondMode").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("secondTarget").isSuspended);
    expect(s.perm("secondTarget").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-001"]);
  });

  it("makes Giromon eligible to block a real opponent attack and suspends it when blocking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-071", as: "giromon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("giromon").permanentId],
    });

    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("giromon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blocked"));
    expect(s.perm("giromon").isSuspended).toBe(true);
  });
});
