import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-062.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT14-062", () => {
  it("prevents opponent effects from deleting this card", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "beDeleted",
      duration: "permanent",
      byOpponentEffectsOnly: true,
    }));

  it("survives a natural opponent Option deletion effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-062", as: "datamon" }] },
        1: {
          battleArea: [{ card: "ST14-03", as: "purpleSource" }],
          hand: [{ card: "ST14-12", as: "deletionOption" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("deletionOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "ST14-12"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-062")).toBe(true);
  });
});

describe("BT14-062 Datamon — KB Q&A rulings", () => {
  const datamonIsOnBoard = (s: ReturnType<typeof setupEngine>) =>
    s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-062");
  const datamonIsInTrash = (s: ReturnType<typeof setupEngine>) =>
    s.state.players[0]!.trash.some((card) => card.cardId === "BT14-062");

  it("blocks only effect deletion, not battle losses or DP reduced to 0 (Q2433)", async () => {
    const deletedByEffect = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-062", as: "datamon" }] },
        1: {
          battleArea: [{ card: "ST14-03", as: "purpleSource" }],
          hand: [{ card: "ST14-12", as: "deletionOption" }],
        },
      },
      { autoSelectCards: true },
    );
    deletedByEffect.state.turnSeat = 1;
    deletedByEffect.state.memory = 10;
    await deletedByEffect.ready();
    expect(
      deletedByEffect.engine.applyIntent(1, {
        type: "playCard",
        instanceId: deletedByEffect.inst("deletionOption").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => deletedByEffect.state.players[1]!.trash.some((card) => card.cardId === "ST14-12"));
    expect(datamonIsOnBoard(deletedByEffect)).toBe(true);

    const reducedToZero = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-062", as: "datamon" }] },
        1: {
          battleArea: [{ card: "BT1-059", as: "yellowSource" }],
          hand: [{ card: "BT1-106", as: "reductionOption" }],
        },
      },
      { autoSelectCards: true },
    );
    reducedToZero.state.turnSeat = 1;
    reducedToZero.state.memory = 10;
    await reducedToZero.ready();
    expect(
      reducedToZero.engine.applyIntent(1, {
        type: "playCard",
        instanceId: reducedToZero.inst("reductionOption").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => datamonIsInTrash(reducedToZero));
    expect(datamonIsOnBoard(reducedToZero)).toBe(false);

    const lostBattle = setupEngine({
      0: { battleArea: [{ card: "BT14-062", as: "datamon", suspended: true }] },
      1: { battleArea: [{ card: "BT1-059", as: "attacker" }] },
    });
    lostBattle.state.turnSeat = 1;
    await lostBattle.ready();
    expect(
      lostBattle.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: lostBattle.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: lostBattle.perm("datamon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => datamonIsInTrash(lostBattle));
    expect(datamonIsOnBoard(lostBattle)).toBe(false);
  });

  it("lets Gallantmon choose Datamon so its 'didn't delete' bonus applies (Q3071)", async () => {
    const digivolveGallantmonChoosing = async (preferred: "datamon" | "muchomon") => {
      const preferInstanceIds: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT1-024", as: "source" }],
            hand: [{ card: "BT19-015", as: "gallant" }],
            deck: ["BT1-009"],
          },
          1: {
            battleArea: [
              { card: "BT14-062", as: "datamon" },
              { card: "BT1-013", as: "muchomon" },
            ],
          },
        },
        { autoSelectCards: true, preferInstanceIds },
      );
      s.state.memory = 10;
      await s.ready();
      preferInstanceIds.push(s.perm(preferred).topCard.instanceId);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("source").permanentId,
          instanceId: s.inst("gallant").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined && s.perm("source").topCard.cardId === "BT19-015");
      return s;
    };

    const choseDatamon = await digivolveGallantmonChoosing("datamon");
    expect(choseDatamon.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId).sort()).toEqual([
      "BT1-013",
      "BT14-062",
    ]);
    expect(choseDatamon.perm("source").currentDP).toBe(15000);
    expect(observe(choseDatamon.engine).hasPierce(choseDatamon.perm("source"))).toBe(true);

    const choseMuchomon = await digivolveGallantmonChoosing("muchomon");
    expect(choseMuchomon.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([
      "BT14-062",
    ]);
    expect(choseMuchomon.perm("source").currentDP).toBe(12000);
    expect(observe(choseMuchomon.engine).hasPierce(choseMuchomon.perm("source"))).toBe(false);
  });

  it("keeps Omnimon Alter-B's repeated lowest-cost deletions on Datamon, sparing the cost-7 Digimon (Q3522)", async () => {
    const attackWithOmnimonAlterB = async (lowestCostCardId: string) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "EX4-073", as: "attacker", under: ["AD1-004", "AD1-012"] }] },
          1: {
            security: ["BT1-009"],
            battleArea: [
              { card: lowestCostCardId, as: "lowest" },
              { card: "AD1-003", as: "costSeven" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.perm("attacker").stack.length === 0 &&
          s.state.players[1]!.security.length === 0 &&
          s.state.pendingDecision === undefined,
      );
      return s;
    };

    const againstDatamon = await attackWithOmnimonAlterB("BT14-062");
    expect(againstDatamon.perm("attacker").stack).toHaveLength(0);
    expect(againstDatamon.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId).sort()).toEqual([
      "AD1-003",
      "BT14-062",
    ]);

    const againstMonzaemon = await attackWithOmnimonAlterB("BT1-038");
    expect(againstMonzaemon.state.players[1]!.battleArea).toHaveLength(0);
  });
});
