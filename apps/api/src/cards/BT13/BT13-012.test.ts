import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT13-012.js";

describe("BT13-012 GeoGreymon", () => {
  it("uses its alternate requirement, plays a red/yellow Tamer from security, then recovers from deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-008", as: "agumon" }],
          hand: [{ card: "BT13-012", as: "geogreymon" }],
          security: [{ card: "BT12-092", as: "marcus" }, "BT1-001"],
          deck: ["BT1-002", "BT1-003", "BT1-004"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("agumon").permanentId, instanceId: s.inst("geogreymon").instanceId, alternateRequirementIndex: 0 })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT12-092"));
    await settle();

    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not recover when no eligible Tamer is played from security (Q2271)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-008", as: "agumon" }],
        hand: [{ card: "BT13-012", as: "geogreymon" }],
        security: ["BT1-001", "BT1-002"],
        deck: ["BT1-003", "BT1-004"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("agumon").permanentId, instanceId: s.inst("geogreymon").instanceId, alternateRequirementIndex: 0 })).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard.cardId === "BT13-012");
    await settle();
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("once per turn may delete a 3000-or-less opposing Digimon when an allied red/yellow Tamer suspends", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT13-012"] }, { card: "BT12-092", as: "marcus" }] },
        1: { battleArea: [{ card: "BT1-012", as: "smallA" }, { card: "BT1-012", as: "smallB" }, { card: "BT1-015", as: "large" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("marcus").permanentId });
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT1-012")).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-015")).toBe(true);

    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("marcus").permanentId });
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT1-012")).toHaveLength(1);
  });
});
