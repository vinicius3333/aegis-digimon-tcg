import { getCardDefinition, Phase, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { assertNoLoudGap, settle, setupEngine, type EngineSetup } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";
import { compiled } from "#api/cards/SD02/SD02-05";

const cardId = "SD02-05";
const sekkamon = "SD02-04";
const tenkomon = "SD02-03";
const renamon = "SD02-02";
const vanillaLevel6 = "ST2-10";
const vanillaLevel5 = "BT1-038";
const vanillaLevel3 = "BT1-028";

function isOnBoard(s: EngineSetup, seat: Seat, alias: string) {
  return s.state.players[seat]!.battleArea.some(
    (permanent) => permanent.topCard.instanceId === s.inst(alias).instanceId,
  );
}

async function attack(s: EngineSetup, seat: Seat, attacker: string, target: "player" | string) {
  expect(
    s.engine.applyIntent(seat, {
      type: "attack",
      attackerPermanentId: s.perm(attacker).permanentId,
      target: target === "player" ? { kind: "player" } : { kind: "permanent", permanentId: s.perm(target).permanentId },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.phase === Phase.Main && !observe(s.engine).isAttacking(), 5000);
}

describe("SD02-05 Yukinamon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "SD02",
      nameEn: "Yukinamon",
      nameJp: "ユキナモン",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 10000,
      evoCosts: [{ color: "Blue", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Ice-Snow", "ALYSION"],
      rarity: "SR",
      effectText:
        "[Your Turn] This Digimon may also attack your opponent's unsuspended Digimon with fewer digivolution cards than this Digimon.\n[Your Turn] Other than against Security Digimon, compare the number of digivolution cards instead of DP in this Digimon's battles.",
    });
    expect(getCardDefinition(cardId)!.inheritedEffectText).toBeUndefined();
  });

  it("compiles a Your Turn fewer-sources attack grant and a Your Turn Iceclad comparison", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "GrantCanAttackUnsuspended",
            target: { isSelf: true },
            duration: "permanent",
            defenderHasFewerDigivolutionCards: true,
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [{ kind: "GainKeyword", target: { isSelf: true }, keyword: { keyword: "IceClad" } }],
      },
    ]);
  });

  it("digivolves from Sekkamon for 3 memory into a 3-card stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: sekkamon, as: "base", under: [renamon, tenkomon] }],
        hand: [{ card: cardId, as: "yukinamon" }],
        deck: [vanillaLevel3],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("yukinamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([renamon, tenkomon, sekkamon]);
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "IceClad")).toBe(true);
    assertNoLoudGap(s);
  });

  it("may attack an unsuspended Digimon with fewer digivolution cards, but not one with as many", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "yukinamon", under: [tenkomon, sekkamon] }] },
        1: {
          battleArea: [
            { card: vanillaLevel5, as: "equal", under: [vanillaLevel3, vanillaLevel3] },
            { card: vanillaLevel5, as: "fewer", under: [vanillaLevel3] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const attackOk = (target: string) =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("yukinamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm(target).permanentId },
      }).ok;

    expect(attackOk("equal")).toBe(false);
    expect(attackOk("fewer")).toBe(true);
  });

  it("allows a source-less unsuspended defender as having fewer digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: cardId, as: "yukinamon", under: [tenkomon] }] },
      1: { battleArea: [{ card: vanillaLevel5, as: "none" }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("yukinamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("none").permanentId },
      }).ok,
    ).toBe(true);
  });

  it("wins a battle on your turn by digivolution card count against a higher-DP Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "yukinamon", under: [renamon, tenkomon, sekkamon] }] },
        1: { battleArea: [{ card: vanillaLevel6, as: "defender", under: [vanillaLevel3], suspended: true }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await attack(s, 0, "yukinamon", "defender");

    expect(isOnBoard(s, 1, "defender")).toBe(false);
    expect(isOnBoard(s, 0, "yukinamon")).toBe(true);
    assertNoLoudGap(s);
  });

  it("compares DP during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "yukinamon", under: [renamon, tenkomon, sekkamon], suspended: true }],
        },
        1: { battleArea: [{ card: vanillaLevel6, as: "attacker", under: [vanillaLevel3] }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("yukinamon"), "IceClad")).toBe(false);

    await attack(s, 1, "attacker", "yukinamon");

    expect(isOnBoard(s, 0, "yukinamon")).toBe(false);
    expect(isOnBoard(s, 1, "attacker")).toBe(true);
  });

  it("compares DP against a Security Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "yukinamon", under: [renamon, tenkomon, sekkamon] }] },
        1: { security: [vanillaLevel6] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await attack(s, 0, "yukinamon", "player");

    expect(isOnBoard(s, 0, "yukinamon")).toBe(false);
  });
});
