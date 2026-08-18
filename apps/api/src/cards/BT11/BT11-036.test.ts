import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-036.js";

describe("BT11-036 Chuumon", () => {
  it("reduces by 1 the cost to digivolve into a Sukamon-named card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-036", as: "chuumon" }],
        hand: [{ card: "BT11-040", as: "sukamon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("chuumon").permanentId,
      instanceId: s.inst("sukamon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("chuumon").topCard?.cardId === "BT11-040");

    expect(s.state.memory).toBe(4);
  });

  it("inherited effect plays a Chuumon from trash suspended when a Sukamon host is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-040", as: "host", under: ["BT11-036"] }],
        trash: [{ card: "BT11-036", as: "trashChuumon" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT11-036"));

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT11-036")!;
    expect(played.isSuspended).toBe(true);
  });

  it("inherited effect does not play Chuumon when a non-Sukamon/Etemon host is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-027", as: "host", under: ["BT11-036"] }],
        trash: [{ card: "BT11-036", as: "trashChuumon" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("trashChuumon").instanceId);
  });
});
