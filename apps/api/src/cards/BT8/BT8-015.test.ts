import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-015.js";
import "./BT8-020.js";

describe("BT8-015 Silphymon", () => {
  it("gives -5000 DP but does not execute the DNA-only deletion after a normal digivolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-001", as: "base" }], hand: [{ card: "BT8-015", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-047", as: "target", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-015"));
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("normally digivolves from a yellow level-4 Digimon for 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-039", as: "yellowBase" }],
          hand: [{ card: "BT8-015", as: "silphymon" }],
        },
        1: { battleArea: [{ card: "BT2-047", as: "target", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowBase").permanentId,
        instanceId: s.inst("silphymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("yellowBase").topCard.instanceId).toBe(s.inst("silphymon").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("does not inherit deletion against a Digimon with 5001 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-017", as: "host", under: ["BT8-015"] }] },
        1: { security: ["BT8-034"], battleArea: [{ card: "BT8-023", as: "target", dp: 5001 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("executes the DNA-only deletion after a legal red/yellow DNA digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-010", as: "redMaterial", under: ["BT8-020"] },
            { card: "BT8-036", as: "yellowMaterial" },
          ],
          hand: [{ card: "BT8-015", as: "silphymon" }],
        },
        1: {
          battleArea: [
            { card: "BT8-004", as: "eligible" },
            { card: "BT8-032", as: "peer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const eligibleId = s.perm("eligible").permanentId;
    const peerId = s.perm("peer").permanentId;

    await advance(s.engine).fireForInstance(
      EffectTiming.OnEndTurn,
      s.perm("redMaterial").stack.find((card) => card.cardId === "BT8-020")!,
    );
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("silphymon").instanceId),
    );

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === eligibleId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === peerId)).toBe(true);
  });
});
