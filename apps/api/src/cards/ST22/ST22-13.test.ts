import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22-13 GrandGalemon", () => {
  it("suspends an opposing Digimon and gains 3000 DP on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST22-13", as: "grand" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opponent = s.perm("opponent");
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grand").instanceId })).toEqual({ ok: true });
    const grand = s.perm("grand");
    await settle(() => grand.currentDP === 10000);
    expect(grand.isSuspended || opponent.isSuspended).toBe(true);
    expect(grand.currentDP).toBe(10000);
  });

  it("resolves Vortex combat from the real end-of-turn timing window", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST22-13", as: "grand" }], deck: ["BT1-002", "BT1-002"] },
        1: {
          battleArea: [{ card: "ST1-02", as: "target", suspended: true }],
          deck: ["BT1-002", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const targetId = s.perm("target").permanentId;
    const startingTurn = s.state.turnCount;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => s.state.turnCount > startingTurn && s.state.phase === "Main" && mainPhase.isOpen);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(
      s.events.some(
        (event) =>
          event.kind === "attackDeclared" &&
          event.attackerPermanentId === s.perm("grand").permanentId &&
          event.target?.kind === "permanent" &&
          event.target.permanentId === targetId,
      ),
    ).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

describe("ST22-13 GrandGalemon — KB Q&A rulings", () => {
  it.each(["mine", "theirs"])(
    "can suspend either player's Digimon with its [On Play] effect (%s) (Q5445)",
    async (chosen) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: { hand: [{ card: "ST22-13", as: "grand" }], battleArea: [{ card: "BT1-009", as: "mine" }] },
          1: { battleArea: [{ card: "BT1-009", as: "theirs" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.perm(chosen).permanentId, s.perm(chosen).topCard.instanceId);
      s.state.memory = 10;
      await s.ready();

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grand").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.perm("grand").currentDP === 10000);

      const targets = s.decisions.find(({ req }) => req.kind === "chooseTargets")!.req.options?.candidateInstanceIds;
      expect(targets).toEqual(expect.arrayContaining([s.perm("mine").permanentId, s.perm("theirs").permanentId]));
      expect(s.perm("mine").isSuspended).toBe(chosen === "mine");
      expect(s.perm("theirs").isSuspended).toBe(chosen === "theirs");
    },
  );

  it("does not <Vortex> again after <Fortitude> replays it from a lost Vortex battle (Q5446)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST22-13", as: "grand", under: ["ST4-07"] }], deck: ["BT1-002", "BT1-002"] },
        1: {
          battleArea: [{ card: "BT1-010", as: "target", suspended: true, dp: 20000 }],
          deck: ["BT1-002", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const grandInstanceId = s.perm("grand").topCard.instanceId;
    const originalPermanentId = s.perm("grand").permanentId;

    await advance(s.engine).runTurn(0);

    const replayed = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === grandInstanceId,
    );
    expect(replayed).toBeDefined();
    expect(replayed!.permanentId).not.toBe(originalPermanentId);
    expect(
      s.events.some(
        (event) => event.kind === "combatResolved" && event.deletedPermanentIds.includes(originalPermanentId),
      ),
    ).toBe(true);
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(1);
  });
});
