// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { CardInstance, Permanent } from "@aegis/shared";
import { OrganizedBattleRow } from "./OrganizedBattleRow";
import { I18nProvider } from "../../../i18n";
import { CARD_SUSPEND_MOTION } from "../../../design/cardMotion";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("replaces a departing card with its guide before measuring the remaining cards' motion", () => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(900);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(245);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const siblings = [...(this.parentElement?.children ?? [])];
    const x = siblings.indexOf(this) * 100 - siblings.length * 50;
    return { x, y: 0, left: x, top: 0, right: x + 100, bottom: 140, width: 100, height: 140, toJSON: () => ({}) };
  });
  const animate = vi.fn<() => Partial<Animation>>(() => ({
    startTime: null,
    playState: "finished",
    cancel: vi.fn<() => void>(),
  }));
  const originalAnimate = HTMLElement.prototype.animate;
  HTMLElement.prototype.animate = animate as unknown as typeof originalAnimate;
  const permanents = Array.from({ length: 5 }, (_, index) => {
    const permanent = new Permanent();
    permanent.permanentId = `card-${index}`;
    return permanent;
  });
  const view = (digimon: Permanent[]) => (
    <I18nProvider>
      <OrganizedBattleRow
        arrangement={{ digimon, support: [] }}
        layoutWidth={100}
        supportFirst={false}
        digimonLabel="Digimon"
        supportLabel="Support"
        emptyLabel={null}
        rowProps={{}}
        isSuspended={(p) => p.isSuspended}
        renderCard={(card) => <div key={card.fieldKey} data-field-key={card.fieldKey} style={{ width: card.width }} />}
      />
    </I18nProvider>
  );
  try {
    const { container, rerender } = render(view(permanents));
    animate.mockClear();
    rerender(view(permanents.slice(0, 4)));
    expect(container.querySelectorAll(".game-battle-lane--digimon .game-field-card-slot")).toHaveLength(1);
    // The four surviving cards never moved: the fifth card's guide already holds its place.
    expect(animate).not.toHaveBeenCalled();
  } finally {
    HTMLElement.prototype.animate = originalAnimate;
  }
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
    const field = this.closest<HTMLElement>("[data-field-key]");
    if (field && field !== this) return field.getBoundingClientRect();
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
  const calls: { element: HTMLElement; frames: Keyframe[]; options: KeyframeAnimationOptions; animation: Animation }[] =
    [];
  const cancelTurn = vi.fn<() => void>();
  let nativeProgress = 1;
  const originalAnimate = HTMLElement.prototype.animate;
  HTMLElement.prototype.animate = function (frames, options) {
    const animation = {
      startTime: null,
      playState: "running",
      effect: { getComputedTiming: () => ({ progress: nativeProgress }) },
      cancel() {
        cancelTurn();
        this.playState = "idle";
      },
    } as unknown as Animation;
    calls.push({
      element: this,
      frames: frames as Keyframe[],
      options: options as KeyframeAnimationOptions,
      animation,
    });
    return animation;
  };
  const copies = ["a", "b"].map((id) => {
    const permanent = new Permanent();
    permanent.permanentId = id;
    permanent.topCard = new CardInstance();
    permanent.topCard.cardId = "BT22-093";
    return permanent;
  });
  const view = (split: boolean, mergedMembers = copies) => (
    <I18nProvider>
      <OrganizedBattleRow
        arrangement={{
          digimon: [],
          support: split
            ? [
                { key: "group", members: [copies[1]!] },
                { key: "leaver", members: [copies[0]!] },
              ]
            : [{ key: "group", members: mergedMembers }],
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
    const { container, rerender } = render(view(false));
    calls.length = 0;
    copies[0]!.isSuspended = true;
    rerender(view(true));
    const artwork = calls.find(({ element }) => element.hasAttribute("data-state"));
    expect(artwork?.frames).toEqual([{ rotate: "0deg" }, { rotate: "90deg" }]);
    expect(artwork?.options).toMatchObject({
      duration: CARD_SUSPEND_MOTION.durationMs,
      easing: CARD_SUSPEND_MOTION.easing,
    });
    expect(
      calls
        .filter(({ element }) => element.hasAttribute("data-field-key"))
        .every(({ options }) => options.duration === 420),
    ).toBe(true);
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
    nativeProgress = 0.15625;
    calls.length = 0;
    rerender(view(false, [copies[1]!, copies[0]!]));
    const returning = container.querySelector<HTMLElement>('[data-testid="field-group-return"]');
    expect(returning?.getAttribute("aria-hidden")).toBe("true");
    expect(returning?.inert).toBe(true);
    expect(returning?.hasAttribute("data-field-key")).toBe(false);
    const interruptedTurn = calls.find(
      ({ element, frames }) => element === returning && frames.some((frame) => frame.rotate),
    );
    expect(interruptedTurn?.frames).toEqual([{ rotate: "37.96875deg" }, { rotate: "0deg" }]);
    const slide = calls.find(({ element, frames }) => element === returning && frames.some((frame) => frame.translate));
    expect(slide?.options.duration).toBe(420);
    expect(slide?.frames[1]?.translate).toBe("-100px 0px");
    slide!.animation.onfinish!(new Event("finish") as AnimationPlaybackEvent);
    expect(container.querySelector('[data-testid="field-group-return"]')).toBeNull();
  } finally {
    HTMLElement.prototype.animate = originalAnimate;
  }
});
