import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-022.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX7-022 ShogunGekomon", () => {
  it("prevents one opposing Digimon/Tamer from suspending until their turn ends", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "suspend",
      target: { count: 1, filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
    }));
  it("restricts all of your NSp Digimon from changing attack targets on your turn", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "attackTargetChange",
      duration: "whileInPlay",
      target: { count: "all", filter: { controller: "mine" } },
    }));

  it("prevents one opposing Digimon from suspending on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-022", as: "shogun" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shogun"));
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "suspend"));
    expect(observe(s.engine).isRestricted(s.perm("target"), "suspend")).toBe(true);
    await advance(s.engine).verb.suspend([s.perm("target").permanentId]);
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("restricts only your NSp Digimon from changing attack targets", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX7-022", as: "shogun" },
          { card: "EX7-018", as: "nsp" },
          { card: "BT1-009", as: "other" },
        ],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("shogun"), "attackTargetChange")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("nsp"), "attackTargetChange")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("other"), "attackTargetChange")).toBe(false);
  });
});
