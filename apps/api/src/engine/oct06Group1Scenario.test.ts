import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario, type DevScenarioId } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";
import { setupEngine, settle } from "./testkit/harness.js";

async function staged(slug: string, breeding = false, accept = false) {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoDeclineOptional: !accept,
      autoAcceptOptional: accept,
      autoSelectCards: true,
      autoChooseOption: true,
      autoOrderTriggers: true,
    },
  );
  const id = `arena-issue-${slug}` as DevScenarioId;
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  const result = breeding ? undefined : s.engine.applyIntent(0, { type: "endPhase" });
  expect(result).toEqual(breeding ? undefined : { ok: true });
  if (!breeding) {
    await advance(s.engine).waitForMainPhase(0);
  }
  return { s, loop, id };
}

const ASSEMBLY = [
  ["5125-ulforce-gold", "EX13-023", 3, 7],
  ["5128-craniamon", "EX13-062", 3, 7],
  ["5145-slayerdramon", "EX13-024", 3, 7],
  ["5146-breakdramon", "EX13-044", 3, 7],
  ["5140-merciful", "EX13-077", 6, 8],
  ["5154-dantemon", "BT26-086", 7, 7],
  ["5156-giant-slayer", "BT26-085", 5, 7],
] as const;

describe("October 6 GitHub group 1 playable scenarios", () => {
  it.each(ASSEMBLY)("#%s consumes exactly the printed materials for %s", async (slug, card, count, cost) => {
    const { s, loop, id } = await staged(slug);
    const human = s.state.players[0]!;
    const materials = human.trash.map(({ instanceId }) => instanceId);
    expect(materials).toHaveLength(count);
    // A partial declaration must neither spend memory nor consume materials.
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: `${id}-0-hand-0`,
        assembly: { materialInstanceIds: materials.slice(1) },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.state.memory).toBe(10);
    expect(human.trash).toHaveLength(count);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: `${id}-0-hand-0`,
        assembly: { materialInstanceIds: materials },
      }),
    ).toEqual({ ok: true });
    await settle(() => human.battleArea.some(({ topCard }) => topCard.cardId === card) && !s.state.pendingDecision);
    expect(
      human.battleArea
        .find(({ topCard }) => topCard.cardId === card)!
        .stack.map(({ instanceId }) => instanceId)
        .sort(),
    ).toEqual([...materials].sort());
    expect(human.trash).toHaveLength(0);
    expect(s.state.memory).toBe(10 - cost);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each(["5122-ulforce-bt13", "5125-ulforce-bt11"])(
    "#%s does not invent Assembly on an older Ulforce",
    async (slug) => {
      const { s, loop, id } = await staged(slug);
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: `${id}-0-hand-0`,
          assembly: { materialInstanceIds: s.state.players[0]!.trash.map(({ instanceId }) => instanceId) },
        }),
      ).toEqual({ ok: false, reason: "not-assembly" });
      expect(s.state.memory).toBe(10);
      expect(s.state.players[0]!.trash).toHaveLength(3);
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    },
  );

  it("#5161 moves Larva and opens Main with its deletion protection active", async () => {
    const { s, loop } = await staged("5161-larva-breeding", true);
    const larva = s.state.players[0]!.breeding!;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: larva.permanentId })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.battleArea).toContain(larva);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each(["5129-hyogamon-trash", "5129-goblimon-trash"])(
    "#%s evolves only its inherited host from trash after a public hand discard",
    async (slug) => {
      const { s, loop, id } = await staged(slug, false, true);
      const host = s.state.players[0]!.battleArea[0]!;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: `${id}-0-hand-0` })).toEqual({ ok: true });
      await settle(() => host.topCard.cardId === "P-209" && !s.state.pendingDecision);
      expect(host.stack.map(({ cardId }) => cardId)).toEqual([
        slug.includes("hyogamon") ? "BT24-026" : "BT24-042",
        "BT24-072",
      ]);
      expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === `${id}-0-trash-0`)).toBe(false);
      expect(s.state.memory).toBe(4);
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    },
  );

  it("#5115 activates the battle-area emblem to evolve a trash LIBERATOR", async () => {
    const { s, loop, id } = await staged("5115-melting-trash", false, true);
    const host = s.state.players[0]!.battleArea[1]!;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: `${id}-0-hand-0` })).toEqual({ ok: true });
    await settle(() => host.topCard.cardId === "BT19-053" && !s.state.pendingDecision);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT19-053", "P-232"]);
    expect(s.state.memory).toBe(5);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("#5104 plays both source cards after a public attack without a softlock", async () => {
    const { s, loop } = await staged("5104-alter-s-sources", false, true);
    const host = s.state.players[0]!.battleArea[0]!;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.security[0]?.cardId === "EX9-021" &&
        !s.state.pendingDecision &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(["AD1-001", "AD1-010"]);
    expect(s.state.players[1]!.security).toHaveLength(4);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
