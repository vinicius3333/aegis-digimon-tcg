import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-004.js";

describe("BT17-004", () => {
  it("grants inherited Blocker to Argomon during the opponent's turn", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      actions: [
        { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Blocker" } }, while: { kind: "selfHasName" } },
      ],
    });
  });

  it("makes an Argomon host a Blocker only while it is the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-042", as: "host", under: ["BT17-004"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);

    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("does not grant Blocker to a non-Argomon host during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-043", as: "host", under: ["BT17-004"] }] } });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
  });
});
