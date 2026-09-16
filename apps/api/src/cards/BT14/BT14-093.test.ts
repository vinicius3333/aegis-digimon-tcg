import { describe, it, expect } from "vitest";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT14-093.js";
import "../index.js";

const EMISSARY = "BT14-093";

describe("BT14-093 Emissary of Hope [Security] add to hand", () => {
  it("keeps both the Main and Security contracts in compiled IR", () => {
    expect(compiled.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          { kind: "Search", searchZone: "security" },
          { kind: "Digivolve", from: ["security"] },
          { kind: "SecurityManipulation", op: "shuffle" },
          { kind: "SecurityManipulation", op: "addTop" },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [{ kind: "PlayWithoutCost" }, { kind: "AddToHandSelf" }],
      },
    ]);
  });

  it("naturally searches security, digivolves, and recovers when T.K. is present", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT14-033", as: "patamon" },
            { card: "BT14-084", as: "tk" },
          ],
          hand: [{ card: EMISSARY, as: "option" }],
          security: [{ card: "BT14-035", as: "securityVaccine" }, "BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("patamon").topCard?.cardId === "BT14-035");

    expect(s.perm("patamon").topCard?.cardId).toBe("BT14-035");
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT14-035")).toBe(false);
  });

  it("naturally plays Patamon and returns itself after a Security check", async () => {
    const s = setup(
      {
        0: { battleArea: [{ card: "BT1-009", dp: 2000, as: "attacker" }] },
        1: {
          security: [{ card: EMISSARY, as: "securityOption" }],
          hand: [{ card: "BT14-033", as: "patamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-033"));

    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-033")).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === EMISSARY)).toBe(true);
  });

  it("when checked as security, the card is added to the defender's hand", async () => {
    const s = setup(
      {
        0: { battleArea: [{ card: "BT1-009", dp: 2000, as: "attacker" }] },
        1: { security: [{ card: EMISSARY }] },
      },
      { autoDeclineOptional: true },
    );
    const p1 = s.state.players[1]!;
    const attacker = s.perm("attacker");

    s.state.memory = 3;
    const res = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    expect(res).toEqual({ ok: true });

    await settle(() => p1.hand.some((c) => c.cardId === EMISSARY), 800);

    expect(p1.hand.some((c) => c.cardId === EMISSARY)).toBe(true);
    expect(p1.security.some((c) => c.cardId === EMISSARY)).toBe(false);
  });
});
