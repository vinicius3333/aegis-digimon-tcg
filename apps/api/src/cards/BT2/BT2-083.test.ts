import type { PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-083.js";

describe("BT2-083 Millenniummon", () => {
  it("returns an opposing Digimon to deck bottom and trashes its sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-066", as: "base" }], hand: [{ card: "BT2-083", as: "evolving" }] },
        1: { deck: ["BT1-010"], battleArea: [{ card: "BT2-020", under: ["BT2-013"], as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.battleArea.length === 0);
    expect(opponent.deck.at(-1)?.cardId).toBe("BT2-020");
    expect(opponent.trash.some((card) => card.cardId === "BT2-013")).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT2-083");
  });

  it("may play itself from trash after being deleted with digivolution cards", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT2-083", as: "millenniummon", under: ["BT2-060", "BT2-066"] }] } },
      { autoAcceptOptional: true },
    );
    const instanceId = s.perm("millenniummon").topCard!.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("millenniummon").permanentId], "byEffect");
    const replayed = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === instanceId);
    expect(replayed).toBeDefined();
    expect(replayed!.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT2-060", "BT2-066"]),
    );
  });

  it("stays in trash when deleted without digivolution cards", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT2-083", as: "millenniummon" }] } },
      { autoAcceptOptional: true },
    );
    const instanceId = s.perm("millenniummon").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("millenniummon").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === instanceId)).toBe(true);
  });

  it("may decline the self-play even when it had digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-083", as: "millenniummon", under: ["BT2-066"] }],
        },
      },
      { autoDeclineOptional: true },
    );
    const instanceId = s.perm("millenniummon").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("millenniummon").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT2-066")).toBe(true);
  });
});

describe("BT2-083 Millenniummon — KB Q&A rulings", () => {
  it("returns only Millenniummon to play from trash while its former digivolution cards stay in the trash (Q1035)", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT2-083", as: "millenniummon", under: ["BT2-060", "BT2-066"] }] } },
      { autoAcceptOptional: true },
    );
    const player = s.state.players[0] as PlayerState;
    const millenniummonId = s.perm("millenniummon").topCard.instanceId;
    const sourceIds = s.perm("millenniummon").stack.map((card) => card.instanceId);

    await advance(s.engine).verb.deletePermanent([s.perm("millenniummon").permanentId], "byEffect");

    expect(player.battleArea).toHaveLength(1);
    const replayed = player.battleArea[0]!;
    expect(replayed.topCard.instanceId).toBe(millenniummonId);
    expect(replayed.stack).toHaveLength(0);
    expect(player.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(sourceIds));
    expect(player.trash.some((card) => card.instanceId === millenniummonId)).toBe(false);
  });
});
