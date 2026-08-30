import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

describe("BT17-093 Tai Kamiya & Kari Kamiya — hatch trigger", () => {
  it("suspends this Tamer and gains 1 memory when its owner hatches", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-093", as: "tamer" }],
        eggDeck: [{ card: "BT1-001", as: "egg" }],
      },
    });
    s.state.memory = 0;
    s.state.phase = Phase.Breeding;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "hatchEgg" }).ok).toBe(true);
    await settle(() => s.state.memory === 1);

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]?.breeding?.topCard?.cardId).toBe("BT1-001");
  });

  it("naturally returns itself to deck bottom, draws, and plays a Tai/Kari Tamer at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-093", as: "source" }],
          hand: [{ card: "BT17-093", as: "replacement" }],
          deck: [
            { card: "BT1-001", as: "turnDraw" },
            { card: "BT1-002", as: "effectDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).runTurn(0);
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("replacement").instanceId,
      ),
    );

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("turnDraw").instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toContain(
      s.inst("replacement").instanceId,
    );
  });

  it("naturally plays itself from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT17-093", as: "securityTaiKari" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-093"));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-093")).toBe(true);
  });

  it("records complete compiled coverage for the hatch trigger", () => {
    const compiled = runtimeCompiledCard("BT17-093")!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
