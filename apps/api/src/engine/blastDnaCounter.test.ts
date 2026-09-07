import { describe, expect, it } from "vitest";
import { observe } from "./testkit/observe.js";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/BT20/index.js";
import "../cards/BT19/BT19-073.js";

async function openCounter(s: ReturnType<typeof setupEngine>) {
  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
  const opened = s.events.find((event) => event.kind === "counterWindowOpened");
  if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
  return opened;
}

function dnaFixture(fieldCard: "BT20-044" | "BT20-027", handCard: "BT20-027" | "BT20-044") {
  return setupEngine(
    {
      0: {
        battleArea: [
          {
            card: fieldCard,
            as: fieldCard === "BT20-044" ? "fieldBreak" : "fieldSlayer",
            under: [fieldCard === "BT20-044" ? "BT20-042" : "BT20-025"],
          },
        ],
        hand: [
          { card: handCard, as: "handMaterial" },
          { card: "BT20-045", as: "examon" },
        ],
        deck: ["BT20-001", "BT20-002"],
      },
      1: {
        battleArea: [
          { card: "BT20-009", as: "attacker" },
          { card: "BT20-012", dp: 6000, as: "high" },
          { card: "BT20-007", dp: 3000, as: "low" },
        ],
        security: ["BT20-001", "BT20-002"],
        deck: ["BT20-003", "BT20-004"],
      },
    },
    { autoDeclineOptional: true, autoSelectCards: true },
  );
}

describe("BT20-045 Examon Blast DNA Counter", () => {
  it.each([false, true])(
    "rejects Main DNA without printed DNA requirements (Blast flag %s)",
    async (useBlastDigivolve) => {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: "BT20-044", as: "break" },
            { card: "BT20-027", as: "slayer" },
          ],
          hand: [{ card: "BT20-045", as: "examon" }],
        },
      });
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "dnaDigivolve",
          materialPermanentIds: [s.perm("break").permanentId, s.perm("slayer").permanentId],
          instanceId: s.inst("examon").instanceId,
          useBlastDigivolve,
        }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT20-045"]);
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([
        "BT20-044",
        "BT20-027",
      ]);
    },
  );

  it.each([
    ["Breakdramon field + Slayerdramon hand", "BT20-044", "BT20-027"],
    ["Slayerdramon field + Breakdramon hand", "BT20-027", "BT20-044"],
  ] as const)("Blast DNA consumes the %s pair and draws exactly one", async (_label, fieldCard, handCard) => {
    const s = dnaFixture(fieldCard, handCard);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const drawId = s.state.players[0]!.deck[0]!.instanceId;
    const oldPermanentId = s.perm(fieldCard === "BT20-044" ? "fieldBreak" : "fieldSlayer").permanentId;
    const opened = await openCounter(s);
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("examon").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() && s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-045"),
    );
    const result = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT20-045")!;
    expect(result.permanentId).not.toBe(oldPermanentId);
    expect(result.isSuspended).toBe(false);
    expect(result.stack.map((card) => card.cardId)).toEqual(
      fieldCard === "BT20-044" ? ["BT20-027", "BT20-042", "BT20-044"] : ["BT20-025", "BT20-027", "BT20-044"],
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawId]);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT20-012")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT20-007")).toBe(true);
    expect(s.state.memory).toBe(3);
    expect(s.engine.applyIntent(0, { type: "respondCounter" }).ok).toBe(false);
  });

  it("does not open Blast DNA when the partner is only in a breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT20-044", as: "breeding" },
          hand: [
            { card: "BT20-027", as: "handMaterial" },
            { card: "BT20-045", as: "examon" },
          ],
        },
        1: { battleArea: [{ card: "BT20-009", as: "attacker" }], security: ["BT20-001"], deck: ["BT20-002"] },
      },
      { autoDeclineOptional: true },
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
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.events.some((event) => event.kind === "counterWindowOpened")).toBe(false);
  });

  it("does not use an opponent's field partner for Blast DNA", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-044", as: "fieldBreak", under: ["BT20-025"] }],
          hand: [{ card: "BT20-045", as: "examon" }],
        },
        1: {
          battleArea: [
            { card: "BT20-009", as: "attacker" },
            { card: "BT20-027", as: "enemySlayer" },
          ],
          security: ["BT20-001"],
          deck: ["BT20-002"],
        },
      },
      { autoDeclineOptional: true },
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
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.events.some((event) => event.kind === "counterWindowOpened")).toBe(false);
  });

  it("does not open Blast DNA for a wrong hand alias or two field materials", async () => {
    for (const board of [
      {
        battleArea: [{ card: "BT20-044", as: "fieldBreak", under: ["BT20-042"] }],
        hand: [
          { card: "BT20-025", as: "wrongHand" },
          { card: "BT20-045", as: "examon" },
        ],
      },
      {
        battleArea: [
          { card: "BT20-044", as: "fieldBreak", under: ["BT20-042"] },
          { card: "BT20-027", as: "secondField" },
        ],
        hand: [{ card: "BT20-045", as: "examon" }],
      },
    ]) {
      const s = setupEngine(
        {
          0: board,
          1: { battleArea: [{ card: "BT20-009", as: "attacker" }], security: ["BT20-001"], deck: ["BT20-002"] },
        },
        { autoDeclineOptional: true },
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
      await settle(() => !observe(s.engine).isAttacking());
      expect(s.events.some((event) => event.kind === "counterWindowOpened")).toBe(false);
    }
  });

  it("rejects an invalid stale Counter selection before accepting the real card", async () => {
    const s = dnaFixture("BT20-044", "BT20-027");
    s.state.turnSeat = 1;
    await s.ready();
    const opened = await openCounter(s);
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("examon").instanceId)!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible.instanceId,
        effectKey: `${eligible.effectKey}:stale`,
      }).ok,
    ).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("examon").instanceId);
    expect(s.engine.applyIntent(0, { type: "respondCounter" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
  });

  it.each([
    ["BT20-042", "BT20-027"],
    ["BT20-025", "BT20-044"],
  ])("accepts %s's field-only DNA name with printed hand material %s", async (fieldCard, handCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: fieldCard, as: "field" }],
          hand: [
            { card: handCard, as: "material" },
            { card: "BT20-045", as: "examon" },
          ],
        },
        1: { battleArea: [{ card: "BT20-009", as: "attacker" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const opened = await openCounter(s);
    const choice = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("examon").instanceId)!;
    expect(choice).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: choice.instanceId,
        effectKey: choice.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterResolved"));
    const result = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT20-045")!;
    expect(result.stack.map((card) => card.cardId)).toEqual(
      fieldCard === "BT20-042" ? [handCard, fieldCard] : [fieldCard, handCard],
    );
  });

  it("does not offer the pair when a public digivolution effect locks its field material", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-044", as: "field" }],
          hand: [
            { card: "BT20-027", as: "material" },
            { card: "BT20-045", as: "examon" },
          ],
          security: ["BT20-001"],
        },
        1: {
          battleArea: [
            { card: "BT20-054", as: "knight" },
            { card: "BT20-009", as: "attacker" },
          ],
          hand: [{ card: "BT19-073", as: "lock" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("knight").permanentId,
        instanceId: s.inst("lock").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("knight").topCard.cardId === "BT19-073" && s.state.pendingDecision === undefined);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.events.some((event) => event.kind === "counterWindowOpened")).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT20-027", "BT20-045"]);
  });

  it("rejects a second response while the accepted Blast DNA is still resolving", async () => {
    const s = dnaFixture("BT20-044", "BT20-027");
    s.state.turnSeat = 1;
    await s.ready();
    const opened = await openCounter(s);
    const choice = opened.eligibleCounters[0]!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: choice.instanceId,
        effectKey: choice.effectKey,
      }),
    ).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "respondCounter" }).ok).toBe(false);
    await settle(() => s.events.some((event) => event.kind === "counterResolved"));
    expect(s.events.filter((event) => event.kind === "counterResolved")).toEqual([
      expect.objectContaining({ activated: true }),
    ]);
  });

  it("passes the real Counter window without consuming either material", async () => {
    const s = dnaFixture("BT20-044", "BT20-027");
    s.state.turnSeat = 1;
    await s.ready();
    await openCounter(s);
    expect(s.engine.applyIntent(0, { type: "respondCounter" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT20-027", "BT20-045"]);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-044")).toBe(true);
  });
});
