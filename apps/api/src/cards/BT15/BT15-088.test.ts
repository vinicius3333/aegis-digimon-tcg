import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-088.js";

describe("BT15-088", () => {
  it("matches the catalog identity and keeps the direct module full and residual-free", () => {
    expect(getCardDefinition("BT15-088")).toMatchObject({
      nameEn: "Wings of Love",
      colors: ["Red"],
      kinds: ["Option"],
      playCost: 2,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("may play a red Tamer costing 4 or less and return a red Digimon from trash with Sora", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "Return",
      to: "hand",
      condition: { kind: "youHave" },
      optional: true,
    });
  });
  it("may play Biyomon from hand or trash and returns itself from security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true },
        { kind: "AddToHandSelf" },
      ],
    }));

  it("naturally plays Sora before resolving the conditional trash return", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-012", as: "redSource" }],
          hand: [
            { card: "BT15-088", as: "wings" },
            { card: "BT15-082", as: "sora" },
          ],
          trash: [{ card: "BT1-010", as: "returnedRed" }],
          deck: ["BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wings").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("returnedRed").instanceId));

    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT15-082")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("returnedRed").instanceId)).toBe(true);
  });

  it("naturally plays Biyomon from trash and returns Wings to hand from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT15-088", as: "wings" }],
          trash: [{ card: "BT1-012", as: "biyomon" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
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
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("wings").instanceId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-012")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
