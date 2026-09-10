import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-099.js";
import "./index.js";

describe("BT20-099 Singularity of Chaos", () => {
  it("matches the complete catalog contract and printed zones", () => {
    expect(getCardDefinition("BT20-099")).toMatchObject({
      cardId: "BT20-099",
      nameEn: "Singularity of Chaos",
      colors: ["White"],
      kinds: ["Option"],
      playCost: 2,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["ACCEL"],
      maxCountInDeck: 4,
    });
    const printed = getCardDefinition("BT20-099")!;
    const effectText = printed.effectText!.replaceAll("\u00a0", " ");
    expect(effectText).toContain("While you have a Digimon with [Chaosmon] in its name or the [ACCEL] trait");
    expect(effectText).toContain(
      "[Main] You may play 1 Digimon card with the [ACCEL] trait from your hand with the play cost reduced by 4. Then, place this card as any of your Digimon's bottom digivolution card.",
    );
    expect(printed.securityEffectText!.replaceAll("\u00a0", " ")).toBe(
      "[End of Opponent's Turn] If this Digimon has [Chaosmon] in its name, trash your opponent's top security card and this Digimon gets -30000 DP for the turn.",
    );
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("encodes the ACCEL play reduction directly", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({
      actions: [
        { kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 4, optional: true },
        { kind: "PlaceUnder", position: "bottom", underFilter: { controller: "mine", kind: ["Digimon"] } },
      ],
    });
    expect(main?.actions.some((action) => action.kind === "Replacement")).toBe(false);
    expect(main?.actions[1]?.optional).not.toBe(true);
  });

  it("keeps the color waiver scoped to Chaosmon or ACCEL", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Static")).toMatchObject({
      actions: [
        {
          kind: "WaiveColorRequirement",
          condition: {
            kind: "youHave",
            filter: {
              nameOrTrait: [
                { tokens: ["Chaosmon"], match: "name" },
                { tokens: ["ACCEL"], match: "trait" },
              ],
            },
          },
        },
      ],
    });
  });

  it("marks the printed Security memory-and-hand effect as Security-resident", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "GainMemory", amount: 1 }, { kind: "AddToHandSelf" }],
    });
  });

  it("keeps the end-of-opponent-turn Chaosmon clause inherited rather than Security-only", () => {
    const inherited = compiled.effects.find((entry) => entry.trigger === "EndOfOpponentsTurn");
    expect(inherited).toMatchObject({
      isInherited: true,
      actions: [
        { kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 },
        { kind: "ModifyDP", amount: -30000, duration: "forTheTurn" },
      ],
    });
    expect(inherited?.isSecurity).not.toBe(true);
  });

  it("naturally plays an ACCEL Digimon for the reduced cost and places this card underneath it", async () => {
    const options = {
      autoAcceptOptional: true,
      autoSelectCards: true,
      preferInstanceIds: [] as string[],
    };
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT20-099", as: "option" },
            { card: "BT20-030", as: "liollmon" },
          ],
          battleArea: ["BT20-092", "BT4-090"],
          deck: ["BT1-010"],
        },
      },
      options,
    );
    const optionId = s.inst("option").instanceId;
    const liollmonId = s.inst("liollmon").instanceId;
    options.preferInstanceIds.push(liollmonId);
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) =>
          permanent.topCard.instanceId === liollmonId && permanent.stack.some((card) => card.instanceId === optionId),
      ),
    );

    const playedAccel = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === liollmonId);
    expect(playedAccel).toBeDefined();
    expect(playedAccel!.topCard.cardId).toBe("BT20-030");
    expect(playedAccel!.stack.map((card) => card.instanceId)).toContain(optionId);
    expect(s.state.memory).toBe(1);
  });

  it("resolves the inherited Chaosmon end-of-opponent-turn security trash and DP reduction", async () => {
    let dpAtResolution: number | undefined;
    let readDP: (() => number) | undefined;
    const s = setupEngine(
      {
        0: {
          // BT20-037 is [Chaosmon: Valdur Arm], proving the printed “in its name”
          // matcher rather than requiring the exact card name Chaosmon.
          battleArea: [{ card: "BT20-037", as: "chaosmon", dp: 40000, under: ["BT20-099"] }],
          security: ["BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
        1: { security: ["BT1-010"], deck: ["BT1-010", "BT1-010"] },
      },
      {
        onEvent: (event) => {
          if (
            event.kind === "effectResolved" &&
            event.sourceCardId === "BT20-099" &&
            event.timing === "OnEndTurn" &&
            readDP !== undefined
          ) {
            dpAtResolution = readDP();
          }
        },
      },
    );
    readDP = () => s.perm("chaosmon").currentDP;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-010");
    expect(s.events).toContainEqual(
      expect.objectContaining({
        kind: "effectResolved",
        sourceCardId: "BT20-099",
        timing: "OnEndTurn",
        isInherited: true,
      }),
    );
    expect(dpAtResolution).toBe(10000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("public Security check gains memory and returns the Option to hand", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-010", as: "attacker" }] },
      1: { security: [{ card: "BT20-099", faceUp: true }] },
    });
    await s.ready();
    const before = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT20-099"));
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toContain("BT20-099");
    expect(s.state.memory).toBe(before - 1);
  });

  it("declines an available ACCEL play, then still places itself under an ally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-083", as: "ally" }],
          hand: [
            { card: "BT20-099", as: "option" },
            { card: "BT20-061", as: "nonAccel" },
            { card: "BT20-030", as: "availableAccel" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").stack.some((card) => card.cardId === "BT20-099"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-061", "BT20-030"]),
    );
    expect(s.perm("ally").stack.map((card) => card.cardId)).toContain("BT20-099");
  });
  it("requires its printed White color without a Chaosmon or ACCEL Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-010", as: "nonMatching" }], hand: [{ card: "BT20-099", as: "option" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toMatchObject({
      ok: false,
    });
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT20-099"]);
    expect(s.state.memory).toBe(10);
  });
});
