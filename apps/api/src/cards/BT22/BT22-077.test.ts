import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type BoardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-077.js";
import "../index.js";
import { baseFor, CARD_OF_LEVEL, digivolveOnto, sameLevelCases } from "./sameLevel.testSupport.js";

describe("BT22-077 Dianamon", () => {
  it("conditionally trashes four opponent stack cards, then unconditionally returns a low-stack Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 4,
      scope: "acrossDigimon",
      condition: { kind: "stackHasSameLevelCards", count: 2 },
    });
    expect(effect?.actions[1]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], digivolutionCardsAtMost: 1 },
        count: 1,
      },
    });
  });

  it("keeps separate once-per-turn unsuspend effects for the main and inherited text", () => {
    const endEffects = compiled.effects.filter((entry) => entry.trigger === "EndOfYourTurn");
    expect(endEffects).toHaveLength(2);
    expect(endEffects.map((entry) => entry.isInherited ?? false)).toEqual([false, true]);
    for (const effect of endEffects)
      expect(effect).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Unsuspend", optional: true }] });
  });

  it("still bottoms a low-stack opponent when the same-level condition is false", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-073", as: "host", under: ["BT22-072"] }],
          hand: [{ card: "BT22-077", as: "dianamon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("dianamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId));
    expect(s.state.players[1]!.deck.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("trashes four opponent sources and then bottoms a low-stack Digimon on public evolution", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-073", as: "host", under: ["BT22-073", "BT22-074"] }],
          hand: [{ card: "BT22-077", as: "dianamon" }],
        },
        1: {
          battleArea: [
            { card: "BT22-072", as: "stacked", under: ["BT22-069", "BT22-069", "BT22-071", "BT22-070"] },
            { card: "BT1-009", as: "low" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    const lowId = s.perm("low").permanentId;
    preferInstanceIds.push(s.perm("low").topCard!.instanceId);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("dianamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.some((card) => card.cardId === "BT1-009"));

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === lowId)).toBe(false);
    expect(s.state.players[1]!.trash).toHaveLength(4);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-009");
  });
});

describe("BT22-077 Dianamon — KB Q&A rulings", () => {
  async function digivolveDianamon(under: string[], opponentUnder: string[]) {
    const s = setupEngine(
      {
        0: { battleArea: [baseFor(under)], hand: [{ card: "BT22-077", as: "dianamon" }], deck: ["BT1-010"] },
        1: { battleArea: [{ card: "BT1-009", as: "target", under: opponentUnder }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const targetId = s.perm("target").permanentId;
    expect(digivolveOnto(s, "base", "dianamon")).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT22-077");
    await settle(() => s.state.pendingDecision === undefined);
    return {
      opponentTrash: s.state.players[1]!.trash.length,
      targetReturned: !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId),
    };
  }

  it.each(sameLevelCases(6))(
    "counts every card in its stack, itself included, for 2 same-level cards: $stack (Q4941)",
    async ({ under, sameLevel }) => {
      expect(await digivolveDianamon(under, [CARD_OF_LEVEL[3], CARD_OF_LEVEL[3]])).toEqual({
        opponentTrash: sameLevel ? 2 : 0,
        targetReturned: sameLevel,
      });
    },
  );

  it("still returns an opposing Digimon with 1 or fewer digivolution cards when the stack has no same-level pair (Q4942)", async () => {
    const [, , noRepeatedLevel] = sameLevelCases(6);

    expect(await digivolveDianamon(noRepeatedLevel!.under, [])).toEqual({
      opponentTrash: 0,
      targetReturned: true,
    });
  });
});

describe("BT22-077 Dianamon with P-191 Apollomon — KB Q&A rulings", () => {
  const attacksDeclared = (s: EngineSetup) => s.events.filter((event) => event.kind === "attackDeclared").length;

  async function runMyTurn(
    board: BoardSpec,
    firstTrigger: string,
    duringMain: (s: EngineSetup) => Promise<void> = async () => {},
  ) {
    const s = setupEngine(board, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      preferTriggerKeys: [firstTrigger],
    });
    s.state.isFirstPlayersFirstTurn = false;
    s.state.memory = 3;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await duringMain(s);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    await settle(() => !observe(s.engine).isAttacking());
    return s;
  }

  const dianamonWithApollomon: BoardSpec = {
    0: {
      battleArea: [{ card: "BT22-077", as: "dianamon", under: [CARD_OF_LEVEL[5], "P-191"] }],
      deck: ["BT1-010", "BT1-011"],
    },
    1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
  };

  it("attacks with Apollomon's inherited effect, then unsuspends with Dianamon's [End of Your Turn] effect (Q4985)", async () => {
    const s = await runMyTurn(dianamonWithApollomon, "P-191");

    expect(attacksDeclared(s)).toBe(1);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("dianamon").isSuspended).toBe(false);
  });

  it("unsuspends with Dianamon's [End of Your Turn] effect, then attacks with Apollomon's inherited effect (Q4986)", async () => {
    const s = await runMyTurn(dianamonWithApollomon, "BT22-077", async (turn) => {
      expect(
        turn.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: turn.perm("dianamon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await advance(turn.engine).finishAttack();
      expect(turn.perm("dianamon").isSuspended).toBe(true);
    });

    expect(attacksDeclared(s)).toBe(2);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("dianamon").isSuspended).toBe(true);
  });

  it("does not trigger Apollomon's inherited effect after it becomes a digivolution card at end of turn (Q6247)", async () => {
    const s = await runMyTurn(
      {
        0: {
          battleArea: [
            { card: "P-191", as: "apollomon" },
            { card: "ST2-10", as: "plesiomon" },
            { card: "BT1-019", as: "bystander" },
          ],
          hand: [{ card: "BT25-103", as: "graceNovamon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      "P-191",
    );

    const graceNovamon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT25-103");
    expect(graceNovamon?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["P-191", "ST2-10"]));
    expect(attacksDeclared(s)).toBe(1);
  });
});
