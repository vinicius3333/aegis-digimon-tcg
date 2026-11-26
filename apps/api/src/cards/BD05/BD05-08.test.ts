import { getCardDefinition, Phase } from "@aegis/shared";
import type { CardSpec } from "#api/engine/scenario/types";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { drainMicrotasks, settle, setupEngine, type PermanentSpec } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";

const cardId = "BD05-08";
const karatenmon = "BD05-07";
const kotemon = "BD05-05";
const onPlayTrasher = "P-017";
const vanillaPurpleLevel3 = "BT2-067";
const vanillaPurpleLevel4 = "BT3-083";
const vanillaRedLevel3 = "BT1-009";
const vanillaRedLevel4 = "BT1-014";
const vanillaRedLevel5 = "BT1-020";

type Setup = ReturnType<typeof setupEngine>;

type AttackParams = {
  opponent: PermanentSpec[];
  trash?: CardSpec[];
  others?: PermanentSpec[];
  deck?: CardSpec[];
  decline?: boolean;
  attacks?: number;
  preferred?: string[];
};

async function attackWithTactimon(params: AttackParams) {
  const preferInstanceIds: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: cardId, as: "tactimon", under: [vanillaPurpleLevel4] }, ...(params.others ?? [])],
        trash: params.trash ?? [],
        deck: params.deck ?? [],
      },
      1: { battleArea: params.opponent, security: [vanillaRedLevel3, vanillaRedLevel3, vanillaRedLevel3] },
    },
    params.decline
      ? { autoSelectCards: true, autoDeclineOptional: true, declineDigiXros: true, preferInstanceIds }
      : { autoSelectCards: true, autoAcceptOptional: true, declineDigiXros: true, preferInstanceIds },
  );
  for (const alias of params.preferred ?? []) {
    preferInstanceIds.push(s.inst(alias).instanceId);
  }
  await s.ready();
  for (let attack = 0; attack < (params.attacks ?? 1); attack++) {
    if (attack > 0) {
      await advance(s.engine).verb.unsuspend([s.perm("tactimon").permanentId]);
    }
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tactimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && !observe(s.engine).isAttacking(), 5000);
    await drainMicrotasks(40);
  }
  return s;
}

function boardIds(s: Setup, seat: 0 | 1) {
  return s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard!.cardId);
}

describe("BD05-08 Tactimon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD05",
      nameEn: "Tactimon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 4 }],
      types: ["Wizard"],
      effectText:
        "[When Digivolving] This Digimon unsuspends.\n[When Attacking][Once Per Turn] Delete 1 of your opponent's level 4 or lower Digimon. Then, if you have no other Digimon, you may play 1 level 3 purple Digimon card from your trash without paying the cost. Any [On Play] effects on Digimon this effect played don't activate.",
    });
    expect(getCardDefinition(cardId)!.inheritedEffectText).toBeUndefined();
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("unsuspends when it digivolves onto a suspended Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: karatenmon, as: "base", suspended: true }],
        hand: [{ card: cardId, as: "tactimon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tactimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === cardId && s.state.pendingDecision === undefined);
    await drainMicrotasks(40);

    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("deletes a level 4 or lower Digimon and plays a level 3 purple Digimon from the trash without its [On Play]", async () => {
    const s = await attackWithTactimon({
      opponent: [
        { card: vanillaRedLevel5, as: "levelFive" },
        { card: vanillaRedLevel4, as: "levelFour" },
      ],
      trash: [
        { card: vanillaRedLevel3, as: "redLevelThree" },
        { card: vanillaPurpleLevel4, as: "purpleLevelFour" },
        { card: onPlayTrasher, as: "onPlay" },
      ],
      deck: [vanillaRedLevel3, vanillaRedLevel3],
    });

    expect(boardIds(s, 1)).toEqual([vanillaRedLevel5]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("levelFour").instanceId);
    expect(boardIds(s, 0)).toEqual([cardId, onPlayTrasher]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(
      [vanillaRedLevel3, vanillaPurpleLevel4].sort(),
    );
    expect(s.state.memory).toBe(0);
  });

  it("can play a level 3 purple Digimon even when nothing is deleted", async () => {
    const s = await attackWithTactimon({
      opponent: [{ card: vanillaRedLevel5, as: "levelFive" }],
      trash: [{ card: kotemon, as: "kotemon" }],
    });

    expect(boardIds(s, 1)).toEqual([vanillaRedLevel5]);
    expect(boardIds(s, 0)).toEqual([cardId, kotemon]);
  });

  it("plays nothing while you have another Digimon", async () => {
    const s = await attackWithTactimon({
      opponent: [{ card: vanillaRedLevel4, as: "levelFour" }],
      others: [{ card: vanillaRedLevel5, as: "other" }],
      trash: [{ card: vanillaPurpleLevel3, as: "purpleLevelThree" }],
    });

    expect(boardIds(s, 1)).toEqual([]);
    expect(boardIds(s, 0)).toEqual([cardId, vanillaRedLevel5]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([vanillaPurpleLevel3]);
  });

  it("lets you decline the play from the trash", async () => {
    const s = await attackWithTactimon({
      opponent: [{ card: vanillaRedLevel4, as: "levelFour" }],
      trash: [{ card: vanillaPurpleLevel3, as: "purpleLevelThree" }],
      decline: true,
    });

    expect(boardIds(s, 1)).toEqual([]);
    expect(boardIds(s, 0)).toEqual([cardId]);
  });

  it("resolves only once per turn", async () => {
    const s = await attackWithTactimon({
      opponent: [
        { card: vanillaRedLevel3, as: "levelThree" },
        { card: vanillaRedLevel4, as: "levelFour" },
      ],
      others: [{ card: vanillaRedLevel5, as: "other" }],
      attacks: 2,
    });

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
