import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-063.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop turn loop");
  await loop;
}

function attack(s: ReturnType<typeof setupEngine>, seat: 0 | 1, attacker: string, target: string | "player") {
  return s.engine.applyIntent(seat, {
    type: "attack",
    attackerPermanentId: s.perm(attacker).permanentId,
    target: target === "player" ? { kind: "player" } : { kind: "permanent", permanentId: s.perm(target).permanentId },
  });
}

describe("EX7-063 Arisa Kinosaki", () => {
  it("matches the catalog and fully registered IR", () => {
    expect(getCardDefinition("EX7-063")).toMatchObject({
      cardId: "EX7-063",
      nameEn: "Arisa Kinosaki",
      colors: ["Yellow"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "StartOfYourMainPhase",
        actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "opponentHas" } }],
      },
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "SubTrigger",
            event: "onDeletionOf",
            sourceFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }],
              allowTokens: true,
            },
            actions: [
              {
                kind: "PlayWithoutCost",
                from: ["hand"],
                payCost: false,
                optional: true,
                abortOnDecline: true,
                target: {
                  count: 1,
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    levels: [3],
                    nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }],
                  },
                },
                cost: { kind: "suspend", target: { isSelf: true, filter: { isSelfRef: true }, count: 1 } },
              },
            ],
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
      },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-063")).toBe(true);
  });

  it.each([
    ["with an opposing Digimon", true, 3],
    ["without an opposing Digimon", false, 2],
  ])("resolves Start of Main %s", async (_label, hasOpponent, expectedMemory) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-063", as: "arisa" }],
        hand: ["BT1-009"],
        deck: ["BT1-009", "BT1-010"],
        security: ["BT1-009"],
      },
      1: {
        ...(hasOpponent ? { battleArea: [{ card: "BT1-009", as: "opponent" }] } : {}),
        hand: ["BT1-009"],
        deck: ["BT1-009", "BT1-010"],
        security: ["BT1-010"],
      },
    });
    s.state.memory = 2;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(expectedMemory);
    await stopLoop(s, loop, 0);
  });

  it("pays 3 to play from hand", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX7-063", as: "arisa" }] } });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arisa").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(1);
  });

  it("suspends itself and plays a level-3 Puppet after an own Puppet loses battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-063", as: "arisa" },
            { card: "BT11-035", as: "puppet", dp: 4000 },
          ],
          hand: [{ card: "BT13-035", as: "replacement" }],
        },
        1: { battleArea: [{ card: "BT10-022", as: "defender", suspended: true, dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(attack(s, 0, "puppet", "defender")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("arisa").isSuspended).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("replacement").instanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("does not respond when an own non-Puppet loses battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-063", as: "arisa" },
            { card: "BT1-009", as: "ordinary", dp: 3000 },
          ],
          hand: [{ card: "BT13-035", as: "replacement" }],
        },
        1: { battleArea: [{ card: "BT10-022", as: "defender", suspended: true, dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(attack(s, 0, "ordinary", "defender")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("arisa").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("replacement").instanceId)).toBe(
      true,
    );
  });

  it("responds to deletion of any owned Token, even without the Puppet trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-063", as: "arisa" },
            { card: "TOKEN-Diaboromon", as: "token", suspended: true },
          ],
          hand: [{ card: "BT13-035", as: "replacement" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 5000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(attack(s, 1, "attacker", "token")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("arisa").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT13-035")).toBe(true);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "TOKEN-Diaboromon")).toBe(false);
  });

  it("may decline the suspension cost and free play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-063", as: "arisa" },
            { card: "BT11-035", as: "puppet", dp: 4000 },
          ],
          hand: [{ card: "BT13-035", as: "replacement" }],
        },
        1: { battleArea: [{ card: "BT10-022", as: "defender", suspended: true, dp: 9000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(attack(s, 0, "puppet", "defender")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("arisa").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT13-035")).toBe(true);
  });

  it.each([
    ["a level-3 non-Puppet", "BT1-009"],
    ["a Puppet above level 3", "EX7-025"],
  ])("does not suspend for %s in hand", async (_label, candidate) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-063", as: "arisa" },
            { card: "BT11-035", as: "puppet", dp: 4000 },
          ],
          hand: [{ card: candidate, as: "candidate" }],
        },
        1: { battleArea: [{ card: "BT10-022", as: "defender", suspended: true, dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(attack(s, 0, "puppet", "defender")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("arisa").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("candidate").instanceId)).toBe(true);
  });

  it("plays itself from Security during a real check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX7-063", as: "arisa" }, "BT1-009"] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 5000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(attack(s, 1, "attacker", "player")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("arisa").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });
});
