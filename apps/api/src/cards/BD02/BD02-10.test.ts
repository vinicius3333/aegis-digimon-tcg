import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { drainMicrotasks, settle, setupEngine, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "BD02-10";
const whiteDiaboromon = "BT2-082";
const whiteMillenniummon = "BT2-083";
const blackDiaboromonXAntibody = "BT24-065";
const vanillaRedLevel3 = "BT1-009";
const source = "BT1-028";

type Setup = ReturnType<typeof setupEngine>;

type UseParams = {
  battleArea: PermanentSpec[];
  breeding?: PermanentSpec;
  decline?: boolean;
};

async function useFromHand({ battleArea, breeding, decline = false }: UseParams) {
  const s = setupEngine(
    {
      0: { battleArea, ...(breeding === undefined ? {} : { breeding }), hand: [{ card: cardId, as: "option" }] },
    },
    decline
      ? { autoSelectCards: true, autoDeclineOptional: true }
      : { autoSelectCards: true, autoAcceptOptional: true },
  );
  s.state.memory = 10;
  await s.ready();
  const result = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId });
  return { s, result };
}

async function resolveUse(params: UseParams) {
  const { s, result } = await useFromHand(params);
  expect(result).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === cardId));
  await settle(() => s.state.pendingDecision === undefined);
  await drainMicrotasks(40);
  return s;
}

const isToken = (s: Setup, index: number) =>
  getCardDefinition(s.state.players[0]!.battleArea[index]!.topCard!.cardId)?.isToken;

function tokenCount(s: Setup) {
  return s.state.players[0]!.battleArea.filter((_, index) => isToken(s, index) === true).length;
}

function tokensWithBlocker(s: Setup) {
  return s.state.players[0]!.battleArea.filter(
    (permanent, index) => isToken(s, index) === true && observe(s.engine).hasKeyword(permanent, "Blocker"),
  ).length;
}

describe("BD02-10 Spreading Despair", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD02",
      nameEn: "Spreading Despair",
      colors: ["Black"],
      kinds: ["Option"],
      playCost: 8,
      rarity: "R",
      effectText:
        "While you have a white Digimon, you can ignore this card's color requirements.\nWhen this card would be used, if you have any [Diaboromon] with digivolution cards, reduce the use cost by 2.\n[Main] You may play 2 [Diaboromon] Tokens without paying the cost. (Digimon/Cost 14/Lv.6/White/Mega/Unknown/Unidentified/3000 DP) Then, all of your [Diaboromon] gain ＜Blocker＞ until your opponent's turn ends. (This Digimon can block in the blocker timing.)",
      securityEffectText:
        "[Security] You may play 1 [Diaboromon] Token without paying the cost. (Digimon/Cost 14/Lv.6/White/Mega/Unknown/Unidentified/3000 DP) Then, all of your [Diaboromon] gain ＜Blocker＞ until your opponent's turn ends. (This Digimon can block in the blocker timing.)",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("can be used without a black Digimon while you have a white Digimon in the battle area", async () => {
    const s = await resolveUse({ battleArea: [{ card: whiteMillenniummon, as: "white" }] });

    expect(s.state.memory).toBe(2);
  });

  it("cannot be used without black or white Digimon, and a white Digimon in the breeding area does not count", async () => {
    const withoutWhite = await useFromHand({ battleArea: [{ card: vanillaRedLevel3 }] });
    expect(withoutWhite.result).toEqual({ ok: false, reason: "color-requirement-unmet" });

    const breedingWhite = await useFromHand({
      battleArea: [{ card: vanillaRedLevel3 }],
      breeding: { card: whiteMillenniummon, as: "breedingWhite" },
    });
    expect(breedingWhite.result).toEqual({ ok: false, reason: "color-requirement-unmet" });
    expect(breedingWhite.s.state.memory).toBe(10);
  });

  it("costs 2 less while you have a [Diaboromon] with digivolution cards", async () => {
    const s = await resolveUse({ battleArea: [{ card: whiteDiaboromon, as: "diaboromon", under: [source] }] });

    expect(s.state.memory).toBe(4);
  });

  it("keeps its full cost for a [Diaboromon] without digivolution cards or a differently named Diaboromon", async () => {
    const withoutSources = await resolveUse({ battleArea: [{ card: whiteDiaboromon, as: "diaboromon" }] });
    expect(withoutSources.state.memory).toBe(2);

    const xAntibody = await resolveUse({
      battleArea: [{ card: blackDiaboromonXAntibody, as: "xAntibody", under: [source] }],
    });
    expect(xAntibody.state.memory).toBe(2);
  });

  it("plays 2 Diaboromon Tokens and gives Blocker only to your [Diaboromon]", async () => {
    const s = await resolveUse({
      battleArea: [
        { card: whiteDiaboromon, as: "diaboromon" },
        { card: whiteMillenniummon, as: "millenniummon" },
      ],
    });

    expect(tokenCount(s)).toBe(2);
    expect(tokensWithBlocker(s)).toBe(2);
    expect(observe(s.engine).hasKeyword(s.perm("diaboromon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("millenniummon"), "Blocker")).toBe(false);
  });

  it("still gives existing [Diaboromon] Blocker when you decline to play the Tokens", async () => {
    const s = await resolveUse({ battleArea: [{ card: whiteDiaboromon, as: "diaboromon" }], decline: true });

    expect(tokenCount(s)).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("diaboromon"), "Blocker")).toBe(true);
  });

  it("plays 1 Diaboromon Token from security and gives your [Diaboromon] Blocker", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: whiteDiaboromon, as: "diaboromon" }], security: [{ card: cardId, as: "option" }] },
        1: { battleArea: [{ card: vanillaRedLevel3, as: "attacker" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
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
    await settle(() => tokenCount(s) === 1 && observe(s.engine).hasKeyword(s.perm("diaboromon"), "Blocker"), 5000);
    await drainMicrotasks(40);

    expect(tokenCount(s)).toBe(1);
    expect(tokensWithBlocker(s)).toBe(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
