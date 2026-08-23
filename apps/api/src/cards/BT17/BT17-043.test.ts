import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-043.js";
import "./index.js";

describe("BT17-043 Terriermon", () => {
  it("triggers once per turn from Terriermon/Lopmon or any green Tamer played by an effect", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({ frequency: "OncePerTurn" });
    expect(effect!.actions[0]).toMatchObject({
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        byEffect: true,
        orFilters: [
          { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Terriermon", "Lopmon"], match: "name" }] },
          { kind: ["Tamer"], colors: ["Green"] },
        ],
      },
    });
  });

  it("gains 1000 DP while suspended as an inherited effect", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfIsSuspended" } }],
    });
  });

  it("suspends an opponent only when an effect plays the qualifying Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-043", as: "terriermon" },
            { card: "BT17-044", as: "playedLopmon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-020", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const payload = { subjectPermanentId: s.perm("playedLopmon").permanentId };

    await advance(s.engine).fireSubTrigger("whenPlayed", payload);
    expect(s.perm("target").isSuspended).toBe(false);

    await advance(s.engine).fireSubTrigger("whenPlayed", { ...payload, playedByEffect: true });
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("grants inherited DP only while the host is suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-046", dp: 6000, under: ["BT17-043"], as: "host" }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);

    s.perm("host").isSuspended = true;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(7000);
  });
});
