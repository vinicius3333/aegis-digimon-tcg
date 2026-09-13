import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";

describe("Link public cost and Link Max parameters", () => {
  it("applies printed Link +6 capacity through a public third link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-086",
              as: "host",
              linked: [
                { card: "BT21-009", as: "linkA" },
                { card: "BT21-041", as: "linkB" },
              ],
            },
          ],
          hand: [{ card: "BT21-041", as: "linkC" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(observe(s.engine).linkMaxDelta(s.perm("host"))).toBe(6);
    expect(s.engine.linkMaxOf(s.perm("host"))).toBe(7);
    const linkCId = s.inst("linkC").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "linkCard", instanceId: linkCId, targetPermanentId: s.perm("host").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some(({ instanceId }) => instanceId === linkCId));
    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("linkA").instanceId, s.inst("linkB").instanceId, linkCId]),
    );
    expect(s.perm("host").linked).toHaveLength(3);
    expect(s.state.memory).toBe(2);
  });

  it("publicly pays the printed Link cost 2 and moves the exact card from hand", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT24-087", as: "host" }], hand: [{ card: "BT22-009", as: "link" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const linkId = s.inst("link").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "linkCard", instanceId: linkId, targetPermanentId: s.perm("host").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some(({ instanceId }) => instanceId === linkId));
    expect(s.state.memory).toBe(1);
    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual([linkId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("publicly links an Appmon card, pays its printed cost, and preserves its instance", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT24-087", as: "host" }], hand: [{ card: "BT21-041", as: "link" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const linkId = s.inst("link").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "linkCard", instanceId: linkId, targetPermanentId: s.perm("host").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some(({ instanceId }) => instanceId === linkId));
    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual([linkId]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("refuses a public Link intent when the controller cannot pay its printed cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-087", as: "host" }], hand: [{ card: "BT21-041", as: "link" }] },
    });
    s.state.memory = -10;
    await s.ready();
    const linkId = s.inst("link").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "linkCard", instanceId: linkId, targetPermanentId: s.perm("host").permanentId }),
    ).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([linkId]);
  });

  it("uses printed Link Max +1 through a second public link intent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-073",
              as: "host",
              linked: [{ card: "BT21-009", as: "linkA" }],
            },
          ],
          hand: [{ card: "BT21-041", as: "linkB" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(observe(s.engine).linkMaxDelta(s.perm("host"))).toBe(1);
    expect(s.engine.linkMaxOf(s.perm("host"))).toBe(2);
    const linkBId = s.inst("linkB").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "linkCard", instanceId: linkBId, targetPermanentId: s.perm("host").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some(({ instanceId }) => instanceId === linkBId));
    expect(
      s
        .perm("host")
        .linked.map(({ instanceId }) => instanceId)
        .sort(),
    ).toEqual([s.inst("linkA").instanceId, s.inst("linkB").instanceId].sort());
    expect(s.state.memory).toBe(2);
  });
});
