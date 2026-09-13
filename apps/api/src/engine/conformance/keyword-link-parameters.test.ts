import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

const LINK_FINGERPRINT = "12e2453752038ce5edfe498cdb0eae85aa9f95dfac1d591dd23b9fc47e068eef";
const LINK_RULES_FINGERPRINT = "fd21a86d29f9fbe38b9b8e6e0edd8502c1edbf28a50582e00de76bb936ee1370";
const LINK_PLUS_FINGERPRINT = "ab93a63ae9090421af7be36348d5d9b8411f6fe6325313b51f9344a8019f9f2a";

describe("Link public cost and Link Max parameters", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0140",
      "10-1-1: a card from the hand or battle area can link to a specified Digimon by paying the cost",
      LINK_FINGERPRINT,
    );
    cite(
      "comprehensive-0141",
      "10-1-3-1/2/3: reveal the link card, choose a qualifying Digimon, pay the specified link cost, and plug the card in sideways",
      LINK_RULES_FINGERPRINT,
    );
    cite(
      "comprehensive-0259",
      "16-40-1/2: Link +X increases maximum links as a persistent effect",
      LINK_PLUS_FINGERPRINT,
    );
  });

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
