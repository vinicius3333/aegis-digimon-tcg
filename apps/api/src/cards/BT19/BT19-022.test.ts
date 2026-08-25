import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-022 MailBirdramon", () => {
  it("has Blocker and grants inherited Blocker only to its evolution host", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-022", as: "mail" },
      { card: "BT19-025", as: "host", under: ["BT19-022"] },
      { card: "BT19-025", as: "plain" },
    ] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("mail"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Blocker")).toBe(false);
  });

  it("on deletion places one Blue Flare Digimon from trash, then Saves itself", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-022", as: "mail" }, { card: "BT19-081", as: "tamer" }],
      trash: [{ card: "BT19-016", as: "blueFlare" }, { card: "BT19-009", as: "nonmatching" }],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).verb.deletePermanent([s.perm("mail").permanentId]);
    await settle(() => s.perm("tamer").stack.length === 2);
    expect(s.perm("tamer").stack.map((card) => card.cardId).sort()).toEqual(["BT19-016", "BT19-022"].sort());
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-009"]);
  });

  it("still Saves when no qualifying Blue Flare card exists in trash", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-022", as: "mail" }, { card: "BT19-081", as: "tamer" }],
      hand: [{ card: "BT19-016", as: "wrongZone" }],
      trash: [{ card: "BT19-009", as: "nonmatching" }],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).verb.deletePermanent([s.perm("mail").permanentId]);
    await settle(() => s.perm("tamer").stack.length === 1);
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-022"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-016"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-009"]);
  });
});
