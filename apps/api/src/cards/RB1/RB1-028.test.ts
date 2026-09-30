import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-028 BlackGatomon Uver.", () => {
  it("plays the exact security instance at battle end and draws after returning an opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "RB1-028", as: "securityBlackGatomon" }, "BT1-090"], deck: ["RB1-005"] },
        1: { trash: ["RB1-005"], battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const securityInstanceId = s.inst("securityBlackGatomon").instanceId;
    const handBefore = s.state.players[0]!.hand.length;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.security.some((card) => card.instanceId === securityInstanceId) &&
        s.state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === securityInstanceId),
    );

    expect(
      s.state.players[0]!.battleArea.find((perm) => perm.topCard.instanceId === securityInstanceId)?.topCard.cardId,
    ).toBe("RB1-028");
    expect(s.state.players[0]!.security.some((card) => card.instanceId === securityInstanceId)).toBe(false);
    expect(s.state.players[0]!.hand.length).toBe(handBefore + 1);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "RB1-005")).toBe(false);
  });

  it("allows declining the optional return-and-draw cost", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "RB1-028", as: "blackgato" }] }, 1: { trash: ["RB1-005"] } },
      { autoDeclineOptional: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blackgato").instanceId })).toEqual({
      ok: true,
    });
    const handBefore = s.state.players[0]!.hand.length;
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "RB1-005")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
  });

  it("lets the activating player choose which opponent Digimon card to return", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      { 0: { hand: [{ card: "RB1-028", as: "blackgato" }] }, 1: { trash: ["RB1-005", "BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const chosen = s.state.players[1]!.trash[1]!.instanceId;
    preferred.push(chosen);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blackgato").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.trash.some((card) => card.instanceId === chosen));
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === chosen)).toBe(false);
  });
});

describe("RB1-028 BlackGatomon Uver. — KB Q&A rulings", () => {
  it("asks the activating player to pick the opponent trash card returned to the deck bottom (Q4103)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "RB1-028", as: "blackgato" }], deck: ["BT1-010"] },
        1: { trash: ["RB1-005", { card: "BT1-009", as: "chosen" }], deck: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const chosen = s.inst("chosen").instanceId;
    preferred.push(chosen);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blackgato").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.deck.some((card) => card.instanceId === chosen));
    await settle();

    const choices = s.decisions.filter(({ req }) => req.kind === "selectCards");
    expect(choices).toHaveLength(1);
    expect(choices[0]!.seat).toBe(0);
    expect(s.decisions.every(({ seat }) => seat === 0)).toBe(true);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(chosen);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["RB1-005"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
  });
});
