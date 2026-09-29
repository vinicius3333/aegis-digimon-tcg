import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-028.js";
import "../index.js";
import "../BT4/BT4-011.js";
import "../BT5/BT5-007.js";
import "../BT5/BT5-092.js";
import "../BT6/BT6-017.js";
import "../BT6/BT6-060.js";
import "../P/P-103.js";
import "./BT16-027.js";

describe("BT16-028", () => {
  it("matches the catalog identity and Fighter Mode evolution route", () => {
    expect(getCardDefinition("BT16-028")).toMatchObject({
      nameEn: "Imperialdramon: Dragon Mode",
      colors: ["Blue", "Green"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 4 },
        { color: "Green", level: 5, memoryCost: 4 },
      ],
      types: ["Ancient Dragon"],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Paildramon", "Dinobeemon"], cost: 3, isAlternate: true },
    ]);
  });

  it("restricts an opposing Digimon or Tamer and unsuspends yours", () => {
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({
      kind: "Restrict",
      restriction: "unsuspend",
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({
      kind: "Unsuspend",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "suspend" },
    });
  });

  it("can DNA digivolve into Imperialdramon: Fighter Mode when an opponent's effect plays or digivolves", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns" });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      actions: [{ kind: "Digivolve", payCost: false, from: ["hand"], optional: true }],
    });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOneOfYoursDigivolves",
    });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      actions: [
        {
          condition: {
            kind: "allOf",
            conditions: [{ kind: "youHave" }, { kind: "triggerPlayedOrDigivolvedByEffect" }],
          },
        },
      ],
    });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      actions: [
        {
          condition: {
            kind: "allOf",
            conditions: [{ kind: "youHave" }, { kind: "triggerPlayedOrDigivolvedByEffect" }],
          },
        },
      ],
    });
  });

  it("restricts an opponent and pays by suspending them to unsuspend your Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-025", as: "source", suspended: true }],
          hand: [{ card: "BT16-028", as: "dragonMode" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("dragonMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("source").isSuspended && s.perm("opponent").isSuspended);

    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend")).toBe(true);
  });

  it("Blast Digivolves naturally when an opponent's effect plays a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-028", as: "source" },
            { card: "BT1-087", as: "tamer" },
          ],
          hand: [{ card: "BT16-027", as: "fighterMode" }],
        },
        1: {
          hand: [
            { card: "BT5-092", as: "nokia" },
            { card: "BT5-007", as: "agumon" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("nokia").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("source").topCard?.cardId === "BT16-027");

    expect(s.perm("source").topCard?.cardId).toBe("BT16-027");
  });

  it("Blast Digivolves naturally when an opponent's effect digivolves a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-028", as: "source" },
            { card: "BT1-087", as: "tamer" },
          ],
          hand: [{ card: "BT16-027", as: "fighterMode" }],
        },
        1: {
          hand: [{ card: "BT16-030", as: "salamon" }],
          trash: [{ card: "BT16-031", as: "gatomon" }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("salamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("source").topCard?.cardId === "BT16-027");

    expect(s.perm("source").topCard?.cardId).toBe("BT16-027");
  });
});

type OpponentRoute =
  | "nokiaEffectPlay"
  | "offenseTrainingEffectDigivolve"
  | "agunimonOntoTamer"
  | "deputymonIgnoringRequirements";

async function dragonModeWatchesOpponent(route: OpponentRoute): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT16-028", as: "dragonMode" }, "BT1-087"],
        hand: [{ card: "BT16-027", as: "fighterMode" }],
        deck: ["BT1-001", "BT1-001"],
      },
      1: {
        battleArea: [
          { card: "BT1-085", as: "redTamer" },
          { card: "BT1-009", as: "redRookie" },
          { card: "BT6-060", as: "deputymon" },
          { card: "P-103", as: "offenseTraining" },
        ],
        hand: [
          { card: "BT5-092", as: "nokia" },
          { card: "BT5-007", as: "agumon" },
          { card: "BT1-016", as: "redChampion" },
          { card: "BT4-011", as: "agunimon" },
          { card: "BT6-017", as: "magnaKidmon" },
        ],
        deck: ["BT1-001", "BT1-002", "BT1-003"],
      },
    },
    { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
  );
  s.state.turnSeat = 1;
  s.state.turnCount = 2;
  s.state.memory = 10;
  await s.ready();

  const intentByRoute = {
    nokiaEffectPlay: () => s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("nokia").instanceId }),
    offenseTrainingEffectDigivolve: () => {
      const [delay] = JSON.parse(s.perm("offenseTraining").activatableEffectsJson) as { effectKey: string }[];
      return s.engine.applyIntent(1, {
        type: "activateEffect",
        sourceInstanceId: s.inst("offenseTraining").instanceId,
        effectKey: delay!.effectKey,
      });
    },
    agunimonOntoTamer: () =>
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("redTamer").permanentId,
        instanceId: s.inst("agunimon").instanceId,
      }),
    deputymonIgnoringRequirements: () =>
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("deputymon").permanentId,
        instanceId: s.inst("magnaKidmon").instanceId,
      }),
  } satisfies Record<OpponentRoute, () => unknown>;

  expect(intentByRoute[route]()).toEqual({ ok: true });
  await drainMicrotasks();
  return s;
}

function dragonModeWatcherTriggered(s: EngineSetup): boolean {
  return s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT16-028");
}

describe("BT16-028 Imperialdramon: Dragon Mode — KB Q&A rulings", () => {
  it("lets the turn player's [On Play] resolve before this card's simultaneous [All Turns] digivolve (Q2623)", async () => {
    const s = await dragonModeWatchesOpponent("nokiaEffectPlay");

    const activationOrder = s.events.flatMap((event) =>
      event.kind === "effectTriggered" && (event.sourceCardId === "BT5-007" || event.sourceCardId === "BT16-028")
        ? [event.sourceCardId]
        : [],
    );
    const agumonResolved = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "BT5-007",
    );
    const dragonModeTriggered = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT16-028",
    );

    expect(activationOrder).toEqual(["BT5-007", "BT16-028"]);
    expect(agumonResolved).toBeGreaterThanOrEqual(0);
    expect(agumonResolved).toBeLessThan(dragonModeTriggered);
    expect(s.perm("dragonMode").topCard?.cardId).toBe("BT16-027");
  });

  it("triggers only on digivolutions and plays done by effects, not on rule-granted digivolve permissions (Q2624)", async () => {
    const effectPlay = await dragonModeWatchesOpponent("nokiaEffectPlay");
    expect(effectPlay.perm("dragonMode").topCard?.cardId).toBe("BT16-027");

    const effectDigivolve = await dragonModeWatchesOpponent("offenseTrainingEffectDigivolve");
    expect(
      effectDigivolve.events.some(
        (event) => event.kind === "digivolved" && event.seat === 1 && event.cardId === "BT1-016",
      ),
    ).toBe(true);
    expect(effectDigivolve.perm("dragonMode").topCard?.cardId).toBe("BT16-027");

    const agunimon = await dragonModeWatchesOpponent("agunimonOntoTamer");
    expect(agunimon.perm("redTamer").topCard?.cardId).toBe("BT4-011");
    expect(dragonModeWatcherTriggered(agunimon)).toBe(false);
    expect(agunimon.perm("dragonMode").topCard?.cardId).toBe("BT16-028");

    const deputymon = await dragonModeWatchesOpponent("deputymonIgnoringRequirements");
    expect(deputymon.perm("deputymon").topCard?.cardId).toBe("BT6-017");
    expect(dragonModeWatcherTriggered(deputymon)).toBe(false);
    expect(deputymon.perm("dragonMode").topCard?.cardId).toBe("BT16-028");
  });
});
