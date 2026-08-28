import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-022.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-022 ShogunGekomon", () => {
  it("suspends one opposing Digimon/Tamer on play", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Suspend",
      target: { count: 1, filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
    }));
  it("restricts all of your NSp Digimon from changing attack targets on your turn", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "attackTargetChange",
      duration: "whileInPlay",
      target: { count: "all", filter: { controller: "mine" } },
    }));

  it("suspends one opposing Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-022", as: "shogun" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shogun"));
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
