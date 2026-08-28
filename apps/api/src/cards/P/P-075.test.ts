import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-083.js";
import "./P-075.js";

describe("P-075 Okuwamon", () => {
  it("grants each current opponent Digimon one independent lose-memory watcher after evolving into Insectoid", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "P-075", as: "okuwamon" }],
        hand: [{ card: "BT1-083", as: "granKuwagamon" }],
        deck: ["BT1-001"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-010", as: "second" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      advance(s.engine).ledgers.subTriggers.subscriptionsFor(
        "whenOneOfYoursDigivolves",
        s.perm("okuwamon").permanentId,
      ),
    ).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("okuwamon").permanentId,
        instanceId: s.inst("granKuwagamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("okuwamon").topCard.cardId === "BT1-083" &&
        advance(s.engine).ledgers.subTriggers.subscriptionsFor("whenSuspended", s.perm("first").permanentId).length ===
          1,
      2_000,
    );
    const memoryAfterDigivolve = s.state.memory;

    await advance(s.engine).verb.suspend([s.perm("first").permanentId]);
    await settle(() => s.state.memory === memoryAfterDigivolve + 1, 2_000);

    // The opponent's Digimon is the watcher source, so losing 1 from its controller's
    // perspective moves the shared gauge 1 toward Okuwamon's controller.
    expect(s.state.memory).toBe(memoryAfterDigivolve + 1);
    expect(s.perm("second").isSuspended).toBe(false);
  });

  it("does not grant the watcher merely because Okuwamon is sitting on the field", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-075", as: "okuwamon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    await settle();

    expect(s.state.memory).toBe(0);
  });

  it("grants Piercing to an Insectoid host through its inherited effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-083", as: "host", under: ["P-075"] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
  });

  it("does not grant inherited Piercing to a non-Insectoid host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-080", as: "host", under: ["P-075"] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(false);
  });
});
