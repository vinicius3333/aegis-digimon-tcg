import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-084.js";
import "./index.js";

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
          leaveCause: "battle",
          sourceFilter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "gte", value: 5 } },
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
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [{ kind: "Attack", target: { filter: { nameOrTrait: [{ tokens: ["Free"], match: "trait" }] } } }],
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
            { card: "BT1-083", as: "attacker", dp: 1000, under: [{ card: "BT4-056", as: "recovered" }] },
          ],
        },
        1: { battleArea: [{ card: "BT5-086", as: "opponent" }] },
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
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === recoveredId));

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === recoveredId)).toBe(true);
    expect(s.perm("unrelated").stack.some((card) => card.cardId === "BT4-056")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-083")).toBe(true);
    assertNoLoudGap(s);
  });

  it("can pay the battle-deletion replacement cost even with no eligible stack card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: TAMER, as: "tamer" }, { card: "BT1-083", as: "attacker", dp: 1000 }] },
        1: { battleArea: [{ card: "BT5-086", as: "opponent" }] },
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
        0: { battleArea: [{ card: TAMER, as: "tamer" }, { card: FREE_DIGIMON, as: "free" }] },
        1: { battleArea: [{ card: OPPONENT_DIGIMON, as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await s.ready();
    await advance(s.engine).runTurn(0);
    await settle(() => s.perm("free").isSuspended);

    expect(s.perm("free").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === OPPONENT_DIGIMON)).toBe(false);
    assertNoLoudGap(s);
  });

  it("sets memory to 3 at the start of your turn only from 2 or less", async () => {
    const low = setupEngine({ 0: { battleArea: [{ card: TAMER, as: "tamer" }] } });
    low.state.memory = 2;
    await low.ready();
    await advance(low.engine).runTurn(0);
    expect(low.state.memory).toBe(3);
    assertNoLoudGap(low);

    const high = setupEngine({ 0: { battleArea: [{ card: TAMER, as: "tamer" }] } });
    high.state.memory = 4;
    await high.ready();
    await advance(high.engine).runTurn(0);
    expect(high.state.memory).toBe(4);
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
    await advance(s.engine).runTurn(0);

    expect(s.perm("suspendedFree").isSuspended).toBe(true);
    expect(s.perm("nonFree").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === OPPONENT_DIGIMON)).toBe(true);
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
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
    expect(s.state.players[1]!.security.some((card) => card.instanceId === instanceId)).toBe(false);
    assertNoLoudGap(s);
  });
});
