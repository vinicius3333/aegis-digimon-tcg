import { Phase } from "@aegis/shared";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";

it("orders the turn player's nested Tamer On Play before a rule deletion caused by the same digivolution effect", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT2-038", as: "base" }],
        hand: [{ card: "BT9-041", as: "rize" }, "BT17-087"],
        deck: ["BT1-009", "BT1-009"],
      },
      1: { battleArea: ["BT2-070"], deck: ["BT1-009", "BT1-009"] },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  s.state.memory = 8;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("rize").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle();
  expect(
    s.events.flatMap((e) =>
      e.kind === "effectTriggered" && ["BT17-087", "BT2-070"].includes(e.sourceCardId) ? [e.sourceCardId] : [],
    ),
  ).toEqual(["BT17-087", "BT2-070"]);
});

it("orders the turn player's nested Tamer On Play before an ordinary deletion caused by Trident Revolver", async () => {
  const s = setupEngine(
    {
      0: { battleArea: ["BT1-085"], hand: [{ card: "BT4-100", as: "option" }, "BT17-087"] },
      1: { battleArea: ["BT2-070"], deck: ["BT1-009", "BT1-009"] },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  s.state.memory = 8;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle();
  expect(
    s.events.flatMap((e) =>
      e.kind === "effectTriggered" && ["BT17-087", "BT2-070"].includes(e.sourceCardId) ? [e.sourceCardId] : [],
    ),
  ).toEqual(["BT17-087", "BT2-070"]);
});

it("groups both deletions from a security-played Goblimon's cost and effect using turn-player priority", async () => {
  const automation = { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: [] as string[] };
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT1-020", as: "attacker" },
          { card: "BT2-070", as: "turnTapir" },
        ],
        deck: ["BT1-009", "BT1-009"],
      },
      1: {
        battleArea: [{ card: "BT2-070", as: "costTapir" }],
        security: ["BT8-109"],
        trash: ["BT17-061"],
        deck: ["BT1-009", "BT1-009"],
      },
    },
    automation,
  );
  automation.preferInstanceIds.push(s.perm("attacker").permanentId, s.perm("costTapir").permanentId);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle();
  expect(
    s.events.flatMap((e) => (e.kind === "effectTriggered" && e.sourceCardId === "BT2-070" ? [e.seat] : [])),
  ).toEqual([0, 1]);
  expect(s.state.players[0]!.hand).toHaveLength(1);
  expect(s.state.players[1]!.hand).toHaveLength(1);
});

it("checks rule deletion before an Option-directed attack reaches security", async () => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "BT1-035", as: "attacker" }], hand: [{ card: "EX5-068", as: "option" }] },
      1: { battleArea: ["BT2-070"], deck: ["BT1-009", "BT1-009"], security: ["BT1-009"] },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  s.state.memory = 8;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle();
  const deleted = s.events.findIndex((e) => e.kind === "effectTriggered" && e.sourceCardId === "BT2-070");
  const checked = s.events.findIndex((e) => e.kind === "securityChecked");
  expect(deleted).toBeGreaterThanOrEqual(0);
  expect(checked).toBeGreaterThan(deleted);
});

it("finishes the new mixed-owner batch before an older Cool Boy digivolution watcher", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT2-038", as: "base" }, "BT9-092"],
        hand: [{ card: "BT9-041", as: "rize" }, "BT17-087"],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: { battleArea: ["BT2-070"], deck: ["BT1-009", "BT1-009"] },
    },
    { autoSelectCards: true, autoAcceptOptional: true, preferTriggerKeys: ["BT9-041"] },
  );
  s.state.memory = 8;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("rize").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle();
  expect(
    s.events.flatMap((e) =>
      e.kind === "effectTriggered" && ["BT9-041", "BT17-087", "BT2-070", "BT9-092"].includes(e.sourceCardId)
        ? [e.sourceCardId]
        : [],
    ),
  ).toEqual(["BT9-041", "BT17-087", "BT2-070", "BT9-092"]);
});

it.each([
  ["arena-rizegreymon-derived-priority", "BT9-041", ["BT17-087", "BT2-070", "BT9-092"]],
  ["arena-trident-derived-priority", "BT4-100", ["BT17-087", "BT2-070"]],
  ["arena-flashy-attack-priority", "EX5-068", ["BT2-070", "securityChecked"]],
  ["arena-dominimon-security-priority", "EX6-030", ["BT1-060", "BT16-013"]],
] as const)(
  "runs the %s companion scenario through the corrected priority",
  async (scenario, cardId, expectedOrder) => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoSelectCards: true, autoAcceptOptional: true, preferTriggerKeys: ["BT9-041"] },
    );
    s.engine.stagedDecks[0] = BLUE_DECK;
    s.engine.stagedDecks[1] = RED_DECK;
    s.engine.startDevScenario(scenario);
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const human = s.state.players[0]!;
      const card = human.hand.find((c) => c.cardId === cardId)!;
      const intent =
        cardId === "BT9-041" || cardId === "EX6-030"
          ? {
              type: "digivolve" as const,
              permanentId: human.battleArea.find(
                (p) => p.topCard.cardId === (cardId === "EX6-030" ? "BT1-060" : "BT2-038"),
              )!.permanentId,
              instanceId: card.instanceId,
            }
          : { type: "playCard" as const, instanceId: card.instanceId };
      expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
      await settle();
      const relevant = ["BT17-087", "BT2-070", "BT9-092", "BT1-060", "BT16-013"];
      const actualOrder = s.events.flatMap((event) => {
        if (event.kind === "securityChecked") return ["securityChecked"];
        return event.kind === "effectTriggered" && relevant.includes(event.sourceCardId) ? [event.sourceCardId] : [];
      });
      expect(actualOrder).toEqual(expectedOrder);
      expect(s.state.players[1]!.security).toHaveLength(cardId === "EX5-068" ? 0 : 1);
      expect(s.state.players[1]!.battleArea).toHaveLength(cardId === "EX6-030" ? 1 : 0);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  },
);

it("retains rule-deletion reactions created by a security-removal watcher", async () => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "BT2-070", as: "attacker" }], deck: ["BT1-009", "BT1-009"] },
      1: { battleArea: [{ card: "ST3-10", under: ["BT25-040"] }], security: ["BT1-010"] },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle();
  expect(s.events.filter((e) => e.kind === "effectTriggered" && e.sourceCardId === "BT2-070")).toHaveLength(1);
  expect(s.state.players[0]!.hand).toHaveLength(1);
});

it("resolves a security-played MagnaAngemon before the opponent's simultaneous security-removal watcher", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT1-060", as: "base" }],
        hand: [{ card: "EX6-030", as: "domini" }],
        security: ["BT1-060"],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: { battleArea: ["BT16-013"] },
    },
    { autoSelectCards: true, autoAcceptOptional: true, declinePrompts: ["prevent", "Prevent"] },
  );
  s.state.memory = 8;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("domini").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle();
  expect(
    s.events.flatMap((e) =>
      e.kind === "effectTriggered" && ["BT1-060", "BT16-013"].includes(e.sourceCardId) ? [e.sourceCardId] : [],
    ),
  ).toEqual(["BT1-060", "BT16-013"]);
});
