import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-043.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-043 LoaderLeomon", () => {
  it("registers Barrier both as a printed and inherited keyword", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [expect.objectContaining({ keyword: "Barrier" })],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [expect.objectContaining({ keyword: "Barrier" })],
    });
  });

  it("exposes Barrier on the live LoaderLeomon permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-043", as: "loader" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("loader"), "Barrier")).toBe(true);
  });

  it("printed Barrier pays the exact top security card and prevents deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-043", as: "loader" }],
        security: [{ card: "BT1-001", as: "top-security" }],
      },
    });
    await s.ready();
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("loader").permanentId]);
    await settle(() => s.events.some(({ kind }) => kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(0, { type: "respondBarrier", permanentId: s.perm("loader").permanentId, accept: true }),
    ).toEqual({ ok: true });
    await deletion;
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("top-security").instanceId)).toBe(
      true,
    );
  });

  it("declining printed Barrier deletes LoaderLeomon and preserves security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-043", as: "loader" }], security: ["BT1-001"] },
    });
    await s.ready();
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("loader").permanentId]);
    await settle(() => s.events.some(({ kind }) => kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(0, { type: "respondBarrier", permanentId: s.perm("loader").permanentId, accept: false }),
    ).toEqual({ ok: true });
    await deletion;
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("exposes and resolves inherited Barrier on an evolved host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-045", as: "host", under: ["BT13-043"] }],
        security: ["BT1-001"],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.events.some(({ kind }) => kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(0, { type: "respondBarrier", permanentId: s.perm("host").permanentId, accept: true }),
    ).toEqual({ ok: true });
    await deletion;
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("with no security, Barrier cannot prevent deletion", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-043", as: "loader" }] } });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("loader").permanentId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.events.some(({ kind }) => kind === "barrierPrompt")).toBe(false);
  });

  it("digivolves from a yellow level 4 for exactly 3 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-038", as: "base" }], hand: [{ card: "BT13-043", as: "loader" }] },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("loader").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-043");
    expect(s.state.memory).toBe(1);
  });
});
