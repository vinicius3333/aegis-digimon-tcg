import { describe, expect, it } from "vitest";
import { EffectDuration } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-042.js";
import "./EX6-007.js";
import "../ST13/ST13-16.js";
import "../ST1/ST1-16.js";
import "./EX6-044.js";

describe("EX6-042 RaijiLudomon", () => {
  it("pays 2 and places itself under a level 5 or Legend-Arms Digimon to grant the opponent an attack aura", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "GrantAuraToOpponents",
      duration: "untilOpponentTurnEnd",
      effectText: "[Start of Your Main Phase] This Digimon attacks.",
      cost: {
        kind: "compound",
        costs: [
          { kind: "payMemory", memory: 2 },
          {
            kind: "place",
            destination: "digivolutionStack",
            position: "bottom",
            target: { filter: { isSelfRef: true } },
          },
        ],
      },
    }));
  it("only grants Blocker/Reboot for effect-driven placement and inherits Legend-Arms protection", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { isSelfRef: true, byEffect: true },
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "Blocker" } },
        { kind: "GainKeyword", keyword: { keyword: "Reboot" } },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          leaveCause: "otherThanYourEffect",
          actions: [
            {
              kind: "Prevent",
              optional: true,
              cost: {
                target: {
                  filter: { zone: "digivolutionCards", hostFilter: { isSelfRef: true } },
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("publicly pays 2 and places RaijiLudomon under an eligible level 5 host", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-009", as: "host" }], hand: [{ card: "EX6-042", as: "raiji" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const effect = JSON.parse(s.inst("raiji").activatableEffectsJson || "[]")[0];
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("raiji").instanceId,
        effectKey: effect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === s.inst("raiji").instanceId));
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("raiji").instanceId)).toBe(true);
    expect(s.state.memory).toBe(3);
  });
  it("does not expose the hand Main effect without a level 5 or Legend-Arms host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-053", as: "ineligible" }], hand: [{ card: "EX6-042", as: "raiji" }] },
    });
    await s.ready();
    expect(JSON.parse(s.inst("raiji").activatableEffectsJson || "[]")).toHaveLength(0);
  });

  it("publicly evolves onto a legal Legend-Arms stack without granting keywords", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-040", as: "host" }],
          hand: [{ card: "EX6-042", as: "raiji" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("raiji").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.instanceId === s.inst("raiji").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(false);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("host").instanceId)).toBe(true);
  });

  it("grants both keywords when EX6-007 publicly places itself under RaijiLudomon", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-042", as: "raiji" }], hand: [{ card: "EX6-007", as: "zubamon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const effect = JSON.parse(s.inst("zubamon").activatableEffectsJson || "[]")[0];
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("zubamon").instanceId,
        effectKey: effect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("raiji").stack.some((card) => card.instanceId === s.inst("zubamon").instanceId));
    expect(observe(s.engine).hasKeyword(s.perm("raiji"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("raiji"), "Reboot")).toBe(true);
  });

  it("uses an Option with the Legend-Arms trait to prevent opponent Gaia Force once", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-044", as: "host", under: [{ card: "ST13-16", as: "option" }, "EX6-042"] }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "redSource" }],
          hand: [
            { card: "ST1-16", as: "gaiaForce" },
            { card: "ST1-16", as: "gaiaForce2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.inst("option").instanceId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.perm("host").stack.length === 1);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("host").permanentId)).toBe(true);
    expect(s.state.players[0]!.trash).toContainEqual(expect.objectContaining({ cardId: "ST13-16" }));
    expect(s.perm("host").stack.some((c) => c.cardId === "ST13-16")).toBe(false);
    expect(s.state.players[1]!.trash.some((c) => c.cardId === "ST1-16")).toBe(true);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("host").permanentId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("host").permanentId)).toBe(false);
  });
});

describe("EX6-042 RaijiLudomon — KB Q&A rulings", () => {
  it("cannot pay 2 cost without a Digimon to place this card under (Q3764)", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-014", as: "ineligible" }], hand: [{ card: "EX6-042", as: "raiji" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const handEffects = () => JSON.parse(s.inst("raiji").activatableEffectsJson || "[]") as unknown[];
    expect(handEffects()).toEqual([]);
    expect(s.state.memory).toBe(5);

    s.putOnBoard(0, { card: "EX6-009", as: "eligible" });
    await s.ready();
    expect(handEffects()).toHaveLength(1);
  });

  type Board = ReturnType<typeof setupEngine>;

  async function forceAttacksOn(opponents: PermanentSpec[], prepare?: (s: Board) => Promise<void>) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: opponents.map((_, index) => ({ card: "EX6-009", as: `host${index}` })),
          hand: opponents.map((_, index) => ({ card: "EX6-042", as: `raiji${index}` })),
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: opponents, deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    await prepare?.(s);
    for (const [index, opponent] of opponents.entries()) {
      preferred.splice(0, preferred.length, s.perm(opponent.as!).topCard!.instanceId);
      const [effect] = JSON.parse(s.inst(`raiji${index}`).activatableEffectsJson || "[]") as Array<{
        effectKey: string;
      }>;
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: s.inst(`raiji${index}`).instanceId,
          effectKey: effect!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.battleArea.some((host) =>
            host.stack.some((card) => card.instanceId === s.inst(`raiji${index}`).instanceId),
          ) && s.state.pendingDecision === undefined,
      );
    }
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).finishAttack();
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
    return s;
  }

  it("can target a Digimon that can't attack, but that Digimon then makes no attack (Q3765)", async () => {
    const s = await forceAttacksOn([{ card: "BT1-080", as: "grounded" }], async (board) => {
      await advance(board.engine).verb.restrict(
        board.perm("grounded").permanentId,
        "attack",
        EffectDuration.UntilOpponentTurnEnd,
      );
    });
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("grounded"))).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(5);

    const free = await forceAttacksOn([{ card: "BT1-080", as: "free" }]);
    expect(observe(free.engine).hasAttackedThisTurn(free.perm("free"))).toBe(true);
    expect(free.state.players[0]!.security).toHaveLength(4);
  });

  it("lets only the first of two simultaneous forced attacks happen (Q3766)", async () => {
    const s = await forceAttacksOn([
      { card: "BT1-080", as: "first" },
      { card: "BT1-080", as: "second" },
    ]);
    const attacked = ["first", "second"].filter((alias) => observe(s.engine).hasAttackedThisTurn(s.perm(alias)));
    expect(attacked).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(4);
  });

  it("targets a Digimon immune only during its opponent's turn, which then attacks on its own turn (Q3767)", async () => {
    const s = await forceAttacksOn([{ card: "BT1-080", as: "immune" }], async (board) => {
      await advance(board.engine).verb.restrict(
        board.perm("immune").permanentId,
        "beAffected",
        EffectDuration.UntilEachTurnEnd,
        {
          byOpponentEffectsOnly: true,
        },
      );
    });
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("immune"))).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(4);
  });

  it("can trash RaijiLudomon itself from the digivolution cards to prevent the deletion (Q3768)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-044", as: "host", under: [{ card: "EX6-042", as: "raiji" }] }] },
        1: { battleArea: [{ card: "BT1-009", as: "redSource" }], hand: [{ card: "ST1-16", as: "gaiaForce" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.perm("host").stack.length === 0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([hostId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("raiji").instanceId]);
  });
});
