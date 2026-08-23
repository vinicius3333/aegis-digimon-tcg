import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-066.js";

describe("EX11-066 Xeno", () => {
  it("accepts a card with Vemmon in its text for the start-phase cost", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-066", as: "xeno" }], hand: ["P-244"], deck: ["BT1-001"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("xeno"));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "P-244")).toBe(true);
  });

  it("gains the memory without asking, since only the trash cost is optional", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-066", as: "xeno" }], hand: ["P-244"], deck: ["BT1-001"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("xeno"));
    expect(s.state.memory).toBe(1);
    const optionalPrompts = s.decisions.filter((d) => d.req.kind === "optional");
    expect(optionalPrompts).toHaveLength(1);
  });

  it("asks before suspending for the [All Turns] clause and skips it when declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-066", as: "xeno" },
            { card: "BT11-061", as: "vemmon" },
          ],
          deck: ["BT11-061", "BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("vemmon").permanentId });

    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    expect(s.perm("xeno").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.perm("vemmon").stack).toHaveLength(0);
  });

  it("suspends and places the revealed Vemmon cards when accepted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-066", as: "xeno" },
            { card: "BT11-061", as: "vemmon" },
          ],
          deck: ["BT11-061", "BT1-001"],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("vemmon").permanentId });
    await settle(() => s.perm("xeno").isSuspended);

    expect(s.perm("xeno").isSuspended).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(Array.from(s.perm("vemmon").stack, (card) => card.cardId)).toContain("BT11-061");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
  });
});
