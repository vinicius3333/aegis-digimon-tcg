import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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
    await settle(
      () => s.state.players[1]!.security.find((card) => card.instanceId === securityInstanceId)?.faceUp === true,
    );
    await settle(
      () => s.state.players[1]!.security.find((card) => card.instanceId === securityInstanceId)?.faceUp === false,
    );

    expect(s.state.memory).toBe(6);
    expect(
      s.state.players[0]!.battleArea.find((perm) => perm.topCard.instanceId === hoverInstanceId)?.topCard.cardId,
    ).toBe("RB1-027");
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
    await settle(
      () => s.state.players[1]!.security.find((card) => card.instanceId === securityInstanceId)?.faceUp === true,
    );
    await settle(
      () => s.state.players[1]!.security.find((card) => card.instanceId === securityInstanceId)?.faceUp === false,
    );

    expect(s.state.players[0]!.hand.length).toBe(handBefore);
    expect(
      s.state.players[0]!.battleArea.find((perm) => perm.topCard.instanceId === hoverInstanceId)?.topCard.cardId,
    ).toBe("RB1-027");
    expect(s.state.players[1]!.security.find((card) => card.instanceId === securityInstanceId)?.faceUp).toBe(false);
  });

  it("lets the activating player place the revealed card at the bottom and grants Blocker while a Tamer exists", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "RB1-027", as: "hover" }], battleArea: [{ card: "RB1-032", as: "hiro" }] },
        1: { security: ["ST1-15", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    const revealed = s.state.players[1]!.security[0]!.instanceId;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hover").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.find((card) => card.instanceId === revealed)?.faceUp === true);
    await settle(() => s.state.players[1]!.security.find((card) => card.instanceId === revealed)?.faceUp === false);
    expect(s.state.players[1]!.security.at(-1)?.instanceId).toBe(revealed);
    expect(observe(s.engine).hasKeyword(s.perm("hover"), "Blocker")).toBe(true);
  });

  it("loses Blocker when the Tamer condition is absent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "RB1-027", as: "hover" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("hover"), "Blocker")).toBe(false);
  });

  it("gains Blocker when only the opponent controls a Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-027", as: "hover" }] },
      1: { battleArea: [{ card: "RB1-032", as: "opponentTamer" }] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("hover"), "Blocker")).toBe(true);
  });

  it("cannot be deleted by an opponent effect while a Tamer is present", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "RB1-027", as: "hover" },
          { card: "RB1-032", as: "hiro" },
        ],
      },
      1: {},
    });
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("hover").permanentId], "byEffect");
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "RB1-027")).toBe(true);
  });

  it("cannot be deleted by an opponent's real Gaia Force option while a Tamer is present", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "RB1-027", as: "hover" },
            { card: "RB1-032", as: "hiro" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "redSource" }], hand: [{ card: "ST1-16", as: "gaiaForce" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    preferred.push(s.perm("hover").permanentId);
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "ST1-16"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "RB1-027")).toBe(true);
  });
});
