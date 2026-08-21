import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-027 HoverEspimon", () => {
  it("gains memory when the revealed security card is a Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "RB1-027", as: "hover" }] },
        1: { security: ["RB1-005"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const hoverInstanceId = s.inst("hover").instanceId;
    const securityInstanceId = s.state.players[1]!.security[0]!.instanceId;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hoverInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.find((card) => card.instanceId === securityInstanceId)?.faceUp === true);
    await settle(() => s.state.players[1]!.security.find((card) => card.instanceId === securityInstanceId)?.faceUp === false);

    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.battleArea.find((perm) => perm.topCard.instanceId === hoverInstanceId)?.topCard.cardId).toBe("RB1-027");
    expect(s.state.players[1]!.security.find((card) => card.instanceId === securityInstanceId)?.faceUp).toBe(false);
  });

  it("draws when the revealed security card is not a Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "RB1-027", as: "hover" }], deck: ["RB1-005"] },
        1: { security: ["ST1-15"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const hoverInstanceId = s.inst("hover").instanceId;
    const securityInstanceId = s.state.players[1]!.security[0]!.instanceId;
    s.state.memory = 10;
    const handBefore = s.state.players[0]!.hand.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hoverInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.find((card) => card.instanceId === securityInstanceId)?.faceUp === true);
    await settle(() => s.state.players[1]!.security.find((card) => card.instanceId === securityInstanceId)?.faceUp === false);

    expect(s.state.players[0]!.hand.length).toBe(handBefore);
    expect(s.state.players[0]!.battleArea.find((perm) => perm.topCard.instanceId === hoverInstanceId)?.topCard.cardId).toBe("RB1-027");
    expect(s.state.players[1]!.security.find((card) => card.instanceId === securityInstanceId)?.faceUp).toBe(false);
  });
});
