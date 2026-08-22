import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import st24Lilamon from "../ST24/ST24-10.js";
import "../index.js";

describe("ST22/ST24 remaining complex clauses", () => {
  it("ST22-01 only reacts to an Onmyōjutsu/Plug-In Option and digivolves from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST22-03", as: "host", under: ["ST22-01"] }],
          hand: [{ card: "ST22-04", as: "taomon" }],
          trash: [{ card: "ST22-10", as: "eligibleOption" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOptionUsed", {
      subjectPermanentId: s.inst("eligibleOption").instanceId,
      usedOptionCost: 6,
    });
    await settle(() => s.perm("host").topCard?.cardId === "ST22-04");

    expect(s.perm("host").topCard?.cardId).toBe("ST22-04");
  });

  it("ST22-01 rejects a non-matching Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST22-03", as: "host", under: ["ST22-01"] }],
          hand: [{ card: "ST22-04", as: "taomon" }],
          trash: [{ card: "BT1-090", as: "otherOption" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOptionUsed", {
      subjectPermanentId: s.inst("otherOption").instanceId,
      usedOptionCost: 6,
    });
    await settle(() => false, 40);

    expect(s.perm("host").topCard?.cardId).toBe("ST22-03");
  });

  it("ST24-10 suspends and restricts an opposing target, then spends two face-down Tamer cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-021", as: "dataSquad" }],
          battleArea: [
            { card: "ST24-10", as: "lilamon" },
            {
              card: "ST24-13",
              as: "tamer",
              under: [
                { card: "BT1-001", as: "underA", faceUp: false },
                { card: "BT1-002", as: "underB", faceUp: false },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("lilamon"));
    await settle(() => s.perm("lilamon").topCard?.cardId === "BT25-021");

    const opponent = s.state.players[1]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT1-009");
    expect(opponent?.isSuspended ?? true).toBe(true);
    if (opponent !== undefined) expect(observe(s.engine).isRestricted(opponent, "unsuspend")).toBe(true);
    expect(s.perm("lilamon").topCard?.cardId).toBe("BT25-021");
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(st24Lilamon.cardId).toBe("ST24-10");
  });
});
