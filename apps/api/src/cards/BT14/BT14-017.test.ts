import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-017.js";

describe("BT14-017", () => {
  it("preserves its printed Dinosaur/X Antibody stats", () =>
    expect(getCardDefinition("BT14-017")).toMatchObject({
      nameEn: "Dinorexmon",
      colors: ["Red"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Red", level: 5, memoryCost: 3 }],
      attributes: ["Data"],
      types: ["Dinosaur", "X Antibody"],
    }));

  it("gains Blitz on digivolution", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Blitz" }, duration: "forTheTurn" }],
    }));
  it("gets +4000 DP and restricts opposing low-DP Digimon while memory is at least one", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "Aura",
          effect: { amount: 4000 },
          condition: { kind: "memoryAtLeast", controller: "opponent", value: 1 },
        },
        {
          kind: "RestrictPlay",
          seat: "opponent",
          filter: { dpAtMost: 6000, allowTokens: true },
          condition: { kind: "memoryAtLeast", controller: "opponent", value: 1 },
        },
      ],
    }));

  it("buffs itself and blocks an opposing low-DP play while memory is positive", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-017", as: "dino" }] },
      1: { hand: [{ card: "BT14-007", as: "candidate" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 1;
    await s.ready();
    expect(s.perm("dino").currentDP).toBe(15000);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("candidate").instanceId })).toEqual({
      ok: false,
      reason: "play-prohibited",
    });
    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT14-007")).toBe(true);
    assertNoLoudGap(s);
  });

  it("uses opponent-relative memory after evolution crosses the gauge", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT14-016", as: "base" }],
        hand: [{ card: "BT14-017", as: "dino" }],
        deck: ["BT1-009"],
      },
      1: { security: ["BT1-085"] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dino").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT14-017" && s.perm("base").currentDP === 15000);
    expect(s.state.memory).toBe(-1);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blitz")).toBe(true);
    expect(s.perm("base").currentDP).toBe(15000);
    assertNoLoudGap(s);
  });

  it("uses the When Digivolving-granted Blitz for a real attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT14-016", as: "base" }],
        hand: [{ card: "BT14-017", as: "dino" }],
        deck: ["BT1-009"],
      },
      1: { security: ["BT1-085"] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dino").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Blitz"));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    assertNoLoudGap(s);
  });

  it("Q2380/Q2381 blocks effect-played low-DP Digimon and Digimon tokens", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-017", as: "dino" }] },
        1: {
          hand: [
            { card: "BT14-018", as: "goldramon" },
            { card: "BT14-007", as: "effectCandidate" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 13;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("goldramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-018"));
    await advance(s.engine).verb.playInstances([s.inst("effectCandidate").instanceId], "BT14-018");
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT14-007")).toBe(true);
    expect(
      s.state.players[1]!.battleArea.filter((permanent) =>
        ["TOKEN-AMON-OF-CRIMSON-FLAME", "TOKEN-UMON-OF-BLUE-THUNDER"].includes(permanent.topCard?.cardId ?? ""),
      ),
    ).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("turns off both continuous clauses when the opponent has no memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-017", as: "dino" }] },
      1: { hand: [{ card: "BT14-007", as: "candidate" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    expect(s.perm("dino").currentDP).toBe(11000);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("candidate").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-007"));
    assertNoLoudGap(s);
  });
});

describe("BT14-017 Dinorexmon — KB Q&A rulings", () => {
  async function opposingDinorexmonBoard(memory: number, candidate: string) {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-017", as: "dino" }] },
      1: { hand: [{ card: candidate, as: "candidate" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = memory;
    await s.ready();
    return s;
  }

  function candidateInBattleArea(s: Awaited<ReturnType<typeof opposingDinorexmonBoard>>) {
    return s.state.players[1]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("candidate").instanceId,
    );
  }

  it("stops me from playing a 6000 DP or less Digimon while I have 1 or more memory and my opponent has it (Q2379)", async () => {
    const blocked = await opposingDinorexmonBoard(1, "BT14-007");
    expect(
      blocked.engine.applyIntent(1, { type: "playCard", instanceId: blocked.inst("candidate").instanceId }),
    ).toEqual({ ok: false, reason: "play-prohibited" });
    expect(candidateInBattleArea(blocked)).toBeUndefined();

    const highDp = await opposingDinorexmonBoard(7, "BT14-038");
    expect(highDp.engine.applyIntent(1, { type: "playCard", instanceId: highDp.inst("candidate").instanceId })).toEqual(
      {
        ok: true,
      },
    );
    await settle(() => candidateInBattleArea(highDp) !== undefined);
    assertNoLoudGap(highDp);
  });

  it("stops a 6000 DP or less card from being played even if an effect would raise its DP above 6000 once played (Q2382)", async () => {
    const blocked = await opposingDinorexmonBoard(5, "P-057");
    expect(
      blocked.engine.applyIntent(1, { type: "playCard", instanceId: blocked.inst("candidate").instanceId }),
    ).toEqual({ ok: false, reason: "play-prohibited" });
    expect(blocked.state.memory).toBe(5);
    expect(candidateInBattleArea(blocked)).toBeUndefined();

    const unrestricted = await opposingDinorexmonBoard(0, "P-057");
    expect(
      unrestricted.engine.applyIntent(1, { type: "playCard", instanceId: unrestricted.inst("candidate").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => candidateInBattleArea(unrestricted) !== undefined);
    expect(candidateInBattleArea(unrestricted)!.currentDP).toBeGreaterThan(6000);
    assertNoLoudGap(unrestricted);
  });

  it("checks memory at the play declaration, so paying the cost down to 0 or below does not allow the play (Q2383)", async () => {
    for (const memory of [3, 1]) {
      const blocked = await opposingDinorexmonBoard(memory, "BT14-007");
      expect(
        blocked.engine.applyIntent(1, { type: "playCard", instanceId: blocked.inst("candidate").instanceId }),
      ).toEqual({ ok: false, reason: "play-prohibited" });
      expect(blocked.state.memory).toBe(memory);
      expect(candidateInBattleArea(blocked)).toBeUndefined();
    }

    const noMemory = await opposingDinorexmonBoard(0, "BT14-007");
    expect(
      noMemory.engine.applyIntent(1, { type: "playCard", instanceId: noMemory.inst("candidate").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => candidateInBattleArea(noMemory) !== undefined);
    expect(noMemory.state.memory).toBe(-3);
  });

  it("does not let me pay the play cost of a 6000 DP or less Digimon without playing it (Q2384)", async () => {
    const s = await opposingDinorexmonBoard(1, "BT14-007");
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("candidate").instanceId })).toEqual({
      ok: false,
      reason: "play-prohibited",
    });

    expect(s.state.memory).toBe(1);
    expect(s.state.turnSeat).toBe(1);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([s.inst("candidate").instanceId]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(candidateInBattleArea(s)).toBeUndefined();
    assertNoLoudGap(s);
  });
});
