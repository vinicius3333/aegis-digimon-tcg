import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-004.js";

describe("BT17-004", () => {
  it("grants inherited Blocker to Argomon during the opponent's turn", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OpponentsTurn", isInherited: true, actions: [{ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Blocker" } }, while: { kind: "selfHasName" } }] });
  });
});
