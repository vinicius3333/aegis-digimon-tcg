import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-020 Greymon", () => {
  it("has Rush and grants inherited Reboot only to its evolution host", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-020", as: "greymon" },
      { card: "BT19-025", as: "host", under: ["BT19-020"] },
      { card: "BT19-025", as: "plain" },
    ] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("greymon"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Reboot")).toBe(false);
  });

  it("plays Kiriha with no existing Tamer, then Saves under the newly played Tamer (Q3076)", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-020", as: "greymon" }],
      hand: [{ card: "BT19-081", as: "kiriha" }],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("greymon").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-081" && p.stack.length === 1));
    const kiriha = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT19-081")!;
    expect(kiriha.stack.map((card) => card.cardId)).toEqual(["BT19-020"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT19-020")).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("with more than 1 Tamer, skips Kiriha play but still Saves (Q4714)", async () => {
    const s = setupEngine({ 0: {
      battleArea: [
        { card: "BT19-020", as: "greymon" },
        { card: "BT19-081", as: "first" }, { card: "BT19-079", as: "second" },
      ],
      hand: [{ card: "BT19-081", as: "handKiriha" }],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).verb.deletePermanent([s.perm("greymon").permanentId]);
    await settle(() => s.perm("first").stack.length + s.perm("second").stack.length === 1);
    expect([...s.perm("first").stack, ...s.perm("second").stack].map((card) => card.cardId)).toEqual(["BT19-020"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-081"]);
  });

  it("may decline the eligible Kiriha play and still Saves under an existing Tamer", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-020", as: "greymon" }, { card: "BT19-081", as: "tamer" },
    ], hand: [{ card: "BT19-081", as: "handKiriha" }] } }, { autoDeclineOptional: true, autoSelectCards: true });
    await advance(s.engine).verb.deletePermanent([s.perm("greymon").permanentId]);
    await settle(() => s.perm("tamer").stack.length === 1);
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-020"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-081"]);
  });
});
