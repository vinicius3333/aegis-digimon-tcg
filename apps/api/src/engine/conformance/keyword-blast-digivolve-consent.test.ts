import { beforeEach, describe, expect, it } from "vitest";
import { cite } from "./_kb.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";

const BLAST_RULE_FINGERPRINT = "a8f5302d1d7921d23a272be3d364452f991eb6a7657cbe6452cfcbecabe3347b";

function sourcePin(): void {
  cite(
    "comprehensive-0245",
    "§16-26: a Counter card with Blast Digivolve may optionally digivolve one of the controller's battle-area Digimon from hand without paying the digivolution cost; the printed digivolution requirement still applies.",
    BLAST_RULE_FINGERPRINT,
  );
}

async function openCounter(s: ReturnType<typeof setupEngine>, attacker: string) {
  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm(attacker).permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
  const event = s.events.find((entry) => entry.kind === "counterWindowOpened");
  if (event?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
  return event;
}

describe("Blast Digivolve public Counter consent and host selection", () => {
  beforeEach(() => sourcePin());

  it("passes the real Counter window without consuming an ACE or base when the defender declines", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-063", as: "base" },
            { card: "BT1-021", as: "secondBase" },
          ],
          hand: [{ card: "ST15-12", as: "wargreymon" }],
          security: ["BT1-009"],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-009"], deck: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    s.state.memory = 0;
    const aceId = s.inst("wargreymon").instanceId;
    const baseId = s.perm("base").topCard.instanceId;
    const secondBaseId = s.perm("secondBase").topCard.instanceId;
    const securityId = s.state.players[0]!.security[0]!.instanceId;
    const opened = await openCounter(s, "attacker");
    expect(opened.eligibleCounters.some((entry) => entry.instanceId === aceId)).toBe(true);
    expect(opened.eligibleCounters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ effectKey: `blast-digivolve:${s.perm("base").permanentId}` }),
        expect.objectContaining({ effectKey: `blast-digivolve:${s.perm("secondBase").permanentId}` }),
      ]),
    );
    expect(s.engine.applyIntent(0, { type: "respondCounter" })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterResolved"));
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(aceId);
    expect(s.perm("base").topCard.instanceId).toBe(baseId);
    expect(s.perm("base").topCard.cardId).toBe("BT2-063");
    expect(s.perm("secondBase").topCard.instanceId).toBe(secondBaseId);
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(securityId);
  });

  it("accepts AD1-005 over the selected real red level-5 base and waives its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-021", as: "redBaseOne" },
            { card: "BT1-022", as: "redBaseTwo" },
          ],
          hand: [{ card: "AD1-005", as: "gaiamon" }],
          security: ["BT1-009"],
          deck: [{ card: "BT1-013", as: "draw" }, "BT1-014"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-009"], deck: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.state.turnSeat = 1;
    await s.ready();
    s.state.memory = 0;
    const opened = await openCounter(s, "attacker");
    const attackerId = s.perm("attacker").topCard.instanceId;
    const securityId = s.state.players[0]!.security[0]!.instanceId;
    const aceId = s.inst("gaiamon").instanceId;
    const drawId = s.inst("draw").instanceId;
    const firstBaseId = s.perm("redBaseOne").topCard.instanceId;
    const secondBaseId = s.perm("redBaseTwo").topCard.instanceId;
    const choice = opened.eligibleCounters.find(
      (entry) =>
        entry.instanceId === s.inst("gaiamon").instanceId &&
        entry.effectKey === `blast-digivolve:${s.perm("redBaseTwo").permanentId}`,
    );
    expect(choice).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: choice!.instanceId,
        effectKey: choice!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("redBaseOne").topCard.cardId === "AD1-005" || s.perm("redBaseTwo").topCard.cardId === "AD1-005",
    );
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    const evolved = [s.perm("redBaseOne"), s.perm("redBaseTwo")].filter(
      (permanent) => permanent.topCard.cardId === "AD1-005",
    );
    expect(evolved).toHaveLength(1);
    expect(evolved[0]!.permanentId).toBe(s.perm("redBaseTwo").permanentId);
    expect(evolved[0]!.stack.map((card) => card.instanceId)).toEqual([secondBaseId]);
    expect(evolved[0]!.topCard.instanceId).toBe(aceId);
    const untouched = [s.perm("redBaseOne"), s.perm("redBaseTwo")].find(
      (permanent) => permanent.topCard.cardId !== "AD1-005",
    );
    expect(untouched?.topCard.cardId).toBe("BT1-021");
    expect(untouched?.topCard.instanceId).toBe(firstBaseId);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "AD1-005")).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawId);
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(securityId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).not.toContain(attackerId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(attackerId);
  });

  it("does not expose AD1-005 when no real red level-5 host satisfies its printed requirement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-024", as: "wrongBase" },
            { card: "BT1-021", as: "validBase" },
          ],
          hand: [
            { card: "AD1-005", as: "gaiamon" },
            { card: "ST15-12", as: "wargreymon" },
          ],
          security: ["BT1-009"],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-009"], deck: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const opened = await openCounter(s, "attacker");
    const gaiamonWrongBase = opened.eligibleCounters.find(
      (entry) =>
        entry.instanceId === s.inst("gaiamon").instanceId &&
        entry.effectKey === `blast-digivolve:${s.perm("wrongBase").permanentId}`,
    );
    expect(gaiamonWrongBase).toBeUndefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: s.inst("gaiamon").instanceId,
        effectKey: `blast-digivolve:${s.perm("wrongBase").permanentId}`,
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    const legalCounter = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("wargreymon").instanceId);
    expect(legalCounter).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: legalCounter!.instanceId,
        effectKey: legalCounter!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("AD1-005");
    expect(s.perm("wrongBase").topCard.cardId).toBe("AD1-024");
  });
});
