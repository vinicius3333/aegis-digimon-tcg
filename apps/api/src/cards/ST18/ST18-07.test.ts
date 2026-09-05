import { describe, expect, it } from "vitest";
import { compiled } from "./ST18-07.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST18-07 Kokatorimon", () => {
  it("has Blocker itself and publishes Piercing as an inherited keyword", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST18-07", as: "blocker" },
          { card: "ST18-09", as: "host", under: ["ST18-07"] },
        ],
      },
    });

    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("blocker"), "Blocker")).toBe(true);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        isInherited: true,
        keywords: [expect.objectContaining({ keyword: "Piercing" })],
      }),
    );
  });

  it("uses inherited Piercing after winning a battle and does not grant it standalone", async () => {
    const standalone = setupEngine({ 0: { battleArea: [{ card: "ST18-07", as: "standalone" }] } });
    await standalone.ready();
    expect(observe(standalone.engine).hasPierce(standalone.perm("standalone"))).toBe(false);

    const s = setupEngine({
      0: { battleArea: [{ card: "ST1-10", as: "host", under: ["ST18-07"] }] },
      1: { battleArea: [{ card: "BT1-010", dp: 3000, as: "target", suspended: true }], security: ["BT1-011"] },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
