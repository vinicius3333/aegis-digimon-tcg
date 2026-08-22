import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-020 Greymon", () => {
  it("saves itself under a Tamer when the conditional play is declined", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-020", as: "greymon" }, { card: "BT19-081", as: "tamer" }] },
    }, { autoDeclineOptional: true });

    await advance(s.engine).verb.deletePermanent([s.perm("greymon").permanentId]);
    await settle(() => s.perm("tamer").stack.some((card) => card.cardId === "BT19-020"));

    expect(s.perm("tamer").stack.some((card) => card.cardId === "BT19-020")).toBe(true);
  });
});
