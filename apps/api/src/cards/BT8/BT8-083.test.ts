import type { CompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { registerIrCard } from "../../engine/effects/interpreter.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-083.js";
import { compiled as vanillaMonodramon } from "../BT1/BT1-009.js";

describe("BT8-083 MaloMyotismon", () => {
  it("with five Myotismon in trash, deletes an unsuspended Digimon and trashes opponent security", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT8-083", as: "source" }],
          deck: ["BT8-034"],
          trash: ["BT8-080", "BT8-080", "BT8-080", "BT8-080", "BT8-080"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "target" }],
          security: [{ card: "BT8-071", as: "securityTop" }],
          deck: ["BT8-034"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 13;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-083") &&
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[1]!.security.length === 0,
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("when digivolving, trashes exactly five cards and gains memory if one is Myotismon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-080", as: "base" }],
          hand: [{ card: "BT8-083", as: "source" }],
          deck: ["BT1-009", "BT8-080", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-083"));
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT8-080")).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("does not resolve either On Play branch with only four Myotismon cards in trash", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT8-083", as: "source" }], trash: ["BT8-080", "BT8-080", "BT8-080", "BT8-080"] },
        1: { battleArea: [{ card: "BT8-070", as: "target" }], security: [{ card: "BT8-071", as: "securityTop" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 13;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await drainMicrotasks();
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT8-083")).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});

describe("BT8-083 MaloMyotismon — KB Q&A rulings", () => {
  it("still trashes the security card after a would-leave effect removes MaloMyotismon mid-resolution (Q5975)", async () => {
    const bounceMaloMyotismonWhenLeaving: CompiledCard = {
      effects: [
        {
          trigger: "AllTurns",
          actions: [
            {
              kind: "Replacement",
              event: "wouldLeavePlay",
              sourceFilter: { isSelfRef: true },
              actions: [
                {
                  kind: "Return",
                  target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
                  to: "hand",
                },
              ],
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    };
    registerIrCard("BT1-009", bounceMaloMyotismonWhenLeaving);
    try {
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "BT8-083", as: "maloMyotismon" }],
            trash: ["BT8-080", "BT8-080", "BT8-080", "BT8-080", "BT8-080"],
          },
          1: {
            battleArea: [{ card: "BT1-009", as: "victim" }],
            security: [{ card: "BT8-071", as: "securityTop" }],
          },
        },
        { autoSelectCards: true, autoAcceptOptional: true },
      );
      s.state.memory = 13;
      const maloMyotismonId = s.inst("maloMyotismon").instanceId;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: maloMyotismonId })).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.length === 0);
      await drainMicrotasks();

      expect(s.state.players[0]!.battleArea).toHaveLength(0);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(maloMyotismonId);
      expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
        expect.arrayContaining([s.inst("victim").instanceId, s.inst("securityTop").instanceId]),
      );
      expect(s.state.players[1]!.security).toHaveLength(0);

      const moveIndexOf = (instanceId: string) =>
        s.events.findIndex((event) => event.kind === "cardsMoved" && event.instanceIds.includes(instanceId));
      expect(moveIndexOf(maloMyotismonId)).toBeGreaterThan(-1);
      expect(moveIndexOf(maloMyotismonId)).toBeLessThan(moveIndexOf(s.inst("securityTop").instanceId));
    } finally {
      registerIrCard("BT1-009", vanillaMonodramon);
    }
  });
});
