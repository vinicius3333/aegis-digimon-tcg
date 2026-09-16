import { describe, it, expect } from "vitest";
import type { Permanent } from "@aegis/shared";
import type { ContinuousEffectLedger } from "../../engine/effects/continuous.js";
import { GameStateAccess } from "../../engine/state/access.js";
import { validateAttack } from "../../engine/actions/attack.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

const VORTEX_DIGIMON = "BT25-053";
const PLAIN_DIGIMON = "AD1-002";

function ledger(s: EngineSetup): ContinuousEffectLedger {
  return (s.engine as unknown as { continuous: ContinuousEffectLedger }).continuous;
}

async function recompute(s: EngineSetup): Promise<void> {
  await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();
}

function validate(
  s: EngineSetup,
  attacker: Permanent,
  target: Parameters<typeof validateAttack>[2]["target"],
  vortex: boolean,
): ReturnType<typeof validateAttack> {
  const access = new GameStateAccess(s.state);
  return validateAttack(
    {
      state: s.state,
      access,
      combat: { isAttacking: false } as never,
      onCombatError: () => {},
      continuous: ledger(s),
    },
    0,
    { attackerPermanentId: attacker.permanentId, target, vortex },
  );
}

describe("EX11-062 — [Your Turn] grants VortexCanAttackPlayers (production recompute)", () => {
  it("records the grant on a friendly ＜Vortex＞ Digimon while opponent has no unsuspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: ["EX11-062", { card: VORTEX_DIGIMON, as: "vortexAttacker" }] },
    });
    const vortexAttacker = s.perm("vortexAttacker");

    await recompute(s);

    expect(ledger(s).vortexCanAttackPlayers(vortexAttacker.permanentId)).toBe(true);

    await recompute(s);
    expect(ledger(s).vortexCanAttackPlayers(vortexAttacker.permanentId)).toBe(true);
  });
});

describe("EX11-062 — ＜Vortex＞ player-attack legality (real end-of-turn flow)", () => {
  function vortexTurn(board: { opponentDigimon?: { suspended: boolean }; withShoto: boolean }): {
    s: EngineSetup;
    runTurn: () => Promise<{ grantAtMain: boolean }>;
  } {
    const s = setupEngine(
      {
        0: {
          hand: ["AD1-001"],
          deck: ["AD1-001"],
          battleArea: [
            ...(board.withShoto ? ["EX11-062"] : []),
            { card: VORTEX_DIGIMON, as: "vortexAttacker", dp: 8000 },
          ],
        },
        1: {
          hand: ["AD1-001"],
          deck: ["AD1-001"],
          security: ["BT1-011"],
          battleArea:
            board.opponentDigimon === undefined
              ? []
              : [{ card: PLAIN_DIGIMON, as: "opponentDigimon", dp: 1000, suspended: board.opponentDigimon.suspended }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: ["player"] },
    );
    const runTurn = async (): Promise<{ grantAtMain: boolean }> => {
      s.state.isFirstPlayersFirstTurn = true;
      const turn = s.engine.runOneTurn();
      const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
      await settle(() => mainPhase.isOpen, 500);
      const grantAtMain = ledger(s).vortexCanAttackPlayers(s.perm("vortexAttacker").permanentId);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await turn;
      return { grantAtMain };
    };
    return { s, runTurn };
  }

  const declaredAttacks = (s: EngineSetup) => s.events.filter((event) => event.kind === "attackDeclared");
  const vortexPrompted = (s: EngineSetup): boolean =>
    s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === VORTEX_DIGIMON);

  it("WITH the relaxation, the friendly ＜Vortex＞ attack may target the player", async () => {
    const { s, runTurn } = vortexTurn({ withShoto: true });
    const vortexAttacker = s.perm("vortexAttacker");
    const { grantAtMain } = await runTurn();

    expect(grantAtMain).toBe(true);
    expect(declaredAttacks(s)).toEqual([
      expect.objectContaining({ attackerPermanentId: vortexAttacker.permanentId, target: { kind: "player" } }),
    ]);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("WITHOUT the grant (no EX11-062), the ＜Vortex＞ attack has no legal target (base Digimon-only)", async () => {
    const { s, runTurn } = vortexTurn({ withShoto: false });
    const { grantAtMain } = await runTurn();

    expect(grantAtMain).toBe(false);
    expect(vortexPrompted(s)).toBe(true);
    expect(declaredAttacks(s)).toEqual([]);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("control: an UNSUSPENDED opponent Digimon fails the condition => grant not derived => Digimon only", async () => {
    const { s, runTurn } = vortexTurn({ withShoto: true, opponentDigimon: { suspended: false } });
    const vortexAttacker = s.perm("vortexAttacker");
    const opponentDigimonId = s.perm("opponentDigimon").permanentId;
    const { grantAtMain } = await runTurn();

    expect(grantAtMain).toBe(false);
    expect(declaredAttacks(s)).toEqual([
      expect.objectContaining({
        attackerPermanentId: vortexAttacker.permanentId,
        target: { kind: "permanent", permanentId: opponentDigimonId },
      }),
    ]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("control: a SUSPENDED opponent Digimon still satisfies the condition => grant derived => player legal", async () => {
    const { s, runTurn } = vortexTurn({ withShoto: true, opponentDigimon: { suspended: true } });
    const vortexAttacker = s.perm("vortexAttacker");
    const { grantAtMain } = await runTurn();

    expect(grantAtMain).toBe(true);
    expect(declaredAttacks(s)).toEqual([
      expect.objectContaining({ attackerPermanentId: vortexAttacker.permanentId, target: { kind: "player" } }),
    ]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("a NORMAL (non-Vortex) player attack is unaffected by the base subsystem (still legal)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: PLAIN_DIGIMON, as: "plainAttacker" }] },
      1: { battleArea: [{ card: PLAIN_DIGIMON, suspended: false }] },
    });
    const plainAttacker = s.perm("plainAttacker");

    await recompute(s);

    expect(validate(s, plainAttacker, { kind: "player" }, false)).toBeNull();
  });
});
