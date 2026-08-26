import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-058 SkullKnightmon", () => {
  it("has printed Blocker and gives a host Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-058", as: "skull" }, { card: "BT19-059", as: "host", under: ["BT19-058"] },
    ] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("skull"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("Save moves deleted SkullKnightmon beneath a controller Tamer", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-058", as: "skull" }, { card: "BT19-083", as: "tamer" },
    ] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("skull").permanentId], "byEffect");
    await settle(() => s.perm("tamer").stack.some((card) => card.cardId === "BT19-058"));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT19-058")).toBe(false);
  });
});
