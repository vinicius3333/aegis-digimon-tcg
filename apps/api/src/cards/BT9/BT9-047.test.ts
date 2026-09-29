import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-089.js";
import "../BT15/BT15-027.js";
import "../BT2/BT2-108.js";
import "../BT20/BT20-013.js";
import "../BT22/BT22-007.js";
import "../EX12/EX12-013.js";
import "../EX12/EX12-027.js";
import "../EX12/EX12-038.js";
import "../EX12/EX12-039.js";
import "../EX12/EX12-041.js";
import "../EX12/EX12-043.js";
import "../EX12/EX12-045.js";
import "../EX12/EX12-050.js";
import "../EX12/EX12-051.js";
import "../BT26/BT26-009.js";
import "../BT26/BT26-012.js";
import "../BT26/BT26-014.js";
import "../BT26/BT26-096.js";
import "../BT5/BT5-085.js";
import "../ST10/ST10-09.js";
import "../ST13/ST13-02.js";
import "../ST13/ST13-05.js";
import "../ST13/ST13-09.js";
import "../ST13/ST13-14.js";
import "./BT9-030.js";
import { compiled } from "./BT9-047.js";

describe("BT9-047 Pomumon", () => {
  it("matches catalog and all-turn universal effect-play restriction IR", () => {
    expect(getCardDefinition("BT9-047")).toMatchObject({
      cardId: "BT9-047",
      nameEn: "Pomumon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Vegetation"],
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "AllTurns",
          actions: [
            {
              kind: "RestrictPlay",
              seat: "any",
              filter: { kind: ["Digimon"] },
              mode: "play",
              byEffectOnly: true,
              duration: "permanent",
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("prevents Digimon from being played by effects", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-030", as: "source", under: [{ card: "BT9-026", as: "material" }] }] },
        1: { battleArea: [{ card: "BT9-047", as: "pomumon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});

const eligibleLegendArms = "ST13-13";

function battleCardIds(s: EngineSetup, seat: 0 | 1): string[] {
  return s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard.cardId);
}

function opponentBoard(withPomumon: boolean): string[] {
  return withPomumon ? ["BT9-047"] : ["BT1-009"];
}

async function revealOnPlay(revealer: "ST13-02" | "ST13-09", withPomumon: boolean) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "ST13-05", as: "host" }],
        hand: [{ card: revealer, as: "revealer" }],
        deck: [eligibleLegendArms],
      },
      1: { battleArea: opponentBoard(withPomumon) },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 10;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("revealer").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.deck.length === 0 && s.state.pendingDecision === undefined);
  return {
    placedUnderHost: s.perm("host").stack.some((card) => card.cardId === revealer),
    played: battleCardIds(s, 0).includes(eligibleLegendArms),
    inHand: s.state.players[0]!.hand.some((card) => card.cardId === eligibleLegendArms),
  };
}

async function activateMainEffect(s: EngineSetup, alias: string): Promise<void> {
  await s.ready();
  const [mainEffect] = observe(s.engine).activatableEffects(s.perm(alias));
  expect(mainEffect).toBeDefined();
  expect(
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm(alias).topCard.instanceId,
      effectKey: mainEffect!.effectKey,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision === undefined);
}

async function playFromHandByMainEffect(
  sourceCardId: string,
  targetCardId: string,
  withPomumon: boolean,
): Promise<{ played: boolean; stillInHand: boolean }> {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: sourceCardId, as: "source" }], hand: [{ card: targetCardId, as: "target" }] },
      1: { battleArea: opponentBoard(withPomumon) },
    },
    { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 0 },
  );
  s.state.memory = 5;
  await activateMainEffect(s, "source");
  return {
    played: battleCardIds(s, 0).includes(targetCardId),
    stillInHand: s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("target").instanceId),
  };
}

async function reducedPlayByMainEffect(sourceCardId: string, targetCardId: string, withPomumon: boolean) {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: sourceCardId, as: "source" }], hand: [{ card: targetCardId, as: "target" }] },
      1: { battleArea: opponentBoard(withPomumon) },
    },
    { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 0 },
  );
  s.state.memory = 5;
  const sourceInstanceId = s.perm("source").topCard.instanceId;
  await activateMainEffect(s, "source");
  const player = s.state.players[0]!;
  const sourceInPlay = player.battleArea.find((permanent) => permanent.topCard.instanceId === sourceInstanceId);
  return {
    played: battleCardIds(s, 0).includes(targetCardId),
    stillInHand: player.hand.some((card) => card.instanceId === s.inst("target").instanceId),
    memory: s.state.memory,
    mainEffectOfferedAgain: sourceInPlay !== undefined && observe(s.engine).activatableEffects(sourceInPlay).length > 0,
    sourceAtDeckBottom: player.deck.at(-1)?.instanceId === sourceInstanceId,
  };
}

describe("BT9-047 Pomumon — KB Q&A rulings", () => {
  it("adds a Legend-Arms card revealed by Zubamon's [On Play] to hand because Pomumon forbids playing it (Q768)", async () => {
    expect(await revealOnPlay("ST13-02", true)).toEqual({ placedUnderHost: true, played: false, inHand: true });
    expect(await revealOnPlay("ST13-02", false)).toEqual({ placedUnderHost: true, played: true, inHand: false });
  });

  it("returns a Legend-Arms card revealed by Durandamon's [When Attacking] to the deck bottom because Pomumon forbids playing it (Q774)", async () => {
    async function attackAndReveal(withPomumon: boolean) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "ST13-05", as: "durandamon" }],
            deck: [eligibleLegendArms, "BT1-009", "BT1-010"],
          },
          1: { battleArea: opponentBoard(withPomumon), security: ["BT1-011"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
      );
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("durandamon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined);
      return {
        played: battleCardIds(s, 0).includes(eligibleLegendArms),
        deck: s.state.players[0]!.deck.map((card) => card.cardId).sort(),
      };
    }

    expect(await attackAndReveal(false)).toEqual({ played: true, deck: ["BT1-009", "BT1-010"] });
    expect(await attackAndReveal(true)).toEqual({
      played: false,
      deck: ["BT1-009", "BT1-010", eligibleLegendArms],
    });
  });

  it("adds a Legend-Arms card revealed by Ludomon's [On Play] to hand because Pomumon forbids playing it (Q785)", async () => {
    expect(await revealOnPlay("ST13-09", true)).toEqual({ placedUnderHost: true, played: false, inHand: true });
    expect(await revealOnPlay("ST13-09", false)).toEqual({ placedUnderHost: true, played: true, inHand: false });
  });

  // The ruling text says [When Attacking]; BryweLudramon's reveal-and-play effect is [When Digivolving].
  it("returns a Legend-Arms card revealed by BryweLudramon's reveal effect to the deck bottom because Pomumon forbids playing it (Q791)", async () => {
    async function digivolveAndReveal(withPomumon: boolean) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "ST13-13", as: "base" }],
            hand: [{ card: "ST13-14", as: "brywe" }],
            deck: ["BT1-009", eligibleLegendArms, "BT1-010", "BT1-011"],
          },
          1: { battleArea: opponentBoard(withPomumon) },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
      );
      s.state.memory = 4;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("brywe").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.decisions.some(({ req }) => req.kind === "orderCards") && s.state.pendingDecision === undefined,
      );
      return {
        played: battleCardIds(s, 0).length === 2,
        deck: s.state.players[0]!.deck.map((card) => card.cardId).sort(),
      };
    }

    expect(await digivolveAndReveal(false)).toEqual({ played: true, deck: ["BT1-010", "BT1-011"] });
    expect(await digivolveAndReveal(true)).toEqual({
      played: false,
      deck: ["BT1-010", "BT1-011", eligibleLegendArms],
    });
  });

  it("still lets Mimi Tachikawa move a Digimon from breeding to the battle area because moving is not playing (Q1844)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-089", as: "mimi" }, "BT1-078"],
          breeding: { card: "BT1-064", as: "raised" },
          security: [{ card: "ST10-09", as: "witchmon", faceUp: true }],
        },
        1: { battleArea: [{ card: "BT9-047", as: "pomumon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    await s.ready();
    const mainEffects = JSON.parse(s.perm("mimi").activatableEffectsJson || "[]") as { effectKey: string }[];
    expect(mainEffects).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("mimi").topCard.instanceId,
        effectKey: mainEffects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding === undefined && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("raised").permanentId)).toBe(true);
    expect(s.perm("mimi").isSuspended).toBe(true);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("witchmon"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("witchmon").instanceId)).toBe(
      false,
    );
  });

  it("still applies an effect that only reduces a play cost, such as Armageddemon's Diaboromon deletion, but not one that reduces and plays (Q1845)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "TOKEN-Diaboromon", as: "diaboromon" }],
          hand: [{ card: "BT5-085", as: "armageddemon" }],
        },
        1: { battleArea: [{ card: "BT9-047", as: "pomumon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const diaboromonId = s.perm("diaboromon").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("armageddemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => battleCardIds(s, 0).includes("BT5-085") && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === diaboromonId)).toBe(false);
    expect(s.perm("pomumon").topCard.cardId).toBe("BT9-047");

    const reduceAndPlay = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-013", as: "baohuckmon" }], hand: [{ card: "BT20-084", as: "sistermon" }] },
        1: { battleArea: ["BT9-047"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    reduceAndPlay.state.memory = 5;
    await reduceAndPlay.ready();
    const [mainEffect] = observe(reduceAndPlay.engine).activatableEffects(reduceAndPlay.perm("baohuckmon")) as {
      effectKey: string;
    }[];
    expect(
      reduceAndPlay.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: reduceAndPlay.perm("baohuckmon").topCard.instanceId,
        effectKey: mainEffect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => reduceAndPlay.state.pendingDecision === undefined);
    expect(battleCardIds(reduceAndPlay, 0)).toEqual(["BT20-013"]);
    expect(reduceAndPlay.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      reduceAndPlay.inst("sistermon").instanceId,
    ]);
    expect(reduceAndPlay.state.memory).toBe(5);
  });

  it("prevents an Option card effect such as Night Raid from playing a Digimon (Q1846)", async () => {
    async function useNightRaid(withPomumon: boolean) {
      const s = setupEngine(
        {
          0: {
            battleArea: ["BT2-067"],
            hand: [{ card: "BT2-108", as: "nightRaid" }],
            trash: [{ card: "BT2-067", as: "revivable" }],
          },
          1: { battleArea: opponentBoard(withPomumon) },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 4;
      await s.ready();
      const nightRaidId = s.inst("nightRaid").instanceId;
      const revivableId = s.inst("revivable").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: nightRaidId })).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.trash.some((card) => card.instanceId === nightRaidId) &&
          s.state.pendingDecision === undefined,
      );
      return {
        optionUsed: s.state.memory === 2,
        revived: s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === revivableId),
      };
    }

    expect(await useNightRaid(true)).toEqual({ optionUsed: true, revived: false });
    expect(await useNightRaid(false)).toEqual({ optionUsed: true, revived: true });
  });

  it("lets BaoHuckmon activate its [Main] effect but not play a Sistermon card with it (Q4296)", async () => {
    expect(await playFromHandByMainEffect("BT20-013", "BT20-084", true)).toEqual({
      played: false,
      stillInHand: true,
    });
    expect(await playFromHandByMainEffect("BT20-013", "BT20-084", false)).toEqual({
      played: true,
      stillInHand: false,
    });
  });

  it("stops the opponent's Mother Eater from playing Mother Eaters from its digivolution cards (Q4861)", async () => {
    async function startMainPhase(withPomumon: boolean) {
      const s = setupEngine(
        {
          0: {
            breeding: {
              card: "BT22-007",
              as: "mother",
              under: [
                "BT22-007",
                "BT22-007",
                "BT22-007",
                "BT1-001",
                "BT1-002",
                "BT1-003",
                "BT1-004",
                "BT1-005",
                "BT1-006",
                "BT1-007",
              ],
            },
          },
          1: { battleArea: opponentBoard(withPomumon) },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      await s.engine.recomputeContinuousEffects();
      await advance(s.engine).fireGlobal(EffectTiming.OnStartMainPhase);
      await settle(() => s.state.pendingDecision === undefined);
      return battleCardIds(s, 0).filter((cardId) => cardId === "BT22-007").length;
    }

    expect(await startMainPhase(true)).toBe(0);
    expect(await startMainPhase(false)).toBe(3);
  });

  it("stops Scorpiomon's effect from playing a Digimon into the breeding area (Q5206)", async () => {
    async function endTurnWithScorpiomon(withPomumon: boolean) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT1-009", as: "sacrifice" },
              { card: "BT15-027", as: "scorpiomon" },
            ],
            hand: [{ card: "BT15-031", as: "darkMaster" }],
            deck: ["BT1-009"],
          },
          1: { battleArea: opponentBoard(withPomumon), security: ["BT1-009"], deck: ["BT1-010"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnCount = 1;
      s.state.turnSeat = 0;
      await advance(s.engine).runTurn(0);
      await settle(() => s.state.pendingDecision === undefined);
      return {
        breedingCardId: s.state.players[0]!.breeding?.topCard.cardId,
        stillInHand: s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("darkMaster").instanceId),
      };
    }

    expect(await endTurnWithScorpiomon(true)).toEqual({ breedingCardId: undefined, stillInHand: true });
    expect(await endTurnWithScorpiomon(false)).toEqual({ breedingCardId: "BT15-031", stillInHand: false });
  });

  it("lets BetelGammamon activate its [Main] effect but not play the specified card (Q6733)", async () => {
    expect(await playFromHandByMainEffect("EX12-013", "EX12-007", true)).toEqual({
      played: false,
      stillInHand: true,
    });
    expect(await playFromHandByMainEffect("EX12-013", "EX12-007", false)).toEqual({
      played: true,
      stillInHand: false,
    });
  });

  it("lets TeslaJellymon activate its [Main] effect but not play the specified card (Q6757)", async () => {
    expect(await playFromHandByMainEffect("EX12-027", "EX12-023", true)).toEqual({
      played: false,
      stillInHand: true,
    });
    expect(await playFromHandByMainEffect("EX12-027", "EX12-023", false)).toEqual({
      played: true,
      stillInHand: false,
    });
  });

  it("lets Thundermon activate its [Main] effect but not play the [ME] Digimon with the reduced cost (Q6803)", async () => {
    expect(await reducedPlayByMainEffect("EX12-041", "EX12-038", true)).toMatchObject({
      played: false,
      stillInHand: true,
      memory: 5,
      mainEffectOfferedAgain: false,
    });
    expect(await reducedPlayByMainEffect("EX12-041", "EX12-038", false)).toMatchObject({
      played: true,
      stillInHand: false,
      memory: 4,
      mainEffectOfferedAgain: false,
    });
  });

  it("lets Hakubamon activate its [Main] effect but not play the [SW] Digimon with the reduced cost (Q6807)", async () => {
    expect(await reducedPlayByMainEffect("EX12-043", "EX12-039", true)).toMatchObject({
      played: false,
      stillInHand: true,
      memory: 5,
      mainEffectOfferedAgain: false,
    });
    expect(await reducedPlayByMainEffect("EX12-043", "EX12-039", false)).toMatchObject({
      played: true,
      stillInHand: false,
      memory: 4,
      mainEffectOfferedAgain: false,
    });
  });

  it("lets Sanzomon's [Your Turn] effect trigger on a security removal but not play the [SW] Digimon (Q6812)", async () => {
    async function playSanzomonAndTakeSecurity(withPomumon: boolean) {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "EX12-045", as: "sanzomon" },
              { card: "EX12-039", as: "takinmon" },
            ],
            security: [{ card: "BT1-009", as: "topSecurity" }, "BT1-010", "BT1-011"],
          },
          1: { battleArea: opponentBoard(withPomumon) },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sanzomon").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("topSecurity").instanceId) &&
          s.state.pendingDecision === undefined,
      );
      await settle(() => s.state.pendingDecision === undefined);
      return {
        securityCount: s.state.players[0]!.security.length,
        takinmonPlayed: battleCardIds(s, 0).includes("EX12-039"),
        takinmonInHand: s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("takinmon").instanceId),
        memory: s.state.memory,
      };
    }

    expect(await playSanzomonAndTakeSecurity(true)).toEqual({
      securityCount: 2,
      takinmonPlayed: false,
      takinmonInHand: true,
      memory: 3,
    });
    expect(await playSanzomonAndTakeSecurity(false)).toEqual({
      securityCount: 2,
      takinmonPlayed: true,
      takinmonInHand: false,
      memory: 2,
    });
  });

  it("lets SymbareAngoramon activate its [Main] effect but not play the [NSp] Digimon with the reduced cost (Q6828)", async () => {
    expect(await reducedPlayByMainEffect("EX12-050", "EX12-051", true)).toMatchObject({
      played: false,
      stillInHand: true,
      memory: 5,
      mainEffectOfferedAgain: false,
    });
    expect(await reducedPlayByMainEffect("EX12-050", "EX12-051", false)).toMatchObject({
      played: true,
      stillInHand: false,
      memory: 0,
      mainEffectOfferedAgain: false,
    });
  });

  it("lets Manekimon activate its [Main] effect but not play the [TB] Digimon with the reduced cost (Q6968)", async () => {
    expect(await reducedPlayByMainEffect("BT26-012", "BT26-014", true)).toMatchObject({
      played: false,
      stillInHand: true,
      memory: 5,
      mainEffectOfferedAgain: false,
    });
    expect(await reducedPlayByMainEffect("BT26-012", "BT26-014", false)).toMatchObject({
      played: true,
      stillInHand: false,
      memory: 0,
      mainEffectOfferedAgain: false,
    });
  });

  // Q7168 names no card; its question and date match BT26-096 Kosuke Misono's "By returning" [Main] play.
  it("lets Kosuke Misono activate its [Main] effect by returning itself but not play the Chronomon-text Digimon (Q7168)", async () => {
    expect(await reducedPlayByMainEffect("BT26-096", "BT26-009", false)).toEqual({
      played: true,
      stillInHand: false,
      memory: 4,
      mainEffectOfferedAgain: false,
      sourceAtDeckBottom: true,
    });
    expect(await reducedPlayByMainEffect("BT26-096", "BT26-009", true)).toEqual({
      played: false,
      stillInHand: true,
      memory: 5,
      mainEffectOfferedAgain: false,
      sourceAtDeckBottom: true,
    });
  });
});
