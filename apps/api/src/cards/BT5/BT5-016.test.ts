import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT5-016.js";
import "./BT5-062.js";

describe("BT5-016 WarGreymon", () => {
  it("is registered with complete, residual-free runtime coverage", () => {
    expect(getEffectModule("BT5-016")).toBeDefined();
    expect(runtimeCompiledCard("BT5-016")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("deletes a Blocker with a qualifying Greymon source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-015", as: "base" }], hand: [{ card: "BT5-016", as: "evolving" }] },
        1: { battleArea: ["BT5-062"] },
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
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not delete a non-Blocker even when a qualifying Greymon source is present", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-015", as: "base" }], hand: [{ card: "BT5-016", as: "evolving" }] },
        1: { battleArea: [{ card: "BT5-059", as: "target", dp: 2000 }] },
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
    await settle(() => s.perm("base").topCard.cardId === "BT5-016");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("its inherited When Attacking deletes a 3000-DP-or-less opponent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-019", as: "host", under: ["BT5-016"] }] },
        1: { battleArea: [{ card: "BT5-059", as: "target", dp: 3000 }], security: ["BT5-001"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not delete an opponent above 3000 DP with its inherited effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-019", as: "host", under: ["BT5-016"] }] },
        1: { battleArea: [{ card: "BT5-059", as: "target", dp: 3001 }] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it.each([
    ["DoruGreymon", "BT7-064"],
    ["BurningGreymon", "BT4-013"],
    ["DexDoruGreymon", "BT9-078"],
  ])("does not use excluded %s source to delete a Blocker", async (_name, sourceCard) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-016", as: "warGreymon", under: [sourceCard] }] },
        1: { battleArea: ["BT5-062"] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("warGreymon"));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
