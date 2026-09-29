import { describe, expect, it } from "vitest";
import { Zone } from "@aegis/shared";
import { extractPermanentAt, insertCard } from "../../engine/state/access.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-095.js";

describe("BT15-095", () => {
  it("suspends an opposing Digimon and grants its On Deletion security-trash effect with Izzy", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "Suspend",
      target: { filter: { controller: "opponent" } },
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "GainTriggeredEffect",
      gainedTrigger: "onDeletionOf",
      gainedActions: [{ kind: "SecurityManipulation", op: "trashTop" }],
      condition: { kind: "youHave" },
      duration: "untilOpponentTurnEnd",
    });
  });
  it("suspends an opposing Digimon and returns itself from security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "Suspend" }, { kind: "AddToHandSelf" }],
    }));

  it("naturally grants the deletion trigger and trashes the opponent's security after the recipient is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-053", as: "attacker" },
            { card: "BT15-043", as: "source" },
            { card: "BT15-085", as: "izzy" },
          ],
          hand: [{ card: "BT15-095", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT15-007", as: "recipient" }],
          security: ["BT15-034", "BT15-037"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("recipient").isSuspended);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("recipient").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("recipient").permanentId));
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});

describe("BT15-095 Impact of Knowledge — KB Q&A rulings", () => {
  async function opponentSecurityAfterRecipientDeleted(izzyAtActivation: boolean): Promise<number> {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-053", as: "attacker" },
            { card: "BT15-043", as: "greenSource" },
            ...(izzyAtActivation ? [{ card: "BT15-085", as: "izzy" }] : []),
          ],
          hand: [{ card: "BT15-095", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT15-007", as: "recipient" }],
          security: ["BT15-034", "BT15-037"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const recipientId = s.perm("recipient").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("recipient").isSuspended && s.state.pendingDecision === undefined);

    const me = s.state.players[0]!;
    const izzyIndex = me.battleArea.findIndex((permanent) => permanent.topCard?.cardId === "BT15-085");
    const lostIzzy = extractPermanentAt(me, izzyIndex);
    if (lostIzzy?.topCard !== undefined) insertCard(me, Zone.Trash, lostIzzy.topCard);
    expect(me.battleArea.some((permanent) => permanent.topCard?.cardId === "BT15-085")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: recipientId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === recipientId));
    await drainMicrotasks();
    expect(s.state.pendingDecision).toBeUndefined();
    return s.state.players[1]!.security.length;
  }

  it("keeps the granted On Deletion security trash after the Izzy Tamer that enabled it leaves play (Q2591)", async () => {
    await expect(opponentSecurityAfterRecipientDeleted(true)).resolves.toBe(1);
    await expect(opponentSecurityAfterRecipientDeleted(false)).resolves.toBe(2);
  });
});
