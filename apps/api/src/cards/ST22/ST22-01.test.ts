import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22-01 Viximon inherited digivolution", () => {
  it("offers a matching evolution after a matching Option is used", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST22-03", as: "host", under: ["ST22-01", "ST22-02"] },
            { card: "BT1-009", as: "red" },
          ],
          hand: [
            { card: "ST22-04", as: "taomon" },
            { card: "ST22-10", as: "option" },
            { card: "ST22-10", as: "secondOption" },
            { card: "ST22-05", as: "sakuyamon" },
          ],
          deck: ["BT1-002", "BT1-002", "BT1-002", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const host = s.perm("host");
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => host.topCard?.cardId === "ST22-04");
    expect(host.topCard?.cardId).toBe("ST22-04");
    await (s.engine as unknown as { mainVerbChain: Promise<void> }).mainVerbChain;
    expect(s.state.memory).toBe(4);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondOption").instanceId })).toEqual({
      ok: true,
    });
    await (s.engine as unknown as { mainVerbChain: Promise<void> }).mainVerbChain;
    expect(host.topCard.cardId).toBe("ST22-04");
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("sakuyamon").instanceId)).toBe(true);
  });

  it("does not trigger for an unrelated Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST22-03", as: "host", under: ["ST22-01", "ST22-02"] },
            { card: "BT1-009", as: "red" },
          ],
          hand: [
            { card: "ST22-04", as: "taomon" },
            { card: "BT1-090", as: "option" },
          ],
          deck: ["BT1-002", "BT1-002", "BT1-002", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const host = s.perm("host");
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await (s.engine as unknown as { mainVerbChain: Promise<void> }).mainVerbChain;
    expect(host.topCard?.cardId).toBe("ST22-03");
  });
});
