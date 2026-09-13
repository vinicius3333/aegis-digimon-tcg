import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

const RULE_SHA256 = "ec9da1f563847efe4dfee871cf63d9a84b02fe13512f2826d59ac86e48f2a421";

async function declineExamonBlock(s: ReturnType<typeof setupEngine>): Promise<void> {
  const combat = (s.engine as unknown as { combat: { hasOpenBlockWindow: boolean } }).combat;
  await drainMicrotasks(500);
  if (!combat.hasOpenBlockWindow) return;
  expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
}

function citeBlastDna(): void {
  cite(
    "comprehensive-0250",
    "§16-31-1: Blast DNA Digivolve is an optional Counter action using one specified field Digimon and one specified hand card",
    RULE_SHA256,
  );
}

describe("Blast DNA Digivolve public Counter consent", () => {
  it("chooses an exact field/hand recipe and resolves the DNA stack and attack", async () => {
    citeBlastDna();
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-044", as: "fieldBreak", under: ["BT20-042"] },
            { card: "BT20-044", as: "otherBreak", under: ["BT20-042"] },
          ],
          hand: [
            { card: "BT20-027", as: "handSlayer" },
            { card: "BT20-027", as: "otherSlayer" },
            { card: "BT20-045", as: "examon" },
          ],
          deck: ["BT1-010", "BT1-010"],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT20-009", as: "attacker" }], security: ["BT1-010"], deck: ["BT1-011"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const fieldId = s.perm("fieldBreak").permanentId;
    const fieldTopId = s.inst("fieldBreak").instanceId;
    const handId = s.inst("handSlayer").instanceId;
    const otherFieldId = s.perm("otherBreak").permanentId;
    const otherHandId = s.inst("otherSlayer").instanceId;
    const fieldSourceId = s.perm("fieldBreak").stack[0]!.instanceId;
    const attackerId = s.inst("attacker").instanceId;
    const drawId = s.state.players[0]!.deck[0]!.instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await declineExamonBlock(s);
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.findLast((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const choices = opened.eligibleCounters.filter((entry) => entry.instanceId === s.inst("examon").instanceId);
    expect(choices).toHaveLength(4);
    const choice = choices.find((entry) => entry.effectKey.includes(fieldId) && entry.effectKey.includes(handId));
    expect(choice).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: choice!.instanceId,
        effectKey: choice!.effectKey,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-045"));
    await declineExamonBlock(s);
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    const result = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-045");
    expect(result?.topCard.cardId).toBe("BT20-045");
    expect(result?.stack.map((card) => card.instanceId)).toEqual([handId, fieldSourceId, fieldTopId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === otherHandId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === otherFieldId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === attackerId)).toBe(false);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(attackerId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawId)).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("passes the Counter and preserves both DNA materials while the attack resolves", async () => {
    citeBlastDna();
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-044", as: "fieldBreak", under: ["BT20-042"] }],
          hand: [
            { card: "BT20-027", as: "handSlayer" },
            { card: "BT20-045", as: "examon" },
          ],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT20-009", as: "attacker" }], security: ["BT1-010"], deck: ["BT1-011"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const fieldId = s.perm("fieldBreak").permanentId;
    const fieldTopId = s.inst("fieldBreak").instanceId;
    const handId = s.inst("handSlayer").instanceId;
    const attackerId = s.inst("attacker").instanceId;
    const defendingSecurityId = s.state.players[0]!.security[0]!.instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await declineExamonBlock(s);
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "respondCounter" })).toEqual({ ok: true });
    await declineExamonBlock(s);
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([handId, s.inst("examon").instanceId]);
    expect(
      s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === fieldId)?.topCard.instanceId,
    ).toBe(fieldTopId);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === defendingSecurityId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === attackerId)).toBe(true);
    expect(s.state.memory).toBe(3);
  });
});
