import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../testkit/harness.js";
import "../../cards/BT21/BT21-025.js";
import "../../cards/ST1/ST1-16.js";
import "../../cards/index.js";

describe("Progress mutation immunity (BT21-025)", () => {
  it("protects the attacking Progress Digimon from a public Gaia Force Security effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-025", as: "progress", dp: 4000 }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { security: [{ card: "ST1-16", as: "gaiaForce" }], deck: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("progress").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-025")).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("ST1-16");
  });

  it("does not extend Progress immunity to a non-Progress attacking Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }], deck: ["BT1-009", "BT1-009"] },
        1: { security: [{ card: "ST1-16", as: "gaiaForce" }], deck: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("allows an opponent effect to delete Progress outside an attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-025", as: "progress", dp: 7000 }], deck: ["BT1-009", "BT1-009"] },
        1: {
          battleArea: [{ card: "BT1-009", as: "redSource" }],
          hand: [{ card: "ST1-16", as: "gaiaForce" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT21-025");
  });

  it("does not protect Progress from losing a public security Digimon battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-025", as: "progress", dp: 4000 }], deck: ["BT1-009", "BT1-009"] },
        1: { security: [{ card: "BT21-079", as: "securityDigimon" }], deck: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("progress").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT21-025");
  });
});
