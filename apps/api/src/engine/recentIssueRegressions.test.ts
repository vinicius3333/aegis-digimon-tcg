import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { observe } from "./testkit/observe.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("recent issue regressions", () => {
  it.each([
    ["BT22-026", "BT1-038"],
    ["BT22-013", "BT1-021"],
  ])("issue #5217: %s offers the optional evolution bullet even without its rookie", async (card, base) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: base, as: "base" }], hand: [{ card, as: "evolution" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.pendingDecision?.kind).toBe("chooseOption");
    const decisionId = s.state.pendingDecision!.decisionId;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId,
        response: { kind: "chooseOption", optionIndex: 0 },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    [["EX12-060", "EX12-060"], 3],
    [["EX12-060", "EX12-060", "EX9-011", "ST15-11"], 5],
  ] as const)("issue #5221: independent sources %s grant %s checks (Q1941)", async (sources, checks) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-072", as: "chaos", under: [...sources] }] },
        1: { security: Array.from({ length: 6 }, () => "BT1-009") },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("chaos").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "attackEnded"));
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(checks);
  });

  it("issue #5235: a direct Battle during When Attacking finishes its enclosing effect before Jupiter reacts", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX13-077", as: "large" },
            { card: "BT25-020", as: "attacker" },
          ],
        },
        1: { battleArea: [{ card: "BT26-103", as: "jupiter", under: ["EX13-030"] }], security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("large").permanentId);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(1, { type: "respondBarrier", permanentId: s.perm("jupiter").permanentId, accept: true }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT26-103"));
    const resolved = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "BT25-020" && event.timing === "OnUseAttack",
    );
    const reaction = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT26-103",
    );
    expect(resolved).toBeGreaterThanOrEqual(0);
    expect(reaction).toBeGreaterThan(resolved);
  });
  it("issue #5235: security removal reactions wait for all Merciful Mode battles", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX13-077", as: "merciful" }],
          battleArea: ["AD1-001", "AD1-010", "AD1-014", "AD1-025", "ST20-05", "ST20-07"].map((card) => ({ card })),
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT26-103", as: "jupiter", under: ["EX13-030"] }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      {
        autoAcceptOptional: true,
        declinePrompts: ["Attack"],
        autoChooseOption: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferOptionIndex: 0,
      },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("merciful").instanceId })).toEqual({
      ok: true,
    });
    for (let n = 0; n < 3; n++) {
      await settle(() => s.events.filter((event) => event.kind === "barrierPrompt").length > n);
      expect(s.events.filter((event) => event.kind === "barrierPrompt")).toHaveLength(n + 1);
      expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT26-103")).toBe(
        false,
      );
      expect(
        s.engine.applyIntent(1, { type: "respondBarrier", permanentId: s.perm("jupiter").permanentId, accept: true }),
      ).toEqual({ ok: true });
    }
    await settle(() => s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT26-103"));
    const resolved = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "EX13-077" && event.timing === "OnPlay",
    );
    const reaction = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT26-103",
    );
    expect(resolved).toBeGreaterThanOrEqual(0);
    expect(reaction).toBeGreaterThan(resolved);
  });
});

it("issue #5227: Habakirimon security trash lets Kyo debuff the opposing attacker", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT25-043", as: "habaki" },
          { card: "BT26-089", as: "kyo" },
        ],
        deck: ["BT1-009", "BT1-009"],
        security: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-084", as: "target", suspended: true }], security: ["BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
  );
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("habaki").permanentId,
      target: { kind: "permanent", permanentId: s.perm("target").permanentId },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("kyo").stack.length === 1 && s.state.pendingDecision === undefined);
  await settle(() => s.events.some((event) => event.kind === "attackEnded"));
  expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
});

it("issue #5225: Candlemon protects only its own host from Crimson Blaze", async () => {
  const s = setupEngine(
    {
      0: { hand: [{ card: "BT8-097", as: "blaze" }], battleArea: [{ card: "BT1-009" }] },
      1: {
        battleArea: [
          { card: "EX13-033", as: "misty", under: ["EX13-025"] },
          { card: "BT1-045", as: "rookie" },
        ],
        security: ["BT1-009"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 20;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blaze").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-045"));
  expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["EX13-033"]);
});

it("issue #5218: Landramon's inherited effect activates after it pays an evolution effect's source-trash cost", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "P-167", as: "host" }],
        hand: [{ card: "EX10-032", as: "evolution" }],
        deck: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-025", as: "target", under: ["BT1-009"] }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
  );
  s.state.memory = 20;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("evolution").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX10-032"));
  await settle();
  expect(s.perm("target").topCard.cardId).toBe("BT1-009");
});
