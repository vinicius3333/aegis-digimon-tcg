import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { advance } from "../../engine/testkit/advance.js";

const ST22 = "ST22-10";
const OPP_DIGIMON = "BT10-075";

describe("ST22-10 OnDiscardSecurity (effect trashes this card from security)", () => {
  it("trashing ST22-10 from security by an effect gives 1 opponent Digimon -9000 DP", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: ST22, as: "st22", faceUp: true }] },
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 12000, as: "oppPerm" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const st22Id = s.inst("st22").instanceId;
    const oppPerm = s.perm("oppPerm");

    await advance(s.engine).verb.trash([st22Id]);
    await settle(() => oppPerm.currentDP !== 12000);

    expect(oppPerm.currentDP).toBe(3000);
    expect(p0.trash.some((c) => c.instanceId === st22Id)).toBe(true);
    expect(p0.security.some((c) => c.instanceId === st22Id)).toBe(false);
  });

  it("does nothing when the opponent has no Digimon (CanActivate gate)", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: ST22, as: "st22", faceUp: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const st22Id = s.inst("st22").instanceId;

    await advance(s.engine).verb.trash([st22Id]);
    await settle(() => p0.trash.some((c) => c.instanceId === st22Id));

    expect(p0.trash.some((c) => c.instanceId === st22Id)).toBe(true);
  });

  it("trashes itself from face-up security to prevent a named Digimon's effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: ST22, as: "st22", faceUp: true }],
          battleArea: [{ card: "ST22-03", as: "taomon" }],
        },
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 12000, as: "oppPerm" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("taomon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("st22").instanceId));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("taomon").permanentId)).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("st22").instanceId)).toBe(false);
    expect(s.perm("oppPerm").currentDP).toBe(3000);
  });
});

describe("ST22-10 Amethyst Mandala — KB Q&A rulings", () => {
  it.each([
    { where: "face up in security", security: [{ card: ST22, as: "mandala", faceUp: true }], hand: [], protects: true },
    {
      where: "face down in security",
      security: [{ card: ST22, as: "mandala", faceUp: false }],
      hand: [],
      protects: false,
    },
    { where: "in the hand", security: [], hand: [{ card: ST22, as: "mandala" }], protects: false },
  ])(
    "activates its {Security} effect only while face up in security ($where) (Q5436)",
    async ({ security, hand, protects }) => {
      const s = setupEngine(
        {
          0: { security: [...security, "BT1-090"], hand, battleArea: [{ card: "ST22-03", as: "kyubimon" }] },
          1: { battleArea: [{ card: OPP_DIGIMON, dp: 12000, as: "oppPerm" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      await s.ready();
      const kyubimonId = s.perm("kyubimon").permanentId;

      const removed = await advance(s.engine).verb.deletePermanent([kyubimonId], "byEffect");
      await settle(() => s.state.pendingDecision === undefined);

      expect(removed).toBe(protects ? 0 : 1);
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === kyubimonId)).toBe(protects);
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("mandala").instanceId)).toBe(protects);
    },
  );

  it("lets a second face-up copy activate after the first already kept the Digimon (Q5437)", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: ST22, as: "first", faceUp: true }, { card: ST22, as: "second", faceUp: true }, "BT1-090"],
          battleArea: [{ card: "ST22-03", as: "kyubimon" }],
        },
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 30000, as: "oppPerm" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const kyubimonId = s.perm("kyubimon").permanentId;

    await advance(s.engine).verb.deletePermanent([kyubimonId], "byEffect");
    await settle(() => s.state.pendingDecision === undefined && s.perm("oppPerm").currentDP === 12000);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === kyubimonId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("oppPerm").currentDP).toBe(12000);
  });

  it.each([
    { copies: 1, survivors: ["ST22-03"] },
    { copies: 2, survivors: ["ST22-03", "ST22-02"] },
  ])("keeps 1 of several leaving Digimon per face-up copy ($copies copies) (Q5438)", async ({ copies, survivors }) => {
    const s = setupEngine(
      {
        0: {
          security: [
            ...Array.from({ length: copies }, (_, index) => ({ card: ST22, as: `copy${index}`, faceUp: true })),
            "BT1-090",
          ],
          battleArea: [
            { card: "ST22-03", as: "kyubimon" },
            { card: "ST22-02", as: "renamon" },
          ],
        },
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 30000, as: "oppPerm" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const kyubimonId = s.perm("kyubimon").permanentId;
    const renamonId = s.perm("renamon").permanentId;
    // The engine asks every copy about every leaving Digimon, Kyubimon first. Decline the second
    // copy for the already-kept Kyubimon so that copy stays available for Renamon.
    const script: [string, boolean][] =
      copies === 1
        ? [
            [kyubimonId, true],
            [renamonId, true],
          ]
        : [
            [kyubimonId, true],
            [kyubimonId, false],
            [renamonId, true],
            [renamonId, true],
          ];

    const deletion = advance(s.engine).verb.deletePermanent([kyubimonId, renamonId], "byEffect");
    for (const [subject, accept] of script) {
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const decision = s.state.pendingDecision!;
      expect(JSON.parse(decision.payloadJson).affectedPermanentIds).toEqual([subject]);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "optional", accept },
        }),
      ).toEqual({ ok: true });
    }
    await deletion;
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(survivors);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
