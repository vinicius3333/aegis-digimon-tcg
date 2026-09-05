import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-072.js";
import "../BT10/BT10-022.js";
import "./EX1-047.js";

describe("EX1-047 Guardromon", () => {
  it("has Blocker and can't attack on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-047", as: "guardromon" }] }, 1: { security: ["BT1-001"] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("guardromon"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("guardromon").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
  });

  it("trashes a Machine card to draw 2 through its inherited attack effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-022", as: "host", under: ["BT10-058", "EX1-047"] }],
          hand: [{ card: "BT1-068", as: "machine" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("machine").instanceId)).toBe(true);
  });

  it("honors refusal and leaves an eligible Machine in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-022", as: "host", under: ["BT10-058", "EX1-047"] }],
          hand: [{ card: "BT1-068", as: "machine" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-047"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("machine").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("machine").instanceId)).toBe(false);
  });

  it("does not accept a non-Machine/Cyborg Digimon as the inherited cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-022", as: "host", under: ["BT10-058", "EX1-047"] }],
          hand: [{ card: "BT1-009", as: "wrongTrait" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-047"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("wrongTrait").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("wrongTrait").instanceId)).toBe(false);
  });

  it("resolves a real public Blocker response for the legal black-to-blue stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-022", as: "host", under: ["BT10-058", "EX1-047"] }],
          hand: [{ card: "BT1-024", as: "cyborg" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-072", as: "blocker" }],
          security: ["BT1-001", "BT1-001"],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cyborg").instanceId)).toBe(true);
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(true);
  });
});
