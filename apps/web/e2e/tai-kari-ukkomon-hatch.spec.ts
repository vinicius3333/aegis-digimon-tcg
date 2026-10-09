import { test, expect } from "./scenario-page";

for (const promo of [false, true]) {
  for (const hatch of [true, false]) {
    test(`Tai/Kari reacts to an effect hatch, not a declined hatch (promo=${promo}, hatch=${hatch})`, async ({
      scenario,
    }) => {
      await scenario.open(
        promo ? "arena-tai-kari-promo-ukkomon-hatch" : "arena-tai-kari-ukkomon-hatch",
        "normal",
        "move",
      );
      let taiPrompts = 0;
      await scenario.resolveUntil(
        (s) => s.phase === "Main" && !s.pendingDecision,
        (d) => {
          if (d.kind === "optional" && d.sourceCardId === "BT17-093") taiPrompts++;
          return { accept: /Hatch a Digi-Egg/.test(d.promptText) ? hatch : true };
        },
      );
      const final = await scenario.snapshot();
      expect(taiPrompts).toBe(hatch ? 1 : 0);
      expect(final.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT17-093")!.isSuspended).toBe(hatch);
      expect(final.players[0]!.breeding?.topCard.cardId).toBe(hatch ? "BT1-001" : undefined);
      expect(final.memory).toBe(3 + (promo ? 1 : 0) + (hatch ? 1 : 0));
      const probe = await scenario.presentation();
      expect(
        probe.events.filter((e) => e.kind === "cardsMoved" && e.from === "eggDeck" && e.to === "breeding"),
      ).toHaveLength(hatch ? 1 : 0);
      expect(probe.visible?.memory.value).toBe(final.memory);
      await scenario.healthy();
    });
  }
}
