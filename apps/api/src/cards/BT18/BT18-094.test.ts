import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/index.js";
import { compiled } from "./BT18-094.js";
import "../index.js";

describe("BT18-094 Koichi Kimura", () => {
  it("covers the paid Start Main memory gain and inherited Hybrid recovery", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          cost: {
            kind: "trash",
            target: { filter: { nameOrTrait: [{ tokens: ["Hybrid", "Ten Warriors"], match: "trait" }] } },
          },
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Return",
          to: "hand",
          optional: true,
          target: { filter: { zone: "trash", nameOrTrait: [{ tokens: ["Hybrid", "Ten Warriors"], match: "trait" }] } },
        },
      ],
    });
  });

  it("plays from Security without cost through the real security timing", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT18-094", as: "koichi" }] },
        1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("koichi").instanceId));
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("koichi").instanceId),
    ).toBe(true);
  });

  it("trashes a Hybrid to gain memory at the natural start of main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-094", as: "koichi" }],
          hand: [{ card: "BT18-007", as: "hybrid" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("returns one Hybrid from trash when its legal inherited host attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-078", as: "host", under: ["BT18-094"] }],
          trash: [{ card: "BT18-007", as: "hybrid" }],
        },
        1: { security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("hybrid").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(false);
  });

  it("keeps the Hybrid in trash when the inherited recovery is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-078", as: "host", under: ["BT18-094"] }],
          trash: [{ card: "BT18-007", as: "hybrid" }],
        },
        1: { security: [] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(false);
  });
});
