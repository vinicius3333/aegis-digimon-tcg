import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST15-08.js";

describe("ST15-08 Greymon security effect", () => {
  it("can play an Agumon Digimon from hand, not only a Tai Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "ST15-08", as: "greymon", faceUp: true }, "BT1-001"],
          hand: [{ card: "BT1-010", as: "agumon" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("agumon").instanceId),
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("agumon").instanceId)).toBe(
      true,
    );
  });

  it("can play a Tai Kamiya Tamer from hand and does not require an Agumon target", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "ST15-08", as: "greymon", faceUp: true }, "BT1-001"],
          hand: [{ card: "BT1-085", as: "tai" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tai").instanceId));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tai").instanceId)).toBe(true);
  });

  it("grants its inherited memory only once when any attack target switches", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST15-12", as: "host", under: ["BT1-009", "ST15-08"] }] },
      1: { battleArea: [{ card: "ST15-12", as: "blocker" }] },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    expect(s.state.memory).toBe(1);
  });
});
