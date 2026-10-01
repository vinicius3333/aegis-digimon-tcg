import { describe, expect, it } from "vitest";
import {
  drainMicrotasks,
  findPermanent,
  setupEngine,
  settle,
  type CardSpec,
  type EngineSetup,
  type SetupEngineOptions,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-091.js";
import "../index.js";

describe("BT16-091", () => {
  it("plays Aquilamon or Gatomon and DNA digivolves in the main phase", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main" });
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
    });
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({
      kind: "DnaDigivolve",
      payCost: true,
      optional: true,
      bindResultAs: "bt16091DnaResult",
    });
  });

  it("grants Security Attack +1 and attacks with the DNA result", () => {
    expect(compiled.effects?.[0]?.actions?.[2]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: 1 },
      duration: "forTheTurn",
      optional: true,
    });
    expect(compiled.effects?.[0]?.actions?.[3]).toMatchObject({
      kind: "Attack",
      attackPlayer: true,
      condition: { kind: "ifThisEffectActed" },
    });
  });

  it("plays Hawkmon or Salamon from hand/trash and returns itself from security", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true },
        { kind: "AddToHandSelf" },
      ],
    });
  });

  it("DNA digivolves two existing Digimon and performs the paired attack choice", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-070", as: "purpleMaterial" },
            { card: "BT8-010", as: "redMaterial" },
            { card: "BT1-087", as: "yellowSource" },
          ],
          hand: [
            { card: "BT16-091", as: "option" },
            { card: "BT16-077", as: "result" },
          ],
        },
        1: { security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-077") &&
        s.events.some((event) => event.kind === "attackDeclared"),
    );

    const result = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT16-077");
    expect(result).toBeDefined();
    expect(observe(s.engine).keywordAmount(result!, "SecurityAttack")).toBe(1);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });
});

describe("BT16-091 Beastly Storm Dance of Affection — KB Q&A rulings", () => {
  const cardIdsOnBoard = (s: EngineSetup): (string | undefined)[] =>
    s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId);

  const attackerCardIds = (s: EngineSetup): string[] =>
    s.events.flatMap((event) => (event.kind === "attackDeclared" ? [event.attackerCardId] : []));

  function silphymonFixture(hand: CardSpec[], options: SetupEngineOptions): EngineSetup {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-010", as: "redMaterial" },
            { card: "BT16-031", as: "yellowMaterial" },
          ],
          hand: [{ card: "BT16-091", as: "option" }, ...hand],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-009", "BT1-010", "BT1-011"], deck: ["BT1-009", "BT1-010"] },
      },
      { autoSelectCards: true, declineDigiXros: true, ...options },
    );
    s.state.memory = 10;
    return s;
  }

  async function playOption(s: EngineSetup): Promise<void> {
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT16-091"));
    await drainMicrotasks();
  }

  it("a Digimon given Rush by Dinobeemon's [When Digivolving] can't attack while Dinobeemon is attacking by this effect (Q2664)", async () => {
    async function dinobeemonScenario(digivolveThroughOption: boolean): Promise<EngineSetup> {
      const preferInstanceIds: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT16-070", as: "purpleMaterial" },
              { card: "BT8-010", as: "redMaterial" },
              { card: "BT1-087", as: "yellowSource" },
            ],
            hand: [
              { card: "BT16-091", as: "option" },
              { card: "BT16-077", as: "dinobeemon" },
            ],
            trash: [{ card: "BT16-008", as: "freeAquilamon" }],
            deck: ["BT1-009", "BT1-010", "BT1-011"],
          },
          1: { security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"], deck: ["BT1-009", "BT1-010"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true, preferInstanceIds },
      );
      s.state.memory = 10;
      preferInstanceIds.push(s.inst("freeAquilamon").instanceId);
      await s.ready();
      const result = digivolveThroughOption
        ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })
        : s.engine.applyIntent(0, {
            type: "dnaDigivolve",
            materialPermanentIds: [s.perm("purpleMaterial").permanentId, s.perm("redMaterial").permanentId],
            instanceId: s.inst("dinobeemon").instanceId,
          });
      expect(result).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-008"));
      await drainMicrotasks();
      return s;
    }

    const throughOption = await dinobeemonScenario(true);
    const played = findPermanent(throughOption, 0, "BT16-008");
    expect(observe(throughOption.engine).hasKeyword(played, "Rush")).toBe(true);
    expect(played.isSuspended).toBe(false);
    expect(attackerCardIds(throughOption)).toEqual(["BT16-077"]);

    const control = await dinobeemonScenario(false);
    expect(attackerCardIds(control)).toEqual(["BT16-008"]);
    expect(findPermanent(control, 0, "BT16-008").isSuspended).toBe(true);
  });

  it("can play Aquilamon or Gatomon without DNA digivolving (Q2689)", async () => {
    const s = silphymonFixture(
      [
        { card: "BT16-008", as: "aquilamon" },
        { card: "BT16-012", as: "silphymon" },
      ],
      { autoAcceptOptional: true, declinePrompts: ["DNA digivolve"] },
    );
    await playOption(s);

    expect(
      s.decisions.some(({ req }) => req.sourceCardId === "BT16-091" && req.promptText.includes("DNA digivolve")),
    ).toBe(true);
    expect(cardIdsOnBoard(s).sort()).toEqual(["BT16-008", "BT16-031", "BT8-010"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("silphymon").instanceId]);
    expect(attackerCardIds(s)).toEqual([]);
  });

  it("can skip the play and DNA digivolve 2 Digimon already in the battle area (Q2690)", async () => {
    const s = silphymonFixture(
      [
        { card: "BT16-031", as: "gatomonInHand" },
        { card: "BT16-012", as: "silphymon" },
      ],
      { autoAcceptOptional: true, declinePrompts: ["Play without paying the cost", "Security Attack"] },
    );
    await playOption(s);

    expect(
      s.decisions.some(
        ({ req }) => req.sourceCardId === "BT16-091" && req.promptText.includes("Play without paying the cost"),
      ),
    ).toBe(true);
    expect(cardIdsOnBoard(s)).toEqual(["BT16-012"]);
    expect(
      findPermanent(s, 0, "BT16-012")
        .stack.map((card) => card.cardId)
        .sort(),
    ).toEqual(["BT16-031", "BT8-010"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("gatomonInHand").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT16-012");
  });

  it("gains Security A. +1 only together with the attack, never without it (Q2691)", async () => {
    const accepted = silphymonFixture([{ card: "BT16-012", as: "silphymon" }], { autoAcceptOptional: true });
    await playOption(accepted);
    const acceptedResult = findPermanent(accepted, 0, "BT16-012");
    const optionPrompts = accepted.decisions
      .filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT16-091")
      .map(({ req }) => req.promptText);
    expect(optionPrompts).toHaveLength(2);
    expect(optionPrompts[1]).toContain("Security Attack +1");
    expect(observe(accepted.engine).keywordAmount(acceptedResult, "SecurityAttack")).toBe(1);
    expect(attackerCardIds(accepted)).toEqual(["BT16-012"]);
    expect(accepted.state.players[1]!.security).toHaveLength(1);

    const declined = silphymonFixture([{ card: "BT16-012", as: "silphymon" }], {
      autoAcceptOptional: true,
      declinePrompts: ["Security Attack"],
    });
    await playOption(declined);
    const declinedResult = findPermanent(declined, 0, "BT16-012");
    expect(observe(declined.engine).keywordAmount(declinedResult, "SecurityAttack")).toBe(0);
    expect(attackerCardIds(declined)).toEqual([]);
    expect(declinedResult.isSuspended).toBe(false);
  });
});
