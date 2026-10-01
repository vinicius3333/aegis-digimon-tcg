import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST3-04.js";
import "./ST3-11.js";

describe("ST3-04 Patamon", () => {
  it("gains 1 memory when an opponent is deleted at 0 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST3-11", under: ["ST3-04"], as: "host" }] },
        1: { battleArea: [{ card: "ST3-02", as: "victim" }], security: ["ST3-02"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.memory === 2);
    expect(s.state.memory).toBe(2);
  });

  it("gains 1 memory independently for each inherited copy", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST3-11", under: ["ST3-04"], as: "attacker" },
            { card: "ST3-09", under: ["ST3-04"], as: "otherHost" },
          ],
        },
        1: { battleArea: [{ card: "ST3-02", as: "victim" }], security: ["ST3-02"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });

  it("does not gain memory when the opposing Digimon is deleted by an effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST3-11", under: ["ST3-04"], as: "host" }] },
      1: { battleArea: ["ST3-02"] },
    });
    s.state.memory = 1;
    await s.ready();
    const victim = s.state.players[1]!.battleArea[0]!;
    await advance(s.engine).verb.deletePermanent([victim.permanentId], "byEffect");
    expect(s.state.memory).toBe(1);
  });
});

describe("ST3-04 Patamon — KB Q&A rulings", () => {
  it("activates for every Digimon that has it as a digivolution card when an opponent's Digimon drops to 0 DP (Q631)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST3-11", under: ["ST3-04"], as: "attacker" },
            { card: "ST3-09", under: ["ST3-04"], as: "secondHost" },
            { card: "ST3-02", under: ["ST3-04"], as: "thirdHost" },
            { card: "ST3-09", as: "withoutPatamon" },
          ],
        },
        1: { battleArea: [{ card: "ST3-02", as: "victim" }], security: ["ST3-02"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.memory === 3);
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.memory).toBe(3);
    expect(s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "ST3-04")).toHaveLength(
      3,
    );
  });
});
