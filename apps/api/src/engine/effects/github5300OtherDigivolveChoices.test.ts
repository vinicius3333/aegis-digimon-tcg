import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

async function answer(s: EngineSetup, accept: boolean): Promise<void> {
  await settle(() => s.state.pendingDecision?.kind === "optional");
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "optional", accept },
    }),
  ).toEqual({ ok: true });
}

function activate(s: EngineSetup, alias: string): void {
  const ability = observe(s.engine).activatableEffects(s.perm(alias))[0]!;
  expect(ability).toBeDefined();
  expect(
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm(alias).topCard.instanceId,
      effectKey: ability.effectKey,
    }),
  ).toEqual({ ok: true });
}

async function declinePayload(s: EngineSetup): Promise<void> {
  await settle(() => s.state.pendingDecision !== undefined);
  expect(s.state.pendingDecision?.kind).toBe("optional");
  await answer(s, false);
  await drainMicrotasks();
  expect(s.state.pendingDecision).toBeUndefined();
}

describe("GitHub #5300 independent processing condition families", () => {
  it("deleteOwn: Astamon may delete a purple ally then decline legal Belphemon evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-083", as: "cost" }],
          hand: [
            { card: "BT13-084", as: "source" },
            { card: "BT13-088", as: "evolution" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await answer(s, true);
    await settle(() => s.state.players[0]!.trash.some((c) => c.cardId === "BT13-083"));
    await declinePayload(s);
    expect(s.perm("source").topCard.cardId).toBe("BT13-084");
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT13-088")).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("trashSecurityTop: Chirinmon may trash security then decline a legal CS evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-034", as: "source" }],
          hand: [
            { card: "BT22-037", as: "trigger" },
            { card: "BT22-041", as: "evolution" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("trigger").instanceId,
      }),
    ).toEqual({ ok: true });
    await answer(s, true);
    await settle(() => s.state.players[0]!.security.length === 0);
    await declinePayload(s);
    expect(s.perm("source").topCard.cardId).toBe("BT22-037");
    expect(s.state.memory).toBe(7);
  });

  it("compound: Koh & Sayo may suspend and rotate the Light Fang top card then decline evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-064", as: "source" },
            { card: "EX5-017", as: "host", under: ["BT1-019"] },
          ],
          hand: ["EX5-020"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    activate(s, "source");
    await answer(s, true);
    await settle(() => s.perm("source").isSuspended && s.perm("host").topCard.cardId === "BT1-019");
    await declinePayload(s);
    expect(s.perm("host").topCard.cardId).toBe("BT1-019");
    expect(s.perm("host").stack.map((c) => c.cardId)).toEqual(["EX5-017"]);
    expect(s.state.memory).toBe(5);
  });

  it("trashBottomFaceDownUnderTamer: Lilamon may pay exactly two cards then decline printed may", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-089",
              as: "tamer",
              under: [
                { card: "BT1-001", faceUp: false },
                { card: "BT1-002", faceUp: false },
              ],
            },
          ],
          hand: [{ card: "ST24-10", as: "source" }, "ST24-11"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "enemy" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await answer(s, true);
    await settle(() => s.perm("tamer").stack.length === 0);
    await declinePayload(s);
    expect(s.perm("source").topCard.cardId).toBe("ST24-10");
    expect(s.perm("enemy").isSuspended).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("effect-level optional: Winr may suspend then decline a legal face-up security evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-084", as: "source" },
            { card: "BT1-064", as: "host" },
          ],
          security: [{ card: "BT1-071", as: "evolution", faceUp: true }],
          hand: ["BT19-045"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    activate(s, "source");
    await answer(s, true);
    await settle(() => s.perm("source").isSuspended);
    await declinePayload(s);
    expect(s.perm("host").topCard.cardId).toBe("BT1-064");
    expect(s.state.players[0]!.security[0]!.cardId).toBe("BT1-071");
    expect(s.state.players[0]!.hand[0]!.cardId).toBe("BT19-045");
    expect(s.state.memory).toBe(5);
  });

  it("place: Wormmon may place Erika under itself then decline legal Hudiemon evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-040", as: "source" },
            { card: "BT23-084", as: "cost" },
          ],
          hand: ["BT23-101"],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const loop = s.engine.startTurnLoop();
    try {
      await answer(s, true);
      await settle(() => s.perm("source").stack.some((c) => c.cardId === "BT23-084"));
      await declinePayload(s);
      expect(s.perm("source").topCard.cardId).toBe("BT23-040");
      expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT23-101")).toBe(true);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});

it("#5300 trash source: EX9-006 may trash its bottom hidden card then decline legal Ver.5 evolution", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "EX9-007", as: "source", dp: 3000, under: [{ card: "BT1-009", faceUp: false }, "EX9-006"] },
        ],
        trash: ["EX9-010"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "enemy", dp: 1000, suspended: true }] },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 5;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("source").permanentId,
      target: { kind: "permanent", permanentId: s.perm("enemy").permanentId },
    }),
  ).toEqual({ ok: true });
  await answer(s, true);
  await settle(() => s.state.players[0]!.trash.some((c) => c.cardId === "BT1-009"));
  await declinePayload(s);
  expect(s.perm("source").topCard.cardId).toBe("EX9-007");
  expect(s.perm("source").stack.map((c) => c.cardId)).toEqual(["EX9-006"]);
  expect(s.state.memory).toBe(5);
});

it("#5300 placeAsSecurity: Lucemon may put a level6 into security then decline legal Chaos Mode", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT18-034", as: "source" },
          { card: "BT1-063", as: "cost" },
        ],
        trash: ["BT18-082"],
        deck: ["BT1-009", "BT1-009"],
      },
      1: { deck: ["BT1-009"] },
    },
    { autoSelectCards: true },
  );
  s.state.memory = 5;
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === "Breeding" || s.state.phase === "Main");
    if (s.state.phase === "Breeding") expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === "Main");
    await drainMicrotasks();
    if (s.state.pendingDecision?.kind === "optional") {
      const pending = s.state.pendingDecision;
      expect(
        s.engine.applyIntent(pending.seat, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
      await drainMicrotasks();
    }
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await answer(s, true);
    await settle(() => s.state.players[0]!.security.some((c) => c.cardId === "BT1-063"));
    await declinePayload(s);
    expect(s.perm("source").topCard.cardId).toBe("BT18-034");
    expect(s.state.players[0]!.trash.some((c) => c.cardId === "BT18-082")).toBe(true);
  } finally {
    s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  }
});

it("#5300 moveToBattleArea: Fellowship may move its selected breeding Digimon then decline evolution", async () => {
  const s = setupEngine(
    {
      0: {
        breeding: { card: "BT20-010", as: "base" },
        battleArea: [
          { card: "BT20-095", as: "source" },
          { card: "BT20-048", as: "victim" },
        ],
        hand: ["BT20-012"],
      },
      1: { battleArea: [{ card: "BT1-009" }], hand: [{ card: "ST1-16", as: "trigger" }] },
    },
    { autoSelectCards: true },
  );
  s.state.turnSeat = 1;
  s.state.memory = 8;
  await s.ready();
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("trigger").instanceId })).toEqual({ ok: true });
  await answer(s, true); // Consume the prior-turn Delay.
  await answer(s, true); // Pay its optional movement condition.
  await settle(() => s.state.players[0]!.breeding === undefined);
  await declinePayload(s);
  expect(s.perm("base").topCard.cardId).toBe("BT20-010");
  expect(s.perm("base").inBreeding).toBe(false);
  expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT20-012")).toBe(true);
});
