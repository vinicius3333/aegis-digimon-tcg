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

it("turns only the artwork when a suspended copy leaves its group", () => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(900);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(245);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const index = [...(this.parentElement?.querySelectorAll("[data-field-key]") ?? [])].indexOf(this);
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
  const calls: { element: HTMLElement; frames: Keyframe[] }[] = [];
  const cancelTurn = vi.fn<() => void>();
  const originalAnimate = HTMLElement.prototype.animate;
  HTMLElement.prototype.animate = function (frames) {
    calls.push({ element: this, frames: frames as Keyframe[] });
    return { startTime: null, playState: "running", cancel: cancelTurn } as unknown as Animation;
  };
  const copies = ["a", "b"].map((id) => {
    const permanent = new Permanent();
    permanent.permanentId = id;
    permanent.topCard = new CardInstance();
    permanent.topCard.cardId = "BT22-093";
    return permanent;
  });
  const view = (split: boolean) => (
    <I18nProvider>
      <OrganizedBattleRow
        arrangement={{
          digimon: [],
          support: split
            ? [
                { key: "group", members: [copies[1]!] },
                { key: "leaver", members: [copies[0]!] },
              ]
            : [{ key: "group", members: copies }],
        }}
        layoutWidth={100}
        supportFirst={false}
        digimonLabel="Digimon"
        supportLabel="Support"
        emptyLabel={null}
        rowProps={{}}
        isSuspended={(p) => p.isSuspended}
        renderCard={(card) => (
          <div
            key={card.fieldKey}
            data-field-key={card.fieldKey}
            data-suspended={card.members[0]!.isSuspended || undefined}
          >
            <div className="game-card-enter">
              <div data-state="suspended" />
            </div>
          </div>
        )}
      />
    </I18nProvider>
  );
  try {
    const { rerender } = render(view(false));
    calls.length = 0;
    copies[0]!.isSuspended = true;
    rerender(view(true));
    const artwork = calls.find(({ element }) => element.hasAttribute("data-state"));
    expect(artwork?.frames).toEqual([{ rotate: "0deg" }, { rotate: "90deg" }]);
    expect(
      calls
        .filter(({ element }) => element.hasAttribute("data-field-key"))
        .every(({ frames }) => frames.every((frame) => frame.rotate === "0deg")),
    ).toBe(true);
    const originalArt = artwork!.element;
    originalArt.style.rotate = "45deg";
    cancelTurn.mockClear();
    calls.length = 0;
    copies[0]!.isSuspended = false;
    rerender(view(true));
    expect(cancelTurn).toHaveBeenCalled();
    const reversed = calls.find(({ element }) => element === originalArt);
    expect(reversed?.frames).toEqual([{ rotate: "45deg" }, { rotate: "0deg" }]);
  } finally {
    HTMLElement.prototype.animate = originalAnimate;
  }
});
