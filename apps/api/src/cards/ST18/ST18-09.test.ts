import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST18-09 Deramon", () => {
  it("plays an eligible Avian/Bird/Vegetation/Plant Digimon at 3000 DP or less after deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST18-09", as: "deramon" }],
          hand: [
            { card: "ST18-03", as: "eligible" },
            { card: "ST18-08", as: "tooLarge" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("deramon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST18-03"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST18-03")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "ST18-08")).toBe(true);
  });

  it("has Blocker and exposes the Vegetation rule trait", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST18-09", as: "deramon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("deramon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("deramon"), "Vegetation")).toBe(true);
  });

  it("accepts the exact 3000-DP boundary and declines the optional play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST18-09", as: "deramon" }],
          hand: [
            { card: "ST18-06", as: "boundary" },
            { card: "ST18-08", as: "tooLarge" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("deramon").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("boundary").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("boundary").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tooLarge").instanceId)).toBe(true);

    const declined = setupEngine(
      { 0: { battleArea: [{ card: "ST18-09", as: "deramon" }], hand: [{ card: "ST18-06", as: "boundary" }] } },
      { autoDeclineOptional: true },
    );
    await advance(declined.engine).verb.deletePermanent([declined.perm("deramon").permanentId], "byEffect");
    await settle();
    expect(declined.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST18-09")).toBe(true);
    expect(
      declined.state.players[0]!.hand.some((card) => card.instanceId === declined.inst("boundary").instanceId),
    ).toBe(true);
  });
});
