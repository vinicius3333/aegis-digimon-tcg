import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT6-060.js";
import "./BT6-017.js";
import "./BT6-065.js";
import "../BT16/BT16-027.js";
import "../BT16/BT16-028.js";
import "../BT20/BT20-078.js";
import "../LM/LM-067.js";
import "../P/P-103.js";
import "../P/P-107.js";

describe("BT6-060 Deputymon", () => {
  it("adds a Three Musketeers Digimon and cost-7 Option, then trashes the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT6-060", as: "beelstar" }],
          deck: [
            { card: "BT6-017", as: "musketeer" },
            { card: "BT1-101", as: "option" },
            { card: "BT1-010", as: "rest1" },
            { card: "BT1-011", as: "rest2" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beelstar").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2 && s.state.players[0]!.trash.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("musketeer").instanceId, s.inst("option").instanceId]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("rest1").instanceId, s.inst("rest2").instanceId]),
    );
  });

  it("keeps all four revealed identities visible through both toolbox choices", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT6-060", as: "deputymon" }],
        deck: [
          { card: "BT6-017", as: "musketeer" },
          { card: "BT1-101", as: "option" },
          { card: "BT1-010", as: "restOne" },
          { card: "BT1-011", as: "restTwo" },
        ],
      },
    });
    s.state.memory = 20;
    const visibleCards = [
      { instanceId: s.inst("musketeer").instanceId, cardId: "BT6-017" },
      { instanceId: s.inst("option").instanceId, cardId: "BT1-101" },
      { instanceId: s.inst("restOne").instanceId, cardId: "BT1-010" },
      { instanceId: s.inst("restTwo").instanceId, cardId: "BT1-011" },
    ];

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("deputymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const musketeerDecision = s.decisions.at(-1)!.req;
    expect(musketeerDecision.sourceCardId).toBe("BT6-060");
    expect(musketeerDecision.options?.visibleCards).toEqual(visibleCards);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: musketeerDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("musketeer").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return (
        latest !== undefined &&
        latest.decisionId === s.state.pendingDecision?.decisionId &&
        latest.kind === "selectCards" &&
        latest.decisionId !== musketeerDecision.decisionId
      );
    });

    const optionDecision = s.decisions.at(-1)!.req;
    expect(optionDecision.sourceCardId).toBe("BT6-060");
    expect(optionDecision.options?.visibleCards).toEqual(visibleCards);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optionDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("option").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("musketeer").instanceId, s.inst("option").instanceId]),
    );
  });

  it("lets a Three Musketeers Digimon from hand digivolve onto it for 6, ignoring requirements", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-060", as: "deputymon" }],
          hand: [{ card: "BT6-112", as: "beelstarmon" }],
          deck: ["BT6-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const deputymonInstanceId = s.perm("deputymon").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("deputymon").permanentId,
        instanceId: s.inst("beelstarmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("deputymon").topCard.instanceId === s.inst("beelstarmon").instanceId);

    expect(s.state.memory).toBe(4);
    expect(s.perm("deputymon").stack.map((card) => card.instanceId)).toEqual([deputymonInstanceId]);
  });

  it("does not waive requirements for a card without the Three Musketeers trait or on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-060", as: "deputymon" }],
        hand: [
          { card: "BT2-078", as: "weregarurumon" },
          { card: "BT6-112", as: "beelstarmon" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("deputymon").permanentId,
        instanceId: s.inst("weregarurumon").instanceId,
      }),
    ).toMatchObject({ ok: false });

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("deputymon").permanentId,
        instanceId: s.inst("beelstarmon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("deputymon").topCard.cardId).toBe("BT6-060");
  });
});

const deputymonActivatableEffects = (s: EngineSetup) =>
  observe(s.engine).activatableEffects(s.perm("deputymon")) as { effectKey: string }[];

const activateDelayOption = (s: EngineSetup, alias: string) => {
  const [ability] = JSON.parse(s.perm(alias).activatableEffectsJson) as { effectKey: string }[];
  return s.engine.applyIntent(s.state.turnSeat, {
    type: "activateEffect",
    sourceInstanceId: s.inst(alias).instanceId,
    effectKey: ability!.effectKey,
  });
};

const revealOnPlay = async (deck: { card: string; as: string }[]) => {
  const s = setupEngine(
    { 0: { hand: [{ card: "BT6-060", as: "deputymon" }], deck: [...deck, { card: "BT1-012", as: "fifth" }] } },
    { autoSelectCards: true },
  );
  s.state.memory = 20;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deputymon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.trash.length === 3 && s.state.pendingDecision === undefined);
  return s;
};

type OpponentDeputymonRoute = "permission" | "trainingEffect";

const opponentDigivolvesDeputymon = async (watcher: "BT20-078" | "BT16-028", route: OpponentDeputymonRoute) => {
  const watcherSeat =
    watcher === "BT20-078"
      ? { battleArea: [{ card: "BT20-078", as: "watcher" }], deck: ["BT1-001", "BT1-001"] }
      : {
          battleArea: [{ card: "BT16-028", as: "watcher" }, "BT1-087"],
          hand: [{ card: "BT16-027", as: "fighterMode" }],
          deck: ["BT1-001", "BT1-001"],
        };
  const s = setupEngine(
    {
      0: watcherSeat,
      1: {
        battleArea: [
          { card: "BT6-060", as: "deputymon" },
          { card: "P-103", as: "offenseTraining" },
        ],
        hand: [{ card: "BT6-017", as: "magnaKidmon" }],
        deck: ["BT1-001", "BT1-001", "BT1-001"],
      },
    },
    { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
  );
  s.state.turnSeat = 1;
  s.state.turnCount = 2;
  s.state.memory = 10;
  await s.ready();

  if (route === "permission") {
    expect(deputymonActivatableEffects(s)).toEqual([]);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("deputymon").permanentId,
        instanceId: s.inst("magnaKidmon").instanceId,
      }),
    ).toEqual({ ok: true });
  } else {
    expect(activateDelayOption(s, "offenseTraining")).toEqual({ ok: true });
  }
  const magnaKidmonId = s.inst("magnaKidmon").instanceId;
  await settle(() => isOnTopOfBattleArea(s, 1, magnaKidmonId) && s.state.pendingDecision === undefined);
  await drainMicrotasks();
  return s;
};

const isInZone = (s: EngineSetup, seat: 0 | 1, zone: "hand" | "trash", instanceId: string) =>
  s.state.players[seat]![zone].some((card) => card.instanceId === instanceId);

const isOnTopOfBattleArea = (s: EngineSetup, seat: 0 | 1, instanceId: string) =>
  s.state.players[seat]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId);

const effectTriggeredBy = (s: EngineSetup, cardId: string) =>
  s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === cardId);

describe("BT6-060 Deputymon — KB Q&A rulings", () => {
  it("adds a revealed card of one category even when the other category is missing (Q1453)", async () => {
    const onlyMusketeer = await revealOnPlay([
      { card: "BT6-017", as: "musketeer" },
      { card: "BT1-102", as: "cheapOption" },
      { card: "BT1-010", as: "restOne" },
      { card: "BT1-011", as: "restTwo" },
    ]);
    expect(onlyMusketeer.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      onlyMusketeer.inst("musketeer").instanceId,
    ]);
    expect(onlyMusketeer.state.players[0]!.trash.map((card) => card.instanceId)).toContain(
      onlyMusketeer.inst("cheapOption").instanceId,
    );

    const onlyOption = await revealOnPlay([
      { card: "BT1-010", as: "restOne" },
      { card: "BT1-101", as: "option" },
      { card: "BT1-011", as: "restTwo" },
      { card: "BT1-012", as: "restThree" },
    ]);
    expect(onlyOption.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      onlyOption.inst("option").instanceId,
    ]);
    expect(onlyOption.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      onlyOption.inst("fifth").instanceId,
    ]);
  });

  it("digivolves into a [Three Musketeers] card from hand through another effect's digivolution (Q1454)", async () => {
    const board = (baseCard: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: baseCard, as: "base" },
              { card: "P-103", as: "offenseTraining" },
            ],
            hand: [{ card: "BT6-017", as: "magnaKidmon" }],
            deck: ["BT1-001", "BT1-001"],
          },
          1: { deck: ["BT1-001"] },
        },
        { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
      );
      s.state.turnCount = 2;
      s.state.memory = 10;
      return s;
    };

    const withDeputymon = board("BT6-060");
    await withDeputymon.ready();
    expect(activateDelayOption(withDeputymon, "offenseTraining")).toEqual({ ok: true });
    await settle(
      () =>
        withDeputymon.perm("base").topCard.cardId === "BT6-017" && withDeputymon.state.pendingDecision === undefined,
    );
    expect(withDeputymon.perm("base").stack.map((card) => card.cardId)).toEqual(["BT6-060"]);
    expect(withDeputymon.state.memory).toBe(6);

    const withoutPermission = board("BT10-062");
    await withoutPermission.ready();
    expect(activateDelayOption(withoutPermission, "offenseTraining")).toEqual({ ok: true });
    await settle(() => withoutPermission.state.pendingDecision === undefined);
    await drainMicrotasks();
    expect(withoutPermission.perm("base").topCard.cardId).toBe("BT10-062");
    expect(isInZone(withoutPermission, 0, "hand", withoutPermission.inst("magnaKidmon").instanceId)).toBe(true);
  });

  it("digivolving through its permission is not an effect digivolution for Imperialdramon: Dragon Mode (Q2624)", async () => {
    const permission = await opponentDigivolvesDeputymon("BT16-028", "permission");
    expect(effectTriggeredBy(permission, "BT6-017")).toBe(true);
    expect(permission.perm("deputymon").topCard.cardId).toBe("BT6-017");
    expect(permission.perm("watcher").topCard.cardId).toBe("BT16-028");
    expect(isInZone(permission, 0, "hand", permission.inst("fighterMode").instanceId)).toBe(true);

    const effectDigivolve = await opponentDigivolvesDeputymon("BT16-028", "trainingEffect");
    expect(effectDigivolve.perm("watcher").topCard.cardId).toBe("BT16-027");
    expect(isInZone(effectDigivolve, 0, "hand", effectDigivolve.inst("fighterMode").instanceId)).toBe(false);
  });

  it("digivolving through its permission does not trigger Reapermon's when-effects-digivolve effect (Q4402)", async () => {
    const permission = await opponentDigivolvesDeputymon("BT20-078", "permission");
    expect(effectTriggeredBy(permission, "BT6-017")).toBe(true);
    expect(effectTriggeredBy(permission, "BT20-078")).toBe(false);
    expect(permission.perm("deputymon").topCard.cardId).toBe("BT6-017");
    expect(permission.perm("deputymon").stack.map((card) => card.cardId)).toEqual(["BT6-060"]);

    const effectDigivolve = await opponentDigivolvesDeputymon("BT20-078", "trainingEffect");
    expect(effectTriggeredBy(effectDigivolve, "BT20-078")).toBe(true);
    expect(effectDigivolve.perm("deputymon").topCard.cardId).toBe("BT6-060");
  });

  it("cannot Arts Digivolve into a used [Three Musketeers] DUAL Option by ignoring requirements (Q6236)", async () => {
    const useGundramonOption = async (battleArea: { card: string; as: string }[]) => {
      const s = setupEngine(
        {
          0: { battleArea, hand: [{ card: "LM-067", as: "gundramon" }], deck: ["BT1-001", "BT1-001"] },
          1: { battleArea: [{ card: "BT1-009", as: "opponentDigimon" }] },
        },
        {
          autoAcceptOptional: true,
          autoChooseOption: true,
          autoSelectCards: true,
          declinePrompts: ["Arts Digivolve"],
        },
      );
      s.state.memory = 10;
      await s.ready();
      const gundramonId = s.inst("gundramon").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: gundramonId, useAs: "option" } as never)).toEqual({
        ok: true,
      });
      await settle(() => isInZone(s, 0, "trash", gundramonId) && s.state.pendingDecision === undefined);
      return s;
    };
    const artsCandidates = (s: EngineSetup) =>
      s.decisions
        .filter(({ req }) => req.promptText?.includes("Arts Digivolve"))
        .flatMap(({ req }) => (req.options?.candidateInstanceIds ?? []) as string[]);

    const onlyDeputymon = await useGundramonOption([{ card: "BT6-060", as: "deputymon" }]);
    expect(artsCandidates(onlyDeputymon)).toEqual([]);
    expect(onlyDeputymon.perm("deputymon").topCard.cardId).toBe("BT6-060");

    const withLevelFive = await useGundramonOption([
      { card: "BT6-060", as: "deputymon" },
      { card: "BT10-062", as: "levelFour" },
      { card: "BT10-064", as: "levelFive" },
    ]);
    expect(artsCandidates(withLevelFive)).toEqual([withLevelFive.perm("levelFive").topCard.instanceId]);
  });

  it("digivolves through Defense Training's effect using its ignore-requirements permission (Q6237)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT6-060", as: "deputymon" },
            { card: "P-107", as: "defenseTraining" },
          ],
          hand: [{ card: "BT6-065", as: "gundramon" }],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
        },
        1: { deck: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.turnCount = 2;
    s.state.memory = 10;
    await s.ready();

    expect(activateDelayOption(s, "defenseTraining")).toEqual({ ok: true });
    await settle(() => s.perm("deputymon").topCard.cardId === "BT6-065" && s.state.pendingDecision === undefined);

    expect(s.perm("deputymon").stack.map((card) => card.cardId)).toEqual(["BT6-060"]);
    expect(s.state.memory).toBe(6);
    expect(isInZone(s, 0, "trash", s.inst("defenseTraining").instanceId)).toBe(true);
  });
});
