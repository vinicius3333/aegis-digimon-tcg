import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/EX5/index.js";

describe("public permanent matching and concealed stack information", () => {
  it("skips a hidden X Antibody source and selects the visible legal host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "hiddenHost", under: [{ card: "EX5-070", faceUp: false }] },
            { card: "BT1-010", as: "visibleHost" },
          ],
          hand: [
            { card: "EX5-070", as: "option" },
            { card: "BT9-011", as: "candidate" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hiddenHostId = s.perm("hiddenHost").permanentId;
    const visibleHostId = s.perm("visibleHost").permanentId;
    expect(s.perm("hiddenHost").stack[0]!.faceUp).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.inst("candidate").faceUp === false || s.state.pendingDecision === undefined);

    expect(s.perm("hiddenHost").permanentId).toBe(hiddenHostId);
    expect(s.perm("visibleHost").permanentId).toBe(visibleHostId);
    expect(s.perm("hiddenHost").topCard.cardId).toBe("BT1-010");
    expect(s.perm("visibleHost").topCard.cardId).toBe("BT9-011");
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
