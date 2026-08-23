import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-065.js";

describe("EX11-065 Close", () => {
  it("trashes a Mineral card from a digivolution stack to gain memory", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-065", as: "close" }], hand: ["EX8-051"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("close"));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX8-051")).toBe(true);
  });

  it("suspends to place a Mineral or Rock card under a played Mineral Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-061", as: "gotsumon" },
            { card: "EX11-065", as: "close" },
          ],
          hand: ["EX8-051"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("gotsumon").permanentId });
    await settle(() => s.perm("close").isSuspended);

    expect(s.perm("close").isSuspended).toBe(true);
    expect(s.perm("gotsumon").stack.some((card) => card.cardId === "EX8-051")).toBe(true);
  });

  it("leaves Close unsuspended and places nothing when the suspend cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-061", as: "gotsumon" },
            { card: "EX11-065", as: "close" },
          ],
          hand: ["EX8-051"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("gotsumon").permanentId });
    await settle(() => false, 30);

    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    expect(s.perm("close").isSuspended).toBe(false);
    expect(s.perm("gotsumon").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX8-051")).toBe(true);
  });
});
