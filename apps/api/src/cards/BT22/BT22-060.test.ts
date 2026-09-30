import { describe, expect, it } from "vitest";
import { setupEngine, settle, type BoardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT22-060.js";

describe("BT22-060 Datamon", () => {
  it("protects itself and gains DP from face-down digivolution cards", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Restrict",
        restriction: "cantBeDeDigivolved",
        duration: "untilOpponentTurnEnd",
        target: { filter: { isSelfRef: true }, isSelf: true },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "ModifyDP",
        amount: 1000,
        duration: "untilOpponentTurnEnd",
        scaling: { per: 1, unit: "digivolutionCards", filter: { isSelfRef: true, faceDown: true } },
      });
    }
  });

  it("lets its owner choose the opponent's attacker at end of the opponent's turn", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Attack",
          optional: true,
          attackPlayer: true,
          drainTimingWindowDuringAttack: true,
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
  });

  it("publicly makes the opponent's chosen unsuspended Digimon attack at their turn end", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-065", as: "host", under: ["BT22-060"] }],
          security: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "chosen", dp: 20000 },
            { card: "BT1-010", as: "other", dp: 20000 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").topCard!.instanceId);
    s.state.turnSeat = 1;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;

    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.perm("other").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-010")).toHaveLength(2);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("offers the optional attack, then allows refusal while leaving legal and suspended candidates unchanged", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-065", as: "host", under: ["BT22-060"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "legal" }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).runTurn(1);

    expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT22-060")).toBe(true);
    expect(s.perm("legal").isSuspended).toBe(false);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("does not create an attack choice when every opponent Digimon is already suspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-065", as: "host", under: ["BT22-060"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "suspended" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("suspended").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;

    expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT22-060")).toBe(false);
    expect(s.perm("suspended").isSuspended).toBe(true);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("counts only face-down sources for DP and applies De-Digivolve immunity on evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT22-049",
              as: "base",
            },
          ],
          hand: [
            { card: "BT22-049", as: "faceDownSource" },
            { card: "BT22-049", as: "faceUpSource" },
            { card: "BT22-060", as: "datamon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("base").permanentId, [
      s.inst("faceDownSource").instanceId,
      s.inst("faceUpSource").instanceId,
    ]);
    s.perm("base").stack.find((card) => card.instanceId === s.inst("faceDownSource").instanceId)!.faceUp = false;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("datamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("base"), "cantBeDeDigivolved"));
    await settle();

    expect(s.perm("base").currentDP).toBe(7000);
    expect(observe(s.engine).isRestricted(s.perm("base"), "cantBeDeDigivolved")).toBe(true);
  });
});

describe("BT22-060 Datamon — KB Q&A rulings", () => {
  const datamonHost = { card: "BT22-065", as: "host", dp: 20000, under: ["BT22-060"] };
  const mySecurity = ["BT1-010", "BT1-010", "BT1-010"];

  /** Run the opponent's turn to its end, with Datamon's inherited effect under seat 0's host. */
  async function runOpponentTurn(
    opponent: BoardSpec[1],
    options: { accept: boolean; preferred?: string; preferredOnceAttacking?: string; memory?: number },
    duringMain?: (s: EngineSetup) => Promise<void>,
  ) {
    const preferInstanceIds: string[] = [];
    const s: EngineSetup = setupEngine(
      { 0: { battleArea: [datamonHost], security: mySecurity }, 1: opponent },
      {
        autoSelectCards: true,
        preferInstanceIds,
        ...(options.accept ? { autoAcceptOptional: true } : { autoDeclineOptional: true }),
        onEvent(event) {
          if (event.kind !== "attackDeclared" || options.preferredOnceAttacking === undefined) return;
          preferInstanceIds.splice(
            0,
            preferInstanceIds.length,
            s.perm(options.preferredOnceAttacking).topCard.instanceId,
          );
        },
      },
    );
    if (options.preferred !== undefined) preferInstanceIds.push(s.perm(options.preferred).topCard.instanceId);
    s.state.turnSeat = 1;
    s.state.memory = options.memory ?? 3;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await duringMain?.(s);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
    await settle(() => !observe(s.engine).isAttacking());
    return s;
  }

  it("lets you choose none of your opponent's Digimon, and then nothing attacks (Q4911)", async () => {
    const s = await runOpponentTurn({ battleArea: [{ card: "BT1-009", as: "legal" }] }, { accept: false });

    expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT22-060")).toBe(true);
    expect(s.perm("legal").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(3);
  });

  it("does not make a chosen Digimon that can't attack attack (Q4912)", async () => {
    const s = await runOpponentTurn(
      { battleArea: [{ card: "BT19-077", as: "calumon" }] },
      { accept: true, preferred: "calumon" },
    );

    expect(s.perm("calumon").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(3);
  });

  it("does not make the chosen Digimon attack while an end-of-turn attack is already in progress (Q4913)", async () => {
    const s = await runOpponentTurn(
      {
        battleArea: [
          { card: "BT1-009", as: "attacker", under: ["P-191"] },
          { card: "BT1-010", as: "chosen" },
        ],
      },
      { accept: true, preferred: "attacker", preferredOnceAttacking: "chosen" },
    );

    expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT22-060")).toBe(true);
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.perm("chosen").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(2);
  });

  it("can choose a Digimon that isn't affected by your effects, and it must attack (Q4914)", async () => {
    const s = await runOpponentTurn(
      { battleArea: [{ card: "BT17-016", as: "gallantmon" }] },
      { accept: true, preferred: "gallantmon", memory: 0 },
    );

    expect(s.perm("gallantmon").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
  });
});
