import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-002.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("EX9-002", () => {
  it("inherits a once-per-turn Ver.2 digivolution after adding digivolution cards", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "onAddDigivolutionCards", actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 1, optional: true }] }] }));

  it("digivolves into a Ver.2 from hand when a face-down card is added to its stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-014", as: "host", under: [{ card: "EX9-002" }, { card: "BT1-009", faceUp: false }] }], hand: ["EX9-017"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 1;
    const host = s.perm("host");
    const added = host.stack.find((card) => card.cardId === "BT1-009")!;

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: host.permanentId,
      addedDigivolutionCardInstanceIds: [added.instanceId],
    });
    await settle(() => host.topCard?.cardId === "EX9-017");

    expect(host.topCard?.cardId).toBe("EX9-017");
    expect(host.stack.map((card) => card.cardId)).toEqual(["EX9-002", "BT1-009", "EX9-014"]);
  });

  it("does not digivolve when the added card is face up", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-014", as: "host", under: [{ card: "EX9-002" }, "BT1-009"] }], hand: ["EX9-017"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const host = s.perm("host");
    const added = host.stack.find((card) => card.cardId === "BT1-009")!;

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: host.permanentId,
      addedDigivolutionCardInstanceIds: [added.instanceId],
    });

    expect(host.topCard?.cardId).toBe("EX9-014");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-017")).toBe(true);
  });
});
