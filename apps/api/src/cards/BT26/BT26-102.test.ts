import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT26-102 Seven Code PAD", () => {
  it("pays its six-card cost from battle-area Digimon, link cards, and trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-102", as: "pad" }],
          trash: [
            { card: "BT26-051", as: "trashOne" },
            { card: "BT26-063", as: "trashTwo" },
          ],
          battleArea: [
            {
              card: "BT26-010",
              linked: [{ card: "BT26-028", as: "recipientLink" }],
              as: "recipient",
            },
            {
              card: "BT26-019",
              linked: [{ card: "BT26-037", as: "donorLink" }],
              as: "donorOne",
            },
            { card: "BT26-084", as: "donorTwo" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const pad = s.inst("pad");
    const expectedCostCards = [
      s.perm("donorOne").topCard!.instanceId,
      s.perm("donorTwo").topCard!.instanceId,
      s.inst("recipientLink").instanceId,
      s.inst("donorLink").instanceId,
      s.inst("trashOne").instanceId,
      s.inst("trashTwo").instanceId,
    ];
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: pad.instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("recipient").stack.length === expectedCostCards.length);

    const recipient = s.perm("recipient");
    expect(recipient.stack.map((card) => card.instanceId).sort()).toEqual(expectedCostCards.sort());
    expect(recipient.stack.every((card) => card.faceUp)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("trashOne").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("trashTwo").instanceId);
  });

  it("plays an eligible Appmon from trash and returns itself to hand from security", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "BT26-028", as: "appmon" }],
          security: [{ card: "BT26-102", as: "padSecurity" }, "AD1-001"],
        },
        1: { battleArea: [{ card: "AD1-003", as: "attacker" }] },
      },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    const decision = s.decisions.find(({ req }) => req.kind === "selectCards");
    if (decision === undefined) throw new Error("Appmon selection was not requested");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.req.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("appmon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("padSecurity").instanceId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("appmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("padSecurity").instanceId)).toBe(true);
  });
});
