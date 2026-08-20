import { describe, expect, it, vi } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD_ID = "BT26-078";

describe("BT26-078 Cherubimon", () => {
  it("legally digivolves from a level 5 TS Digimon, deletes its new stack, and plays an eligible card newly put in trash", async () => {
    // BT26-015 is red/yellow, so Cherubimon's ordinary purple/green requirement cannot
    // apply. It is legal only through the printed Lv.5 [TS] alternate requirement. It
    // qualifies for the following trash play through [Chronomon] in its inherited text,
    // which is the Q7105 boundary this scenario proves.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-015", as: "butenmon" }],
          hand: [{ card: CARD_ID, as: "cherubimon" }],
          deck: ["AD1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const cherubimonId = s.inst("cherubimon").instanceId;
    const butenmonId = s.perm("butenmon").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("butenmon").permanentId,
        instanceId: cherubimonId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === butenmonId) &&
        s.state.players[0]!.trash.some((card) => card.instanceId === cherubimonId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([butenmonId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(cherubimonId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(butenmonId);
  });

  it("may decline the delete cost and leaves the evolved stack intact", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-015", as: "butenmon" }],
          hand: [{ card: CARD_ID, as: "cherubimon" }],
          deck: ["AD1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    const cherubimonId = s.inst("cherubimon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("butenmon").permanentId,
        instanceId: cherubimonId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("butenmon").topCard?.instanceId === cherubimonId);

    expect(s.perm("butenmon").topCard?.instanceId).toBe(cherubimonId);
    expect(s.perm("butenmon").stack.map((card) => card.cardId)).toEqual(["BT26-015"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("does not play a trash card when deletion prevention stops the by-deleting cost", async () => {
    const playInstances = vi.fn(async () => []);
    const source = {
      instanceId: "cherubimon-source",
      cardId: CARD_ID,
      ownerSeat: 0,
      permanent: () => ({ permanentId: "cherubimon-permanent" }),
      isOnBattleArea: () => true,
    } as any;
    const effect = getEffectModule(CARD_ID)!
      .effectsForTiming(EffectTiming.OnPlay, source)
      .find((candidate) => candidate.effectKey === `${CARD_ID}/on-play-delete-to-play-from-trash`)!;
    const ctx = {
      source,
      trigger: {},
      game: {
        player: () => ({ trash: [{ instanceId: "eligible", cardId: "BT26-021" }] }),
        definitionOf: () => ({ playCost: 4, types: ["Titan"], nameEn: "Gekomon" }),
      },
      ask: {
        optional: vi.fn(async () => true),
        selectCards: vi.fn(async () => ["eligible"]),
      },
      fx: {
        deletePermanent: vi.fn(async () => 0),
        playInstances,
      },
    } as any;

    await effect.resolve(ctx);

    expect(playInstances).not.toHaveBeenCalled();
    expect(ctx.ask.selectCards).not.toHaveBeenCalled();
  });

  it("from trash, pays its bottom-deck cost and grants Rush and Execute at the exact opponent-memory boundary", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-021", as: "titan" }],
          trash: [{ card: CARD_ID, as: "cherubimonTrash" }],
          deck: [{ card: "AD1-001", as: "existingDeckBottom" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -5;
    const cherubimonId = s.inst("cherubimonTrash").instanceId;
    const titanId = s.inst("titan").instanceId;
    await s.ready();

    // No public intent is needed to prove the reaction itself; effect-driven play uses the
    // same production On Play + whenPlayed seams as a paid hand play.
    await advance(s.engine).verb.playInstances([titanId]);
    await settle(() => s.state.players[0]!.deck.some((card) => card.instanceId === cherubimonId));

    const titan = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === titanId)!;
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(cherubimonId);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(cherubimonId);
    expect(observe(s.engine).hasKeyword(titan, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(titan, "Execute")).toBe(true);
  });

  it("does not pay the trash cost or grant keywords when the opponent has only 4 memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-021", as: "titan" }],
          trash: [{ card: CARD_ID, as: "cherubimonTrash" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -4;
    const cherubimonId = s.inst("cherubimonTrash").instanceId;
    const titanId = s.inst("titan").instanceId;
    await s.ready();

    await advance(s.engine).verb.playInstances([titanId]);
    await settle();

    const titan = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === titanId)!;
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(cherubimonId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).not.toContain(cherubimonId);
    expect(observe(s.engine).hasKeyword(titan, "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(titan, "Execute")).toBe(false);
  });

  it("does not arm its [Trash][Your Turn] reaction during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-021", as: "titan" }],
          trash: [{ card: CARD_ID, as: "cherubimonTrash" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 5;
    const cherubimonId = s.inst("cherubimonTrash").instanceId;
    const titanId = s.inst("titan").instanceId;
    await s.ready();

    await advance(s.engine).verb.playInstances([titanId]);
    await settle();

    const titan = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === titanId)!;
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(cherubimonId);
    expect(observe(s.engine).hasKeyword(titan, "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(titan, "Execute")).toBe(false);
  });

  it("ignores a played nonmatching Digimon even when the opponent has 5 memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "AD1-001", as: "nonmatching" }],
          trash: [{ card: CARD_ID, as: "cherubimonTrash" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -5;
    const cherubimonId = s.inst("cherubimonTrash").instanceId;
    const nonmatchingId = s.inst("nonmatching").instanceId;
    await s.ready();

    await advance(s.engine).verb.playInstances([nonmatchingId]);
    await settle();

    const nonmatching = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === nonmatchingId,
    )!;
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(cherubimonId);
    expect(observe(s.engine).hasKeyword(nonmatching, "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(nonmatching, "Execute")).toBe(false);
  });

  it("also exposes the shared clause at On Play and permits declining it", async () => {
    // This guards the adjacent timing tags: neither trigger may silently disappear.
    const s = setupEngine(
      { 0: { battleArea: [{ card: CARD_ID, as: "cherubimon" }] } },
      { autoDeclineOptional: true },
    );
    const source = s.perm("cherubimon").topCard!;
    // Behavioral coverage above drives When Digivolving. Drive On Play here through its
    // actual timing with a declined optional prompt and assert the source remains.
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("cherubimon"));
    expect(s.perm("cherubimon").topCard?.instanceId).toBe(source.instanceId);
  });
});
