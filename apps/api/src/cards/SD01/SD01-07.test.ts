import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { assertNoLoudGap, drainMicrotasks, settle, setupEngine } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";
import { compiled } from "#api/cards/SD01/SD01-07";

const cardId = "SD01-07";
const redAlysion = "SD01-03";
const blueAlysion = "SD02-03";
const nonAlysion = "BT1-020";
const vanillaRedLevel3 = "BT1-009";
const ownDigimon = ["redAlysion", "blueAlysion", "nonAlysion"];

async function playCrimsonImpale(preferred: string) {
  const preferInstanceIds: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: redAlysion, as: "redAlysion" },
          { card: blueAlysion, as: "blueAlysion" },
          { card: nonAlysion, as: "nonAlysion" },
        ],
        hand: [{ card: cardId, as: "option" }],
        deck: [vanillaRedLevel3, vanillaRedLevel3],
      },
      1: { battleArea: [{ card: vanillaRedLevel3, as: "defender" }], security: [vanillaRedLevel3] },
    },
    { autoSelectCards: true, preferInstanceIds },
  );
  preferInstanceIds.push(s.perm(preferred).permanentId, s.perm(preferred).topCard.instanceId);
  s.state.memory = 3;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => ownDigimon.some((alias) => observe(s.engine).canAttackUnsuspended(s.perm(alias))));
  await drainMicrotasks(20);
  return s;
}

function attackDefender(s: Awaited<ReturnType<typeof playCrimsonImpale>>, attacker: string) {
  return s.engine.applyIntent(0, {
    type: "attack",
    attackerPermanentId: s.perm(attacker).permanentId,
    target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
  }).ok;
}

describe("SD01-07 Crimson Impale", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "SD01",
      nameEn: "Crimson Impale",
      colors: ["Red"],
      kinds: ["Option"],
      playCost: 1,
      rarity: "C",
      effectText:
        "[Main] 1 of your Digimon with the [ALYSION] trait can also attack your opponent's unsuspended Digimon for the turn.",
      securityEffectText: "[Security] Add this card to the hand.",
    });
  });

  it("compiles a for-the-turn unsuspended attack grant for 1 ALYSION Digimon and a security add to hand", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "Main",
        actions: [
          {
            kind: "GrantCanAttackUnsuspended",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }],
              },
              count: 1,
            },
            duration: "forTheTurn",
          },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "AddToHandSelf" }] },
    ]);
  });

  it("offers only your ALYSION Digimon, costs 1 memory and lets the chosen one attack an unsuspended Digimon", async () => {
    const s = await playCrimsonImpale("blueAlysion");

    const targeting = s.decisions.find(
      (decision) => decision.req.kind === "chooseTargets" || decision.req.kind === "selectCards",
    );
    const candidates = targeting?.req.options?.candidateInstanceIds ?? [];
    expect(
      ownDigimon.filter(
        (alias) =>
          candidates.includes(s.perm(alias).permanentId) || candidates.includes(s.perm(alias).topCard.instanceId),
      ),
    ).toEqual(["redAlysion", "blueAlysion"]);
    expect(ownDigimon.filter((alias) => observe(s.engine).canAttackUnsuspended(s.perm(alias)))).toEqual([
      "blueAlysion",
    ]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain(cardId);

    expect(attackDefender(s, "redAlysion")).toBe(false);
    expect(attackDefender(s, "nonAlysion")).toBe(false);
    expect(attackDefender(s, "blueAlysion")).toBe(true);
    assertNoLoudGap(s);
  });

  it("keeps the grant only for the turn", async () => {
    const s = await playCrimsonImpale("redAlysion");
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("redAlysion"))).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;

    expect(observe(s.engine).canAttackUnsuspended(s.perm("redAlysion"))).toBe(false);
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: cardId, as: "option", faceUp: true }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("option").instanceId]);
  });
});
