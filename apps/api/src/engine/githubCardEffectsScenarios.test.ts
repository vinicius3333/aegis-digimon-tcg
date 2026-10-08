import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario, type DevScenarioId } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";
import { setupEngine, settle, type SetupEngineOptions } from "./testkit/harness.js";

async function launch(id: DevScenarioId, options: SetupEngineOptions = {}) {
  const s = setupEngine({ 0: {}, 1: {} }, options);
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  const idle = () => settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  await idle();
  const finish = async () => {
    // Paying a large play cost legally passes the turn after the effect resolves.
    // Close the next breeding phase before surrender so the turn-loop waiter releases.
    if (s.state.phase === Phase.Breeding) {
      const seat = s.state.turnSeat;
      const ended = s.engine.applyIntent(seat, { type: "endPhase" });
      if (!ended.ok) throw new Error(`Could not end the next breeding phase: ${ended.reason}`);
      await advance(s.engine).waitForMainPhase(seat);
    }
    expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  };
  return { s, idle, finish };
}

it.each(["hand", "trash"] as const)(
  "GitHub #5286 arena: EX13 Knightmon is offered and played from %s",
  async (zone) => {
    const selected = `github-knight-${zone}`;
    const { s, idle, finish } = await launch("arena-github-5286-lordknightmon-knightmon", {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferInstanceIds: [selected],
      declinePrompts: ["1 of your [Knightmon] text Digimon may"],
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: "dev-perm-0-github-lord-base",
        instanceId: "github-lord",
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === selected));
    await idle();
    const picker = s.decisions.find(({ req }) => req.sourceCardId === "EX13-064" && req.kind === "selectCards")!.req;
    expect(picker.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining(["github-knight-hand", "github-knight-trash"]),
    );
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "cardPlayed", cardId: "EX13-058", instanceId: selected, fromZone: zone }),
    );
    expect(s.state.memory).toBe(7);
    await finish();
  },
);

it.each(["hand", "sources", "slayerdramon"] as const)(
  "GitHub #5285 arena: Examon plays the selected Dracomon-text card (%s) after winning battle",
  async (zone) => {
    const selected =
      zone === "hand" ? "github-wing-hand" : zone === "sources" ? "dev-stack-0-github-examon-0" : "github-slayer-hand";
    const { s, idle, finish } = await launch("arena-github-5285-examon-battle-win", {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferInstanceIds: [selected],
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: "dev-perm-0-github-examon",
        target: { kind: "permanent", permanentId: "dev-perm-1-github-examon-victim" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "attackEnded"));
    await settle(() => !observe(s.engine).isAttacking());
    await idle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === selected)).toBe(true);
    const picker = s.decisions.find(({ req }) => req.sourceCardId === "EX13-045" && req.kind === "selectCards")!.req;
    expect(picker.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining(["github-wing-hand", "dev-stack-0-github-examon-0"]),
    );
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-013")).toBe(true);
    expect(s.state.memory).toBe(5);
    await finish();
  },
);

it("GitHub #5284 arena: Regulusmon shares one paid activation between digivolving and attacking", async () => {
  const { s, idle, finish } = await launch("arena-github-5284-regulusmon-shared-opt", {
    autoAcceptOptional: true,
    autoSelectCards: true,
  });
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: "dev-perm-0-github-regulus-base",
      instanceId: "github-regulus",
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT10-094"));
  await idle();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: "dev-perm-0-github-regulus-base",
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((event) => event.kind === "attackEnded"));
  await settle(() => !observe(s.engine).isAttacking());
  await idle();
  expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT10-094")).toHaveLength(1);
  expect(s.state.players[0]!.hand.filter((card) => card.cardId === "BT10-094")).toHaveLength(1);
  await finish();
});

it("GitHub #5279 arena: Millenniummon can select and delete itself after De-Digivolve", async () => {
  const { s, idle, finish } = await launch("arena-github-5279-millenniummon-self-delete", {
    autoAcceptOptional: true,
    autoSelectCards: true,
    preferInstanceIds: ["github-millennium"],
  });
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "github-millennium" })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === "github-millennium"));
  await idle();
  const deletion = s.decisions.filter(({ req }) => req.kind === "chooseTargets").at(-1)!.req;
  expect(deletion.options?.candidateInstanceIds).toHaveLength(2);
  expect(s.state.players[0]!.battleArea).toHaveLength(0);
  expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-010");
  await finish();
});

it("GitHub #5267 arena: Omnimon bottom-decks the zero-source card and separately deletes the three-source Gallantmon", async () => {
  const { s, idle, finish } = await launch("arena-github-5267-omnimon-source-count", {
    autoAcceptOptional: true,
    autoSelectCards: true,
  });
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "github-omnimon" })).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.battleArea.length === 0);
  await idle();
  const opponent = s.state.players[1]!;
  expect(opponent.deck.some((card) => card.instanceId === "dev-field-1-github-bottom-deck")).toBe(true);
  expect(opponent.deck.some((card) => card.instanceId === "dev-field-1-github-gallant")).toBe(false);
  expect(opponent.trash.some((card) => card.instanceId === "dev-field-1-github-gallant")).toBe(true);
  await finish();
});
