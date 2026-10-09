import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

async function arena(id: Parameters<typeof layDevScenario>[0], preferInstanceIds: string[] = []) {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: id !== "arena-wargrowlmon-evaded-block",
      preferInstanceIds,
      preferOptionIndex: id === "arena-wargrowlmon-evaded-block" ? undefined : 1,
      declinePrompts: ["return all"],
    },
  );
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}
async function close({ s, loop }: Awaited<ReturnType<typeof arena>>) {
  if (s.state.phase === Phase.Breeding) s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
  s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
  await loop;
}

it("GitHub #5385: Neptunemon evolves onto Aegiochusmon: Holy for the TS cost of 3", async () => {
  const game = await arena("arena-neptunemon-holy-cost");
  const { s } = game;
  try {
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: "dev-perm-0-report-neptune-base",
        instanceId: "report-neptune-hand",
        useAlternateCost: true,
        alternateRequirementIndex: 2,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !s.state.pendingDecision);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT24-030");
  } finally {
    await close(game);
  }
});

it("GitHub #5381: Climbmon plays Pistmon and resolves both On Play branches at three security", async () => {
  const game = await arena("arena-climbmon-pistmon-play", ["report-0-deck-1"]);
  const { s } = game;
  try {
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: "dev-perm-0-report-climb-base",
        instanceId: "report-climb-hand",
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT16-044") && !s.state.pendingDecision,
    );
    expect(s.state.memory).toBe(7);
    expect(s.state.players[1]!.battleArea[0]!.isSuspended).toBe(true);
    expect(s.events.some((e) => e.kind === "effectTriggered" && e.sourceCardId === "BT16-044")).toBe(true);
  } finally {
    await close(game);
  }
});

it("GitHub #5379 / Q7288: the inherited Sukamon prevention pays with an opposing Sukamon", async () => {
  const game = await arena("arena-sukamon-opponent-cost", ["dev-perm-1-report-sukamon-fodder"]);
  const { s } = game;
  try {
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: "report-gaia" })).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.trash.some((c) => c.instanceId === "report-gaia") && !s.state.pendingDecision,
    );
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX13-015");
    expect(s.state.players[1]!.trash.some((c) => c.cardId === "BT3-060")).toBe(true);
  } finally {
    await close(game);
  }
});

it("GitHub #5382 / Q2872: Vortex attack suspension does not trigger Toropiamon's effect-suspension watcher", async () => {
  const game = await arena("arena-toropiamon-vortex-control");
  const { s } = game;
  try {
    expect(observe(s.engine).hasKeyword(s.state.players[0]!.battleArea[0]!, "Vortex")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX9-042");
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === "report-hydra")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  } finally {
    await close(game);
  }
});

it.each(["arena-tuwarmon-opponent-blocker", "arena-chuuchuumon-opponent-blocker"] as const)(
  "Discord 1557955113648136222: %s grants inherited Blocker only on the opponent turn",
  async (id) => {
    const game = await arena(id);
    const { s } = game;
    try {
      const host = s.state.players[0]!.battleArea[0]!;
      expect(observe(s.engine).hasKeyword(host, "Blocker")).toBe(false);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      expect(observe(s.engine).hasKeyword(host, "Blocker")).toBe(true);
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: "dev-perm-1-report-tuwarmon-attacker",
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.combatWindow?.kind === "block");
      expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: host.permanentId })).toEqual({
        ok: true,
      });
      await advance(s.engine).finishAttack();
      expect(s.state.players[0]!.security).toHaveLength(5);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
    } finally {
      await close(game);
    }
  },
);

it("GitHub #5384: WarGrowlmon resolves End of Attack after a blocked battle is evaded", async () => {
  const game = await arena("arena-wargrowlmon-evaded-block");
  const { s } = game;
  try {
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: "dev-perm-0-report-war",
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.combatWindow?.kind === "block");
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: "dev-perm-1-report-ulforce" })).toEqual({
      ok: true,
    });
    const evading = () => s.state.combatWindow?.kind === "evade";
    for (let i = 0; i < 4 && !evading(); i++) {
      await settle(() => s.state.pendingDecision?.kind === "chooseOption" || s.state.combatWindow?.kind === "evade");
      if (evading()) break;
      const decision = s.state.pendingDecision!;
      const req = s.decisions.findLast((d) => d.req.decisionId === decision.decisionId)!.req;
      const choices = req.options?.choices ?? [];
      const unsuspend = choices.findIndex((c) => /^unsuspend/i.test(c));
      expect(
        s.engine.applyIntent(1, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "chooseOption", optionIndex: unsuspend >= 0 ? unsuspend : 0 },
        }),
      ).toEqual({ ok: true });
    }
    await settle(() => s.state.combatWindow?.kind === "evade");
    expect(
      s.engine.applyIntent(1, { type: "respondEvade", permanentId: "dev-perm-1-report-ulforce", accept: true }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT17-080")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "EX13-023")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(5);
  } finally {
    await close(game);
  }
});
