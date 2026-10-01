import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-084.js";
import "./index.js";
import "../BT2/BT2-074.js";

const TAMER = "BT17-084";
const FREE_DIGIMON = "BT8-038";
const NON_FREE_DIGIMON = "BT1-032";
const OPPONENT_DIGIMON = "BT1-009";

describe("BT17-084 Davis Motomiya & Ken Ichijoji", () => {
  it("matches the immutable catalog identity and all four printed clauses", () => {
    expect(getCardDefinition(TAMER)).toMatchObject({
      nameEn: "Davis Motomiya & Ken Ichijoji",
      colors: ["Blue", "Green"],
      kinds: ["Tamer"],
      playCost: 5,
      effectText: expect.stringContaining("would be deleted in battle"),
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
  });

  it("traces the Start, battle-deletion replacement, End, and Security IR", () => {
    expect(compiled.effects?.map((effect) => effect.trigger)).toEqual([
      "StartOfYourTurn",
      "AllTurns",
      "EndOfYourTurn",
      "Security",
    ]);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          mode: "instead",
          leaveCause: "byBattle",
          sourceFilter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "gte", value: 5 } },
          actions: [
            {
              kind: "CostGatedBlock",
              cost: { kind: "suspend", target: { filter: { isSelfRef: true }, isSelf: true } },
              actions: [
                {
                  kind: "PlayWithoutCost",
                  from: ["digivolutionCards"],
                  target: { filter: { zone: "digivolutionCards", hostFilter: { sourceRef: "triggerSubject" } } },
                },
              ],
            },
          ],
        },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [{ kind: "Attack", attacker: { filter: { nameOrTrait: [{ tokens: ["Free"], match: "trait" }] } } }],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("naturally suspends itself and plays a card from the battled Digimon's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAMER, as: "tamer" },
            { card: "BT1-009", as: "unrelated", under: ["BT4-056"] },
            { card: "BT1-083", as: "attacker", dp: 1000, under: [{ card: "BT4-054", as: "recovered" }] },
          ],
        },
        1: { battleArea: [{ card: "BT5-086", as: "opponent", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const recoveredId = s.inst("recovered").instanceId;

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === recoveredId),
    );

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === recoveredId)).toBe(
      true,
    );
    expect(s.perm("unrelated").stack.some((card) => card.cardId === "BT4-056")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-083")).toBe(true);
    assertNoLoudGap(s);
  });

  it("can pay the battle-deletion replacement cost even with no eligible stack card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAMER, as: "tamer" },
            { card: "BT1-083", as: "attacker", dp: 1000 },
          ],
        },
        1: { battleArea: [{ card: "BT5-086", as: "opponent", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-083"));

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-083")).toBe(false);
    assertNoLoudGap(s);
  });

  it("naturally attacks an opponent's Digimon at end of turn with an unsuspended Free Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAMER, as: "tamer" },
            { card: FREE_DIGIMON, as: "free" },
          ],
        },
        1: { battleArea: [{ card: OPPONENT_DIGIMON, as: "opponent", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await s.ready();
    await advance(s.engine).runTurn(0);
    await settle(() => s.perm("free").isSuspended);

    expect(s.perm("free").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === OPPONENT_DIGIMON)).toBe(
      false,
    );
    assertNoLoudGap(s);
  });

  it("sets memory to 3 at the start of your turn only from 2 or less", async () => {
    const low = setupEngine(
      {
        0: { battleArea: [{ card: TAMER, as: "tamer" }], hand: ["BT1-009"], deck: ["BT1-010"] },
        1: { hand: ["BT1-009"], deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    low.state.memory = 2;
    await low.ready();
    await advance(low.engine).runTurn(0);
    expect(low.events).toContainEqual(expect.objectContaining({ kind: "memoryChanged", from: 2, to: 3 }));
    assertNoLoudGap(low);

    const high = setupEngine(
      {
        0: { battleArea: [{ card: TAMER, as: "tamer" }], hand: ["BT1-009"], deck: ["BT1-010"] },
        1: { hand: ["BT1-009"], deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    high.state.memory = 4;
    await high.ready();
    await advance(high.engine).runTurn(0);
    expect(high.events).not.toContainEqual(expect.objectContaining({ kind: "memoryChanged", from: 4, to: 3 }));
    assertNoLoudGap(high);
  });

  it("does not attack with a suspended or non-Free Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAMER, as: "tamer" },
            { card: FREE_DIGIMON, as: "suspendedFree", suspended: true },
            { card: NON_FREE_DIGIMON, as: "nonFree" },
          ],
        },
        1: { battleArea: [{ card: OPPONENT_DIGIMON, as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("suspendedFree").permanentId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.perm("suspendedFree").isSuspended).toBe(true);
    expect(s.perm("nonFree").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === OPPONENT_DIGIMON)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("naturally plays itself from security without paying its cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-086", as: "attacker" }] },
        1: { security: [{ card: TAMER, as: "securityTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const instanceId = s.inst("securityTamer").instanceId;

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId),
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
    expect(s.state.players[1]!.security.some((card) => card.instanceId === instanceId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("does not fire the played card's inherited Retaliation against the battled opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAMER, as: "tamer" },
            { card: "BT1-083", as: "attacker", dp: 1000, under: [{ card: "BT2-074", as: "devimon" }] },
          ],
        },
        1: { battleArea: [{ card: "BT5-086", as: "opponent", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const devimonId = s.inst("devimon").instanceId;
    const opponentId = s.inst("opponent").instanceId;

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === devimonId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === devimonId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-083")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === opponentId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("performs only one attack when two copies trigger with two Free Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAMER, as: "tamer1" },
            { card: TAMER, as: "tamer2" },
            { card: FREE_DIGIMON, as: "free1" },
            { card: "BT10-081", as: "free2" },
          ],
        },
        1: {
          battleArea: [
            { card: OPPONENT_DIGIMON, as: "opp1", suspended: true },
            { card: OPPONENT_DIGIMON, as: "opp2", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await s.ready();
    await advance(s.engine).runTurn(0);
    await settle(() => [s.perm("free1"), s.perm("free2")].some((permanent) => permanent.isSuspended));

    const suspendedFree = [s.perm("free1"), s.perm("free2")].filter((permanent) => permanent.isSuspended).length;
    expect(suspendedFree).toBe(1);
    expect(s.state.players[1]!.battleArea.length).toBe(1);
    assertNoLoudGap(s);
  });
});

function attackOpponentDigimon(s: ReturnType<typeof setupEngine>, attackerAlias: string, targetAlias: string): void {
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm(attackerAlias).permanentId,
      target: { kind: "permanent", permanentId: s.perm(targetAlias).permanentId },
    }),
  ).toEqual({ ok: true });
}

function attackDeclarations(s: ReturnType<typeof setupEngine>) {
  return s.events.filter((event) => event.kind === "attackDeclared");
}

async function runTurnWithSuspendedFreeDigimon(freeIsSuspended: boolean) {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: TAMER, as: "tamer" },
          { card: FREE_DIGIMON, as: "free" },
        ],
      },
      1: { battleArea: [{ card: OPPONENT_DIGIMON, as: "opponent", suspended: true }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
  );
  await s.ready();
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  if (freeIsSuspended) await advance(s.engine).verb.suspend([s.perm("free").permanentId]);
  advance(s.engine).endMainPhaseIfOpen(0);
  await turn;
  return s;
}

describe("BT17-084 Davis Motomiya & Ken Ichijoji — KB Q&A rulings", () => {
  it("can suspend this Tamer for a battle-deleted level 5+ Free Digimon with no level 4 or lower stack card (Q2863)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAMER, as: "tamer" },
            { card: "BT1-083", as: "attacker", dp: 1000, under: [{ card: "BT10-081", as: "levelFiveSource" }] },
          ],
        },
        1: { battleArea: [{ card: "BT5-086", as: "opponent", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const levelFiveSourceId = s.inst("levelFiveSource").instanceId;

    attackOpponentDigimon(s, "attacker", "opponent");
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-083"));

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([TAMER]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === levelFiveSourceId)).toBe(true);
    assertNoLoudGap(s);

    const levelFourControl = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAMER, as: "tamer" },
            { card: "BT3-050", as: "attacker", dp: 1000 },
          ],
        },
        1: { battleArea: [{ card: "BT5-086", as: "opponent", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await levelFourControl.ready();
    attackOpponentDigimon(levelFourControl, "attacker", "opponent");
    await settle(() => levelFourControl.state.players[0]!.trash.some((card) => card.cardId === "BT3-050"));

    expect(levelFourControl.perm("tamer").isSuspended).toBe(false);
  });

  it("plays a Retaliation card from the stack before Retaliation can activate, so the opponent survives (Q2864)", async () => {
    const boardWith = (withTamer: boolean) =>
      setupEngine(
        {
          0: {
            battleArea: [
              ...(withTamer ? [{ card: TAMER, as: "tamer" }] : []),
              { card: "BT1-083", as: "attacker", dp: 1000, under: [{ card: "BT2-074", as: "devimon" }] },
            ],
          },
          1: { battleArea: [{ card: "BT5-086", as: "opponent", suspended: true }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );

    const s = boardWith(true);
    await s.ready();
    const devimonId = s.inst("devimon").instanceId;
    const opponentId = s.inst("opponent").instanceId;
    attackOpponentDigimon(s, "attacker", "opponent");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === devimonId));
    await settle();

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === devimonId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-083"]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([opponentId]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    assertNoLoudGap(s);

    const withoutTamer = boardWith(false);
    await withoutTamer.ready();
    attackOpponentDigimon(withoutTamer, "attacker", "opponent");
    await settle(() => withoutTamer.state.players[1]!.trash.some((card) => card.cardId === "BT5-086"));

    expect(withoutTamer.state.players[1]!.battleArea).toHaveLength(0);
    expect(withoutTamer.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-083", "BT2-074"]);
  });

  it("cannot make a suspended Free Digimon attack with the [End of Your Turn] effect (Q2865)", async () => {
    const s = await runTurnWithSuspendedFreeDigimon(true);

    expect(attackDeclarations(s)).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([OPPONENT_DIGIMON]);
    assertNoLoudGap(s);

    const unsuspendedControl = await runTurnWithSuspendedFreeDigimon(false);
    expect(attackDeclarations(unsuspendedControl)).toEqual([
      expect.objectContaining({ attackerPermanentId: unsuspendedControl.perm("free").permanentId }),
    ]);
  });

  it("triggers on both copies but performs only the first Free Digimon's attack (Q2866)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAMER, as: "tamer1" },
            { card: TAMER, as: "tamer2" },
            { card: FREE_DIGIMON, as: "free1" },
            { card: "BT10-081", as: "free2" },
          ],
        },
        1: {
          battleArea: [
            { card: OPPONENT_DIGIMON, as: "opp1", suspended: true },
            { card: OPPONENT_DIGIMON, as: "opp2", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();

    await advance(s.engine).runTurn(0);
    await settle();

    const endOfTurnTriggers = s.events.filter(
      (event) =>
        event.kind === "effectTriggered" && event.sourceCardId === TAMER && event.printedTiming === "EndOfYourTurn",
    );
    const triggeringTamers = endOfTurnTriggers.map(
      (event) => event.kind === "effectTriggered" && event.sourceInstanceId,
    );
    expect(new Set(triggeringTamers)).toEqual(new Set([s.inst("tamer1").instanceId, s.inst("tamer2").instanceId]));
    const secondTriggerIndex = s.events.indexOf(endOfTurnTriggers[1]!);
    const attackIndex = s.events.findIndex((event) => event.kind === "attackDeclared");
    expect(attackIndex).toBeGreaterThanOrEqual(0);
    expect(attackIndex).toBeLessThan(secondTriggerIndex);
    expect(attackDeclarations(s)).toHaveLength(1);
    expect([s.perm("free1"), s.perm("free2")].filter((permanent) => permanent.isSuspended)).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
