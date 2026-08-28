import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-066.js";
import "./P-067.js";
import "./P-068.js";
import "./P-069.js";
import "./P-070.js";
import "./P-071.js";

describe("Security promo gauntlet", () => {
  it("chains the six end-of-battle promos without losing their unconditional hand clauses", async () => {
    const promos = ["P-066", "P-067", "P-068", "P-069", "P-070", "P-071"];
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          deck: [
            { card: "BT1-001", as: "firstDraw" },
            { card: "BT1-002", as: "secondDraw" },
            { card: "BT2-052", as: "blackReveal" },
          ],
          trash: [{ card: "BT2-069", as: "purpleRookie" }],
          security: promos.map((card, index) => ({ card, as: `promo${index}` })),
        },
        1: {
          battleArea: [
            ...promos.map((_, index) => ({ card: "BT1-025", as: `attacker${index}` })),
            { card: "BT1-009", as: "deleteTarget" },
            { card: "BT1-025", as: "controlTarget" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("deleteTarget").permanentId, s.perm("controlTarget").permanentId);
    const promoIds = promos.map((_, index) => s.inst(`promo${index}`).instanceId);
    const deletedId = s.perm("deleteTarget").permanentId;
    const blackId = s.inst("blackReveal").instanceId;
    const purpleId = s.inst("purpleRookie").instanceId;
    s.state.turnSeat = 1;

    for (let index = 0; index < promos.length; index += 1) {
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm(`attacker${index}`).permanentId,
          target: { kind: "player" },
        }),
        promos[index],
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.events.filter((event) => event.kind === "securityChecked").length === index + 1 &&
          s.state.players[0]!.hand.some((card) => card.instanceId === promoIds[index]) &&
          !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
        2_000,
      );
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === promoIds[index])).toBe(true);
    }

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(
      promoIds.every((instanceId) => s.state.players[0]!.hand.some((card) => card.instanceId === instanceId)),
    ).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === deletedId)).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("controlTarget"), "SecurityAttack")).toBe(-1);
    expect(s.perm("controlTarget").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === blackId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === purpleId)).toBe(true);
  });
});
