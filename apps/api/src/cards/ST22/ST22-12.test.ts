import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST22-12 DoGatchmon", () => {
  it("links a Social/Navi/Tool Digimon from hand when attacking", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST22-12", as: "dogatchmon" }], hand: [{ card: "BT21-047", as: "navimon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dogatchmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dogatchmon").linked.some((card) => card.instanceId === s.inst("navimon").instanceId));
    expect(s.perm("dogatchmon").linked.some((card) => card.instanceId === s.inst("navimon").instanceId)).toBe(true);
  });
});

describe("ST22-12 DoGatchmon — KB Q&A rulings", () => {
  const GATCHMON = "BT21-009";
  const NAVIMON = "BT21-047";
  const TWEETMON = "P-190";
  const TIMEMON = "BT21-059";

  it.each([
    { base: GATCHMON, link: NAVIMON, legal: true },
    { base: GATCHMON, link: TWEETMON, legal: true },
    { base: NAVIMON, link: GATCHMON, legal: true },
    { base: NAVIMON, link: TWEETMON, legal: true },
    { base: TWEETMON, link: GATCHMON, legal: true },
    { base: TWEETMON, link: NAVIMON, legal: true },
    { base: GATCHMON, link: GATCHMON, legal: false },
    { base: GATCHMON, link: TIMEMON, legal: false },
  ])(
    "App Fuses from $base with a $link link card only for two different named cards (Q5441)",
    async ({ base, link, legal }) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "base", linked: [{ card: link, as: "linkCard" }] }],
            hand: [{ card: "ST22-12", as: "dogatchmon" }],
            deck: ["BT1-009", "BT1-009"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();

      const result = s.engine.applyIntent(0, {
        type: "appFusion",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dogatchmon").instanceId,
        linkedInstanceId: s.inst("linkCard").instanceId,
      });
      expect(result).toEqual(legal ? { ok: true } : { ok: false, reason: "illegal-target" });
      await settle(() => s.state.pendingDecision === undefined);

      expect(s.perm("base").topCard.cardId).toBe(legal ? "ST22-12" : base);
      expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(legal ? [base, link] : []);
      expect(s.perm("base").linked).toHaveLength(legal ? 0 : 1);
    },
  );

  it.each([true, false])(
    "cannot declare BT21-018's linked attack while already attacking (during attack=%s) (Q5443)",
    async (duringAttack) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "ST22-12", as: "dogatchmon" }],
            hand: [{ card: "BT21-018", as: "linkCard" }],
            deck: ["BT1-009", "BT1-009"],
          },
          1: { security: ["ST1-02", "ST1-02", "ST1-02"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();
      const dogatchmonId = s.perm("dogatchmon").permanentId;

      expect(
        duringAttack
          ? s.engine.applyIntent(0, { type: "attack", attackerPermanentId: dogatchmonId, target: { kind: "player" } })
          : s.engine.applyIntent(0, {
              type: "linkCard",
              instanceId: s.inst("linkCard").instanceId,
              targetPermanentId: dogatchmonId,
            }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("dogatchmon").linked.length === 1);
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined, 3000);

      const linkEffectIndex = s.events.findIndex(
        (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT21-018",
      );
      expect(linkEffectIndex).toBeGreaterThanOrEqual(0);
      expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(1);
      const declarationIndex = s.events.findIndex((event) => event.kind === "attackDeclared");
      expect(declarationIndex > linkEffectIndex).toBe(!duringAttack);
      expect(s.state.players[1]!.security).toHaveLength(2);
    },
  );

  it.each([
    { firstTrigger: "ST22-12/ir-", raidRedirects: false },
    { firstTrigger: "keyword/Raid", raidRedirects: true },
  ])(
    "loses <Raid> once its [When Attacking] link lets it App Fuse away first (first=$firstTrigger) (Q5444)",
    async ({ firstTrigger, raidRedirects }) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "ST22-12", as: "dogatchmon" },
              { card: "BT21-084", as: "haru" },
            ],
            hand: [
              { card: TIMEMON, as: "timemon" },
              { card: "BT21-023", as: "globemon" },
            ],
            deck: ["BT1-009", "BT1-009", "BT1-009"],
          },
          1: {
            battleArea: [
              { card: "BT1-009", as: "small", dp: 3000 },
              { card: "BT1-010", as: "big", dp: 9000 },
            ],
            security: ["ST1-02", "ST1-02"],
            deck: ["BT1-009"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: [firstTrigger] },
      );
      s.state.memory = 5;
      await s.ready();
      const bigId = s.perm("big").permanentId;

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("dogatchmon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking(), 3000);

      expect(s.perm("dogatchmon").topCard.cardId).toBe("BT21-023");
      const redirected = s.events.some(
        (event) =>
          event.kind === "attackDeclared" && event.target.kind === "permanent" && event.target.permanentId === bigId,
      );
      expect(redirected).toBe(raidRedirects);
      expect(s.events.some((event) => event.kind === "securityChecked")).toBe(!raidRedirects);
    },
  );
});
