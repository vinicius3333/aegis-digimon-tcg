// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { CardInstance, Permanent } from "@aegis/shared";
import { OrganizedBattleRow } from "./OrganizedBattleRow";
import { I18nProvider } from "../../../i18n";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("slides reordered groups from their old positions to rest without restarting on unrelated renders", () => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(900);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(245);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const cards = this.parentElement?.querySelectorAll("[data-field-key]");
    const index = cards ? [...cards].indexOf(this) : 0;
    return {
      x: index * 100,
      y: 0,
      left: index * 100,
      top: 0,
      right: index * 100 + 50,
      bottom: 70,
      width: 50,
      height: 70,
      toJSON: () => ({}),
    };
  });
  const animate = vi.fn<() => Partial<Animation>>(() => ({
    startTime: null,
    playState: "finished",
    cancel: vi.fn<() => void>(),
  }));
  const originalAnimate = HTMLElement.prototype.animate;
  HTMLElement.prototype.animate = animate as unknown as typeof originalAnimate;
  const permanent = (id: string) => {
    const p = new Permanent();
    p.permanentId = id;
    p.topCard = new CardInstance();
    p.topCard.cardId = "BT22-093";
    return p;
  };
  const a = permanent("a");
  const b = permanent("b");
  const view = (members: Permanent[], label = "Support") => (
    <I18nProvider>
      <OrganizedBattleRow
        arrangement={{ digimon: [], support: members.map((p) => ({ key: p.permanentId, members: [p] })) }}
        layoutWidth={100}
        supportFirst={false}
        digimonLabel="Digimon"
        supportLabel={label}
        emptyLabel={null}
        rowProps={{}}
        isSuspended={(p) => p.isSuspended}
        renderCard={(card) => <div key={card.fieldKey} data-field-key={card.fieldKey} style={{ width: card.width }} />}
      />
    </I18nProvider>
  );
  try {
    const { rerender } = render(view([a, b]));
    animate.mockClear();
    rerender(view([b, a]));
    expect(animate).toHaveBeenCalledTimes(2);
    const frames = animate.mock.calls as unknown as [Keyframe[], KeyframeAnimationOptions][];
    expect(frames[0]![0][0]!.translate).toBe("100px 0px");
    expect(frames[1]![0][0]!.translate).toBe("-100px 0px");
    expect(
      frames.every(
        ([keyframes]) =>
          keyframes.length === 2 &&
          keyframes[1]!.translate === "0px 0px" &&
          keyframes[1]!.rotate === "0deg" &&
          keyframes.every((frame) => frame.transform === undefined),
      ),
    ).toBe(true);
    expect(animate.mock.results.every(({ value }) => typeof value.startTime === "number" && value.startTime > 0)).toBe(
      true,
    );
    rerender(view([b, a], "Updated label"));
    expect(animate).toHaveBeenCalledTimes(2);
  } finally {
    HTMLElement.prototype.animate = originalAnimate;
  }
});
