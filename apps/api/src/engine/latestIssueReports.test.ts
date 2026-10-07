import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "./testkit/harness.js";
import { getCardDefinition } from "@aegis/shared";
import "../cards/index.js";

describe("latest issue verification", () => {
  it("#5246 decline evolution effect then use attack effect", async () => {
    const opts = {
      autoDeclineOptional: true,
      autoAcceptOptional: false,
      autoSelectCards: true,
      autoChooseOption: true,
      autoOrderTriggers: true,
    };
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "base" }],
          hand: [
            { card: "EX13-012", as: "savior" },
            { card: "ST12-13", as: "ciel" },
          ],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009"],
        },
        1: { deck: ["BT1-009"], security: ["BT1-009"] },
      },
      opts,
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("savior").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX13-012" && s.state.pendingDecision === undefined);
    await settle();
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("ciel").instanceId)).toBe(true);
    opts.autoDeclineOptional = false;
    opts.autoAcceptOptional = true;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await settle();
    expect(s.state.players[0]!.battleArea.some((c) => c.topCard.cardId === "ST12-13")).toBe(true);
  });
  it.each(["BT13-080", "BT13-083"])("#5241 Sleep Mode gets reduction from %s", async (gizmon) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-103", as: "kurata" },
            { card: gizmon, as: "gizmon" },
          ],
          hand: [{ card: "BT13-088", as: "sleep" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-009"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sleep").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((c) => c.topCard.cardId === "BT13-088") &&
        s.state.pendingDecision === undefined,
    );
    await settle();
    expect(s.state.memory).toBe(10 - (getCardDefinition("BT13-088")!.playCost - getCardDefinition(gizmon)!.playCost));
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("gizmon").instanceId)).toBe(true);
  });
});

it.each([false, true])("#5247 Crimson Blaze uses its discount despite play-cost blockers: %s", async (blocked) => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "BT1-009", as: "red" }], hand: [{ card: "BT8-097", as: "blaze" }] },
      1: {
        battleArea: [
          { card: blocked ? "ST13-08" : "BT1-009", as: "floodgate" },
          ...Array.from({ length: 4 }, (_, n) => ({ card: "BT1-025", as: "enemy" + n })),
        ],
        security: ["BT1-009"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
  );
  s.state.memory = 3;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blaze").instanceId })).toEqual({ ok: true });
  await settle();
  expect(s.state.players[0]!.trash.some((c) => c.cardId === "BT8-097")).toBe(true);
  expect(s.state.memory).toBe(2);
});

it("#5247 Chikurimon continues to block a Digimon play-cost discount", async () => {
  const s = setupEngine(
    {
      0: { hand: [{ card: "BT25-059", as: "ceres" }] },
      1: {
        battleArea: [
          { card: "ST13-08", as: "chiku" },
          { card: "BT1-025", suspended: true },
          { card: "BT1-025", suspended: true },
        ],
        security: ["BT1-009"],
      },
    },
    { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
  );
  s.state.memory = 3;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ceres").instanceId })).toEqual({ ok: true });
  await settle();
  expect(s.state.memory).toBe(-9);
});

it("#5239/#5207 Guard saves PrinceMamemon and Dorimon gains memory for the sacrificed Blocker", async () => {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "EX13-063", as: "prince", under: ["BT16-005"] },
          { card: "EX13-053", as: "thunder" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
        security: ["BT1-009"],
      },
      1: { battleArea: [{ card: "EX13-015", as: "gallant" }], deck: ["BT1-009"], security: ["BT1-009"] },
    },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      autoOrderTriggers: true,
      preferInstanceIds: preferred,
    },
  );
  s.state.memory = 3;
  await s.ready();
  preferred.push(s.inst("thunder").instanceId);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("prince").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((e) => e.kind === "counterWindowOpened"));
  const opened = s.events.find((e) => e.kind === "counterWindowOpened");
  if (opened?.kind !== "counterWindowOpened") throw new Error("No Counter window");
  const eligible = opened.eligibleCounters.find((e) => e.instanceId === s.inst("gallant").instanceId)!;
  expect(
    s.engine.applyIntent(1, {
      type: "respondCounter",
      sourceInstanceId: eligible.instanceId,
      effectKey: eligible.effectKey,
    }),
  ).toEqual({ ok: true });
  await settle();
  expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX13-063")).toBe(true);
  expect(s.decisions.some((d) => d.req.promptText === "Delete this Digimon to use Guard?")).toBe(true);
  expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX13-053")).toBe(false);
  expect(
    [...s.state.players[0]!.deck, ...s.state.players[0]!.trash].some(
      (c) => c.instanceId === s.inst("thunder").instanceId,
    ),
  ).toBe(true);
  expect(s.state.memory).toBe(4);
});

it("#5241 accepts an otherwise unaffordable Sleep Mode play using Kurata reduction", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT13-103", as: "kurata" },
          { card: "BT13-083", as: "gizmon" },
        ],
        hand: [{ card: "BT13-088", as: "sleep" }],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
  );
  s.state.memory = 0;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sleep").instanceId })).toEqual({ ok: true });
  await settle();
  expect(s.state.memory).toBe(-5);
  expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("gizmon").instanceId)).toBe(true);
});
