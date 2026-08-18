// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { CardEffectsDemo } from "./CardEffectsDemo";

afterEach(() => cleanup());

function mockDesktop(): void {
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn<MediaQueryList["addEventListener"]>(),
    removeEventListener: vi.fn<MediaQueryList["removeEventListener"]>(),
    addListener: vi.fn<MediaQueryList["addListener"]>(),
    removeListener: vi.fn<MediaQueryList["removeListener"]>(),
    dispatchEvent: vi.fn<MediaQueryList["dispatchEvent"]>(),
  }));
}

function mockMobile(): void {
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    matches: query.includes("max-width"),
    media: query,
    onchange: null,
    addEventListener: vi.fn<MediaQueryList["addEventListener"]>(),
    removeEventListener: vi.fn<MediaQueryList["removeEventListener"]>(),
    addListener: vi.fn<MediaQueryList["addListener"]>(),
    removeListener: vi.fn<MediaQueryList["removeListener"]>(),
    dispatchEvent: vi.fn<MediaQueryList["dispatchEvent"]>(),
  }));
}

describe("CardEffectsDemo", () => {
  it("opens the real game board at Examon's pending effect and closes it after confirmation", () => {
    mockDesktop();

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-074" />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: "Examon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Select Slayerdramon" })).toBeTruthy();
    expect(screen.getByRole("dialog", { name: /Examon · effect/i })).toBeTruthy();
    const slayerdramon = screen.getByRole("button", { name: "Slayerdramon" });
    fireEvent.click(slayerdramon);
    expect(screen.getByRole("button", { name: "Slayerdramon, selected" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens Fighter Mode on the real board with Dragon Mode selected from its stack", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-073");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-073" />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: "Imperialdramon: Fighter Mode" })).toBeTruthy();
    expect(screen.getByRole("dialog", { name: /Imperialdramon: Fighter Mode · effect/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Imperialdramon: Dragon Mode" })).toBeTruthy();
    expect(screen.getByText(/none of your opponent's \[Security\] effects can activate/i)).toBeTruthy();
  });

  it("shows only Wormmon as eligible while keeping the whole trash visible for On Deletion", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-073?effect=on-deletion");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-073" />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: "Wormmon" })).toBeTruthy();
    expect(screen.getByText(/play 1 \[Wormmon\] and 1 \[Veemon\]/i)).toBeTruthy();
    const disabledVeemon = screen
      .getAllByRole("button", { name: "Veemon" })
      .find((element) => element instanceof HTMLButtonElement && element.disabled);
    expect(disabledVeemon).toBeDefined();
    expect((screen.getByRole("button", { name: "Elecmon" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("opens Megiddo Flame on the real board with both currently legal Main branches", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-072");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-072" />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: /Megiddo Flame · effect/i })).toBeTruthy();
    expect(screen.getByText("Choose an effect")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete 1 opponent's level 4 or lower Digimon" })).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Delete 1 of your Digimon to delete 1 opponent's level 6 or lower Digimon instead",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /Megidramon/ })).toBeTruthy();
  });

  it("shows the whole trash while enabling only Guilmon names for Megiddo Flame Security", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-072?effect=security");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-072" />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: "Guilmon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guilmon (X Antibody)" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Growlmon" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/play 1 \[Guilmon\] from your trash/i)).toBeTruthy();
  });

  it("shows every opponent Digimon as a legal Laser Cannon De-Digivolve target", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-071");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-071" />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: /Laser Cannon · effect/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Metallicdramon, .*1 source/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Sealsdramon, .*0 sources/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Examon, .*0 sources/ })).toBeTruthy();
    expect(screen.getByText(/De-Digivolve 1/i)).toBeTruthy();
  });

  it("keeps the board visible but enables only the cost-5 Laser Cannon deletion target", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-071?step=delete");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-071" />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /Sealsdramon, .*0 sources/ })).toBeTruthy();
    expect((screen.getByRole("button", { name: /Metallicdramon, .*1 source/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByRole("button", { name: /Examon, .*0 sources/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("explains that Laser Cannon Security activates its complete Main sequence", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-071?effect=security");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-071" />
      </I18nProvider>,
    );

    expect(screen.getByText(/\[Security\] Activate this card's \[Main\] effect/i)).toBeTruthy();
    expect(screen.getByText(/Then, delete 1 of your opponent's Digimon/i)).toBeTruthy();
  });

  it("shows Avalon's Gate's two Main choices when Examon is absent", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-070");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-070" />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: /Avalon's Gate · effect/i })).toBeTruthy();
    expect(screen.getByText("Choose an effect")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Suspend an opponent's Digimon and grant ＜Piercing＞" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Unsuspend one of your Digimon" })).toBeTruthy();
  });

  it("shows both allied Digimon as legal Piercing targets", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-070?step=piercing");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-070" />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /Slayerdramon, .*0 sources/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Dracomon, .*suspended.*0 sources/i })).toBeTruthy();
    expect(screen.getByText(/gains ＜Piercing＞ for the turn/i)).toBeTruthy();
  });

  it("keeps every allied Digimon visible while enabling only the suspended unsuspend target", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-070?step=unsuspend");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-070" />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /Dracomon, .*suspended/i })).toBeTruthy();
    expect((screen.getByRole("button", { name: /Slayerdramon, .*0 sources/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("shows that Examon activates all of Avalon's Gate's Main effects", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-070?effect=examon");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-070" />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: "Examon" })).toBeTruthy();
    expect(screen.queryByText("Choose an effect")).toBeNull();
    expect(screen.getByText(/activate all of the effects below instead/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Pomumon, .*0 sources/ })).toBeTruthy();
  });

  it("shows Avalon's Gate Security at the correct timing and its two-part effect", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-070?effect=security");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-070" />
      </I18nProvider>,
    );

    expect(screen.getByText(/\[Security\] Suspend 1 of your opponent's Digimon/i)).toBeTruthy();
    expect(screen.getByText(/unsuspend 1 of your Digimon/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Metallicdramon, .*0 sources/ })).toBeTruthy();
  });

  it("shows the suspended allied Digimon for Avalon's Gate's second Security step", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-070?effect=security&step=unsuspend");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-070" />
      </I18nProvider>,
    );

    expect(screen.getByText(/\[Security\].*unsuspend 1 of your Digimon/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Dracomon, .*suspended.*0 sources/i })).toBeTruthy();
    expect((screen.getByRole("button", { name: /Slayerdramon, .*0 sources/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("shows the whole hand while enabling only Four Great Dragons for Trial's Delay", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-069");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-069" />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: /Trial of the Four Great Dragons · effect/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Azulongmon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Magnadramon" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Agumon" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/can't digivolve to level 7/i)).toBeTruthy();
    expect(screen.getByText(/at the next end of your opponent's turn, delete that Digimon/i)).toBeTruthy();
  });

  it("shows Trial in the battle area and the drawn card after its Main effect", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-069?effect=main");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-069" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Trial of the Four Great Dragons" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Select Azulongmon" })).toBeTruthy();
    expect(screen.getByText(/hand 1/i)).toBeTruthy();
    expect(screen.getByText(/1 card moved: deck → hand/i)).toBeTruthy();
    expect(screen.getByText(/1 card moved: hand → battle area/i)).toBeTruthy();
  });

  it("shows Trial placed by Security without drawing a card", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-069?effect=security");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-069" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Trial of the Four Great Dragons" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Select Azulongmon" })).toBeNull();
    expect(screen.getByText(/hand 0/i)).toBeTruthy();
    expect(screen.getByText(/1 card moved: security → battle area/i)).toBeTruthy();
  });

  it("shows every opposing Digimon as a God Flame DP-reduction target", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-068");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-068" />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: /God Flame · effect/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Megidramon, 12,000 DP/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Examon, 15,000 DP/ })).toBeTruthy();
    expect(screen.getByText(/gets -6000 DP for the turn/i)).toBeTruthy();
  });

  it("offers clear accept and decline actions for God Flame's optional recovery", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-068?step=optional");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-068" />
      </I18nProvider>,
    );

    expect(screen.getByText("Return a Four Great Dragons card to your hand?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Megidramon/ })).toBeTruthy();
  });

  it("shows the whole trash while enabling only God Flame's recovery candidates", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-068?step=recovery");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-068" />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: "Azulongmon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Trial of the Four Great Dragons" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Agumon" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/you may return 1 card with the \[Four Great Dragons\] trait/i)).toBeTruthy();
  });

  it("shows God Flame Security activating the complete Main sequence at zero memory", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-068?effect=security");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-068" />
      </I18nProvider>,
    );

    expect(screen.getByText(/\[Security\] Activate this card's \[Main\] effect/i)).toBeTruthy();
    expect(screen.getByText(/Then, you may return 1 card/i)).toBeTruthy();
    expect(screen.getByRole("img", { name: "Memory: 0" })).toBeTruthy();
  });

  it("keeps God Flame's recovery candidates and full trash visible during Security", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-068?effect=security&step=recovery");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-068" />
      </I18nProvider>,
    );

    expect(screen.getByText(/\[Security\] Activate this card's \[Main\] effect/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Azulongmon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Trial of the Four Great Dragons" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Agumon" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows source counts and disables Sourai's source-less opposing Digimon", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-067");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-067" />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: /Sourai · effect/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Paildramon, .*5 sources/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Coredramon, .*2 sources/ })).toBeTruthy();
    expect((screen.getByRole("button", { name: /Gabumon, .*0 sources/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Trash the top 4 digivolution cards/i)).toBeTruthy();
  });

  it("shows Sourai's resolved source removal and attack restriction in the match log", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-067?step=resolved");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-067" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/Removed Paildramon's sources/i)).toBeTruthy();
    expect(screen.getByText(/Paildramon and Gabumon can't attack until the end of the opponent's turn/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Inspect opponent Digimon: Paildramon" })).toBeTruthy();
  });

  it("shows Sourai Security activating the complete Main sequence at zero memory", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-067?effect=security");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-067" />
      </I18nProvider>,
    );

    expect(screen.getByText(/\[Security\] Activate this card's \[Main\] effect/i)).toBeTruthy();
    expect(screen.getByText(/with no digivolution cards can't attack/i)).toBeTruthy();
    expect(screen.getByRole("img", { name: "Memory: 0" })).toBeTruthy();
  });

  it("shows every opposing Digimon for Hyper Infinity Cannon's De-Digivolve choice", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-066");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-066" />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: /Hyper Infinity Cannon · effect/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /WarGreymon, .*4 sources/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Elecmon, .*0 sources/ })).toBeTruthy();
    expect(screen.getByText(/De-Digivolve 3/i)).toBeTruthy();
  });

  it("offers clear accept and decline actions for Hyper Infinity Cannon's Cyborg cost", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-066?step=optional");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-066" />
      </I18nProvider>,
    );

    expect(screen.getByText("Place a Cyborg card to delete a 6000 DP or lower Digimon?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
  });

  it("shows the complete hand and trash while enabling only Cyborg cost cards", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-066?step=cyborg");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-066" />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: "MetalGreymon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sealsdramon" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Agumon" }) as HTMLButtonElement).disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Trial of the Four Great Dragons" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("shows both level-6 Machine hosts with distinguishable source counts", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-066?step=host");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-066" />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /Machinedramon, .*1 source/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Machinedramon, .*0 sources/ })).toBeTruthy();
  });

  it("enables only 6000 DP or lower deletion targets after the Cyborg cost", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-066?step=delete");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-066" />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /Elecmon, 3,000 DP/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Gomamon, 6,000 DP/ })).toBeTruthy();
    expect((screen.getByRole("button", { name: /Gabumon, 7,000 DP/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /WarGreymon, 11,000 DP/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows Hyper Infinity Cannon Security activating the full Main effect at zero memory", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-066?effect=security");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-066" />
      </I18nProvider>,
    );

    expect(screen.getByText(/\[Security\] Activate this card's \[Main\] effect/i)).toBeTruthy();
    expect(screen.getByText(/delete 1 of your opponent's Digimon with 6000 DP or less/i)).toBeTruthy();
    expect(screen.getByRole("img", { name: "Memory: 0" })).toBeTruthy();
  });

  it("shows Hina's Dragon watcher with a friendly optional decision", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-065");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-065" />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: /Hina Kurihara · effect/i })).toBeTruthy();
    expect(screen.getByText("Activate Hina Kurihara's effect?")).toBeTruthy();
    expect(screen.getByText(/one of your Digimon digivolves into a Digimon with \[Rock Dragon\]/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Volcanicdramon" })).toBeTruthy();
  });

  it("shows Hina suspended and the reactivated On Play result", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-065?step=resolved");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-065" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/Suspended Hina Kurihara and activated Volcanicdramon's On Play effect/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Inspect opponent Digimon: Elecmon" })).toBeNull();
  });

  it("shows Hina's start-of-turn memory gain with its reason", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-065?step=start-turn");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-065" />
      </I18nProvider>,
    );

    expect(screen.getByRole("img", { name: "Memory: +1" })).toBeTruthy();
    expect(screen.getByText(/Memory 0 → 1 \(Hina Kurihara: opponent has a Digimon in play\)/i)).toBeTruthy();
  });

  it("shows Hina played from Security without spending memory", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-065?effect=security");

    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-065" />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: "Hina Kurihara" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Memory: 0" })).toBeTruthy();
    expect(screen.getByText(/1 card moved: security → battle area/i)).toBeTruthy();
  });

  it("shows Megidramon's ordinary and Trial-raised On Play boundaries", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-064");
    const view = render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-064" />
      </I18nProvider>,
    );
    expect(screen.getByText("Choose a level 5 or lower Digimon to delete")).toBeTruthy();
    expect((screen.getByRole("button", { name: /Groundramon, 7,000 DP/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: /WarGreymon, 10,000 DP/ }) as HTMLButtonElement).disabled).toBe(true);
    view.unmount();

    window.history.replaceState({}, "", "/dev/card-effects/EX3-064?effect=trial");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-064" />
      </I18nProvider>,
    );
    expect(screen.getByText("Choose a level 6 or lower Digimon to delete")).toBeTruthy();
    expect((screen.getByRole("button", { name: /WarGreymon, 10,000 DP/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: /Omnimon, 14,000 DP/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows Megidramon's friendly optional On Deletion actions", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-064?step=optional");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-064" />
      </I18nProvider>,
    );
    expect(screen.getByText("Place Trial of the Four Great Dragons in your battle area?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
  });

  it("shows the complete hand while only Trial is selectable", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-064?step=trial");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-064" />
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: "Select Trial of the Four Great Dragons" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Agumon" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows Trial placed without activating its Main draw", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-064?step=resolved");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-064" />
      </I18nProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Trial of the Four Great Dragons" })).toBeTruthy();
    expect(screen.getByText(/1 card moved: hand → battle area/i)).toBeTruthy();
    expect(screen.getAllByRole("img", { name: "deck · 36" })).toHaveLength(2);
  });

  it("shows Dragon Mode's DNA survivor decision to the opponent who must make it", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-063");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-063" />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: /Imperialdramon: Dragon Mode · effect/i })).toBeTruthy();
    expect(screen.getByText("Choose 1 of your Digimon to keep")).toBeTruthy();
    expect(screen.getByText(/Delete all of their other Digimon\. Then, Blitz/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Groundramon, 7,000 DP/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /WarGreymon, 10,000 DP/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Omnimon, 14,000 DP/ })).toBeTruthy();
  });

  it("shows Dragon Mode's optional Fighter Mode action after the DP bonus", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-063?effect=attack");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-063" />
      </I18nProvider>,
    );

    expect(screen.getByText("Digivolve into Imperialdramon: Fighter Mode?")).toBeTruthy();
    expect(screen.getByText(/gets \+2000 DP for the turn/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
  });

  it("shows every hand card while only Fighter Modes are selectable", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-063?effect=attack&step=fighter");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-063" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Imperialdramon: Dragon Mode · effect/i });
    expect(
      within(dialog).getAllByRole("button", { name: /Imperialdramon: Fighter Mode, copy [12] of 2/ }),
    ).toHaveLength(2);
    expect(
      (within(dialog).getByRole("button", { name: "Imperialdramon: Dragon Mode" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.getByText("DP 2K")).toBeTruthy();
  });

  it("shows WarGrowlmon's friendly optional play after both players mill", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-062");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-062" />
      </I18nProvider>,
    );

    expect(screen.getByText("Play 1 Guilmon or Takato Matsuki for free?")).toBeTruthy();
    expect(screen.getByText(/Trash the top 3 cards of both players' decks/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
    expect(screen.getByText(/6 cards moved: deck → trash/i)).toBeTruthy();
  });

  it("shows every hand and trash card while only exact Guilmon or Takato are selectable", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-062?step=choice");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-062" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /WarGrowlmon · effect/i });
    expect(within(dialog).getByRole("button", { name: "Takato Matsuki" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Guilmon" })).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: "Guilmon (X Antibody)" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((within(dialog).getByRole("button", { name: "MetalGreymon" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows that the opponent's five-card trash also unlocks WarGrowlmon", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-062?effect=opponent-threshold");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-062" />
      </I18nProvider>,
    );

    expect(screen.getByText("Play 1 Guilmon or Takato Matsuki for free?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "trash · 5" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "trash · 3" })).toBeTruthy();
  });

  it("shows Dinobeemon's DNA-only Paildramon action", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-061");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-061" />
      </I18nProvider>,
    );

    expect(screen.getByText("Play 1 Paildramon from your trash for free?")).toBeTruthy();
    expect(screen.getByText(/When DNA digivolving/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
  });

  it("shows the full trash while only Paildramon cards are selectable", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-061?step=paildramon");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-061" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Dinobeemon · effect/i });
    expect(within(dialog).getAllByRole("button", { name: "Paildramon" })).toHaveLength(2);
    expect((within(dialog).getByRole("button", { name: "Dinobeemon" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows Dinobeemon's optional On Deletion Wormmon action", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-061?effect=deletion");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-061" />
      </I18nProvider>,
    );

    expect(screen.getByText("Play 1 Wormmon from your trash for free?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "trash · 4" })).toBeTruthy();
  });

  it("shows both Wormmon copies and blocks every other deleted-stack card", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-061?effect=deletion&step=wormmon");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-061" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Dinobeemon · effect/i });
    expect(within(dialog).getAllByRole("button", { name: "Wormmon" })).toHaveLength(2);
    expect((within(dialog).getByRole("button", { name: "Dinobeemon" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(dialog).getByRole("button", { name: "DoKunemon" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("marks Imperialdramon as ready to attack an unsuspended target through Dinobeemon", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-061?effect=inherited");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-061" />
      </I18nProvider>,
    );

    const attacker = screen.getByRole("button", { name: "Imperialdramon: Dragon Mode" });
    expect(attacker.style.cursor).toBe("grab");
    expect(screen.getByRole("button", { name: "Inspect opponent Digimon: Elecmon" })).toBeTruthy();
  });

  it("offers a sourced ExTyrannomon as a friendly Blocker action", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-060");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-060" />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: "Block window" })).toBeTruthy();
    expect(screen.getByText(/Choose a <Blocker> to redirect the attack, or take the hit/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /ExTyrannomon, 9,000 DP, 1 source/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Take the attack — no block" })).toBeTruthy();
  });

  it("shows a source-less ExTyrannomon without an attack affordance or block prompt", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-060?effect=no-sources");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-060" />
      </I18nProvider>,
    );

    const exTyrannomon = screen.getByRole("button", { name: "ExTyrannomon" });
    expect(exTyrannomon.style.cursor).toBe("pointer");
    expect(screen.queryByRole("dialog", { name: "Block window" })).toBeNull();
  });

  it("shows DarkTyrannomon's ready suspension targets and blocks an already suspended Digimon", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-059");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-059" />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: /DarkTyrannomon · effect/i })).toBeTruthy();
    expect(screen.getByText("Choose an opposing Digimon to suspend")).toBeTruthy();
    expect((screen.getByRole("button", { name: /Elecmon, 2,000 DP/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: /Agumon, 2,000 DP/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: /Gabumon, 2,000 DP.*Suspended/i }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(screen.getByText(/2 cards moved: battle area → trash/i)).toBeTruthy();
  });

  it("shows both friendly Shadramon effect branches", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-058");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-058" />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: /Shadramon · effect/i })).toBeTruthy();
    expect(screen.getByText("Choose an effect")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Digivolve" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "DNA digivolve" })).toBeTruthy();
  });

  it("allows either non-red partner for Shadramon's Q3425 trash evolution", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-058?effect=trash&step=base");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-058" />
      </I18nProvider>,
    );

    expect((screen.getByRole("button", { name: /Wormmon, 2,000 DP/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: /Agumon, 2,000 DP/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: /Shadramon, 5,000 DP/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows the whole trash while only the red level 4 Free Digimon is selectable", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-058?effect=trash&step=card");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-058" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Shadramon · effect/i });
    expect((within(dialog).getByRole("button", { name: "Flamedramon" }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(dialog).getByRole("button", { name: "DarkTyrannomon" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(dialog).getByRole("button", { name: "Guilmon" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps incompatible hand cards visible during Shadramon's DNA result choice", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-058?effect=dna&step=result");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-058" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Shadramon · effect/i });
    expect((within(dialog).getByRole("button", { name: "Dinobeemon" }) as HTMLButtonElement).disabled).toBe(false);
    expect(
      (within(dialog).getByRole("button", { name: "Imperialdramon: Dragon Mode" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("shows all Flamedramon DNA partners and disables those that complete no printed recipe", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-008?step=partner");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-008" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Flamedramon · effect/i });
    const cards = within(dialog)
      .getAllByRole("button")
      .filter((button) => button.hasAttribute("aria-pressed"));
    expect(cards).toHaveLength(3);
    expect(
      (within(dialog).getByRole("button", { name: /Shadramon, 5,000 DP, 0 source/i }) as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(
      (within(dialog).getByRole("button", { name: /Shadramon, 5,000 DP, 1 source/i }) as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(
      (within(dialog).getByRole("button", { name: /Flamedramon, 5,000 DP, 0 source/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("keeps Flamedramon's DNA result decision usable on mobile", () => {
    mockMobile();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-008?step=result");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-008" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Flamedramon · effect/i });
    expect(within(dialog).getAllByRole("button", { name: /Paildramon, copy [12] of 2/ })).toHaveLength(2);
    expect((within(dialog).getByRole("button", { name: "Breakdramon" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps normal evolutions visible but disabled in Flamedramon's DNA result choice", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-008?step=result");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-008" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Flamedramon · effect/i });
    expect(within(dialog).getAllByRole("button", { name: /Paildramon, copy [12] of 2/ })).toHaveLength(2);
    expect((within(dialog).getByRole("button", { name: "Breakdramon" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("offers Shadramon's inherited end-of-turn DNA as one clear optional action", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-058?effect=inherited");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-058" />
      </I18nProvider>,
    );

    expect(screen.getByText("DNA digivolve at the end of your turn?")).toBeTruthy();
    expect(screen.getByText(/^\[End of Your Turn\]/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
  });

  it("shows Growlmon's 3000 DP deletion boundary and blocks larger Digimon", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-057");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-057" />
      </I18nProvider>,
    );

    expect(screen.getByText("Choose an opposing Digimon with 3000 DP or less to delete")).toBeTruthy();
    expect((screen.getByRole("button", { name: /Elecmon, 2,000 DP/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: /Guilmon, 3,000 DP/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: /Shadramon, 5,000 DP/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows Growlmon's no-deletion fallback as two friendly deck-to-trash events", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-057?effect=mill");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-057" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getAllByText(/2 cards moved: deck → trash/i)).toHaveLength(2);
  });

  it("offers Growlmon's inherited effect as a friendly optional action", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-057?effect=inherited");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-057" />
      </I18nProvider>,
    );

    expect(screen.getByText("Delete another Digimon to gain Security Attack +1?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
  });

  it("keeps Growlmon's inherited host visible but only allows another Digimon as the cost", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-057?effect=inherited&step=cost");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-057" />
      </I18nProvider>,
    );

    expect((screen.getByRole("button", { name: /Groundramon, 6,000 DP/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Guilmon, 2,000 DP/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: /Agumon, 2,000 DP/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows Guilmon's On Deletion boundary and keeps larger Digimon visibly blocked", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-056");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-056" />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: /Guilmon · effect/i })).toBeTruthy();
    expect(screen.getByText("Choose an opposing Digimon with 3000 DP or less to delete")).toBeTruthy();
    expect((screen.getByRole("button", { name: /Elecmon, 2,000 DP/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: /Guilmon, 3,000 DP/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: /Shadramon, 5,000 DP/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows Guilmon's no-target fallback moving 2 cards from each deck to trash", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-056?effect=mill");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-056" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getAllByText(/2 cards moved: deck → trash/i)).toHaveLength(2);
  });

  it("shows an Evade survivor suspended after Guilmon mills both decks", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-056?effect=evade");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-056" />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /Syakomon.*Suspended/i })).toBeTruthy();
    expect(screen.getAllByText(/2 cards moved: deck → trash/i)).toHaveLength(2);
  });

  it("shows Wormmon's full reveal while enabling only errata-eligible hand choices", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-055");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-055" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Wormmon · effect/i });
    expect(screen.getByText(/Choose 1 revealed purple or red Free or Imperialdramon card/i)).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: "Dinobeemon" }) as HTMLButtonElement).disabled).toBe(false);
    expect(
      (within(dialog).getByRole("button", { name: "Imperialdramon: Dragon Mode" }) as HTMLButtonElement).disabled,
    ).toBe(false);
    expect((within(dialog).getByRole("button", { name: "Agumon" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows Darkdramon's optional reduction as one friendly confirmation", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-054");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-054" />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: /Darkdramon · effect/i })).toBeTruthy();
    expect(screen.getByText(/Return D-Brigade cards from your trash to reduce the digivolution cost/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tankdramon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Yes, activate" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows all trash cards but enables only up to 5 D-Brigade choices for Darkdramon", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-054?step=select");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-054" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Darkdramon · effect/i });
    expect(screen.getByText(/Choose 1 to 5 D-Brigade cards/i)).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: "Commandramon" }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(dialog).getByRole("button", { name: "Sealsdramon" }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(dialog).getByRole("button", { name: "Cyberdramon" }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(dialog).getByRole("button", { name: "Tankdramon" }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(dialog).getByRole("button", { name: "Jazarichmon" }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(dialog).getByRole("button", { name: "Metallicdramon" }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(dialog).getByRole("button", { name: "Agumon" }) as HTMLButtonElement).disabled).toBe(true);
    for (const name of ["Commandramon", "Sealsdramon", "Cyberdramon", "Tankdramon", "Jazarichmon"]) {
      fireEvent.click(within(dialog).getByRole("button", { name }));
    }
    expect(within(dialog).getByText("5 chosen")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Metallicdramon" }));
    expect(within(dialog).getByRole("button", { name: "Metallicdramon, selected" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Commandramon" })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows friendly deck-top ordering controls for Darkdramon's returned cards", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-054?step=order");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-054" />
      </I18nProvider>,
    );

    expect(screen.getByText(/Arrange the cards in deck order/i)).toBeTruthy();
    expect(screen.getByText(/Number 1 will be nearest the top/i)).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: /Move card down/ })[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Confirm order" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Darkdramon suspended and blocks targets above the played Digimon's cost", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-054?effect=your-turn");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-054" />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /Darkdramon.*Suspended/i })).toBeTruthy();
    expect((screen.getByRole("button", { name: /Agumon, 2,000 DP/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: /Sealsdramon, 4,000 DP/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Agumon, 2,000 DP/ }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Darkdramon unsuspended after the D-Brigade trigger resolves", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-054?effect=resolved");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-054" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Darkdramon" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Darkdramon.*Suspended/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Agumon, 2,000 DP/ })).toBeNull();
    expect(screen.getByRole("button", { name: "trash · 1" })).toBeTruthy();
  });

  it("prevents Wormmon's hand choice from being selected again for the trash step", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-055?step=trash");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-055" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Wormmon · effect/i });
    expect((within(dialog).getByRole("button", { name: "Dinobeemon" }) as HTMLButtonElement).disabled).toBe(true);
    expect(
      (within(dialog).getByRole("button", { name: "Imperialdramon: Dragon Mode" }) as HTMLButtonElement).disabled,
    ).toBe(false);
    expect((within(dialog).getByRole("button", { name: "Agumon" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows Wormmon's remaining cards and friendly deck-bottom order controls", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-055?step=order");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-055" />
      </I18nProvider>,
    );

    expect(screen.getByText(/Arrange the cards in deck order/i)).toBeTruthy();
    expect(screen.getByText(/Number 1 will be nearest the top/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm order" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Move card down/ }).length).toBeGreaterThan(0);
  });

  it("shows Wormmon's inherited Retaliation on its live red host", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-055?effect=inherited");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-055" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Retaliation")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Dinobeemon/ })).toBeTruthy();
  });

  it("shows all 3 cards revealed by Tankdramon and enables only the eligible D-Brigade", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-051");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-051" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Tankdramon · effect/i });
    expect(screen.getByText(/Você pode jogar 1 Digimon D-Brigade com custo de jogo 5 ou menos/i)).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: "Sealsdramon" }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(dialog).getByRole("button", { name: "Tankdramon" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(dialog).getByRole("button", { name: "Hina Kurihara" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(dialog).getByRole("button", { name: "Sealsdramon" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Tankdramon's inherited reveal with only Commandramon enabled and allows declining", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-051?effect=inherited");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-051" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Tankdramon · effect/i });
    expect(screen.getByText(/Você pode jogar 1 Commandramon revelado sem pagar o custo/i)).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: "Commandramon" }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(dialog).getByRole("button", { name: "Agumon" }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(dialog).getByText("Select 0–1 target(s)")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "None" })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Cyberdramon's inherited +2000 DP while an allied Tamer is suspended", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-050");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-050" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    const battleArea = within(screen.getByRole("group", { name: "Your battle area" }));
    expect(battleArea.getByRole("button", { name: /Darkdramon, 14,000 DP, DP \+2K/i })).toBeTruthy();
    expect(battleArea.getByText("14K")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Hina Kurihara.*Suspended/i })).toBeTruthy();
    expect(screen.getByText((_, element) => element?.textContent === "↑DP 2K")).toBeTruthy();
  });

  it("removes Cyberdramon's inherited DP bonus while the allied Tamer is unsuspended", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-050?effect=inactive");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-050" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    const battleArea = within(screen.getByRole("group", { name: "Your battle area" }));
    expect(battleArea.getByRole("button", { name: "Darkdramon" })).toBeTruthy();
    expect(battleArea.getByText("12K")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hina Kurihara" })).toBeTruthy();
    expect(screen.queryByText((_, element) => element?.textContent === "↑DP 2K")).toBeNull();
  });

  it("shows Sealsdramon's Jamming keyword on the real board", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-049");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-049" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Sealsdramon" })).toBeTruthy();
    expect(screen.getByText("Jamming")).toBeTruthy();
  });

  it("shows Rush on the newly played D-Brigade and not on Sealsdramon's inherited host", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-049?effect=inherited");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-049" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Cyberdramon" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("button", { name: "Commandramon" }), { key: "Enter" });
    expect(screen.getAllByText("Rush")).toHaveLength(1);
    fireEvent.click(screen.getByText("Attack"));
    expect(screen.getByRole("button", { name: "security · 5" })).toBeTruthy();
  });

  it("shows all four Jazardmon reveals while requiring the eligible Dragon first", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-048");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-048" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Jazardmon · effect/i });
    expect(screen.getByText(/Escolha 1 Digimon com uma das traits Dragon indicadas/i)).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: "Jazamon" }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(dialog).getByRole("button", { name: "Hina Kurihara" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(dialog).getByRole("button", { name: "Agumon" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(dialog).getByRole("button", { name: "Agumon Expert" }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(dialog).queryByRole("button", { name: "None" })).toBeNull();
  });

  it("requires Hina after Jazardmon's Dragon category was added", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-048?step=hina");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-048" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Jazardmon · effect/i });
    expect(screen.getByText(/Escolha Hina Kurihara para adicionar à mão/i)).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: "Hina Kurihara" }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(dialog).getByRole("button", { name: "Jazamon" }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(dialog).queryByRole("button", { name: "None" })).toBeNull();
  });

  it("lets the player order Jazardmon's two remaining cards for the deck bottom", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-048?step=order");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-048" />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: /Jazardmon · effect/i })).toBeTruthy();
    expect(screen.getByText(/Escolha a ordem das cartas que irão para o fundo do baralho/i)).toBeTruthy();
    expect(screen.getByAltText("Agumon")).toBeTruthy();
    expect(screen.getByAltText("Agumon Expert")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Move card up/ })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /Move card down/ })).toHaveLength(2);
    expect(
      within(screen.getByRole("dialog"))
        .getAllByAltText(/Agumon/)
        .map((image) => (image as HTMLImageElement).alt),
    ).toEqual(["Agumon", "Agumon Expert"]);
    fireEvent.click(screen.getAllByRole("button", { name: /Move card up/ })[1]!);
    expect(
      within(screen.getByRole("dialog"))
        .getAllByAltText(/Agumon/)
        .map((image) => (image as HTMLImageElement).alt),
    ).toEqual(["Agumon Expert", "Agumon"]);
    fireEvent.click(screen.getByRole("button", { name: "Confirm order" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Jazardmon's inherited DP bonus only on the host with an On Play effect", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-048?effect=inherited");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-048" />
      </I18nProvider>,
    );

    const battleArea = within(screen.getByRole("group", { name: "Your battle area" }));
    expect(battleArea.getByRole("button", { name: /Jazarichmon, 8,000 DP, DP \+1K/i })).toBeTruthy();
    expect(battleArea.getByRole("button", { name: "Sealsdramon" })).toBeTruthy();
    expect(battleArea.getByText("8K")).toBeTruthy();
    expect(battleArea.getByText("4K")).toBeTruthy();
    expect(screen.getAllByText((_, element) => element?.textContent === "↑DP 1K")).toHaveLength(1);
  });

  it("shows Jazamon's memory gain after its controller plays Hina Kurihara", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-047");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-047" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Jazamon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hina Kurihara" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Memory: +1" })).toBeTruthy();
    expect(screen.getByText(/Memory 0 → 1 \(Jazamon: Hina Kurihara foi jogada\)/i)).toBeTruthy();
  });

  it("shows Jazamon's inherited DP bonus only on the host with an On Play effect", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-047?effect=inherited");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-047" />
      </I18nProvider>,
    );

    const battleArea = within(screen.getByRole("group", { name: "Your battle area" }));
    expect(battleArea.getByRole("button", { name: /Jazardmon, 5,000 DP, DP \+1K/i })).toBeTruthy();
    expect(battleArea.getByRole("button", { name: "Sealsdramon" })).toBeTruthy();
    expect(battleArea.getByText("5K")).toBeTruthy();
    expect(battleArea.getByText("4K")).toBeTruthy();
    expect(screen.getAllByText((_, element) => element?.textContent === "↑DP 1K")).toHaveLength(1);
  });

  it("offers every Commandramon Decoy with distinct source counts and a clear decline", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-046");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-046" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Commandramon · effect/i });
    expect(screen.getByText(/excluir este Digimon para impedir que o outro Digimon seja excluído/i)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: /Commandramon, 2,000 DP, 0 sources?/i })).toBeTruthy();
    const stacked = within(dialog).getByRole("button", { name: /Commandramon, 2,000 DP, 1 source/i });
    expect(stacked).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "None" })).toBeTruthy();
    fireEvent.click(stacked);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the selected Commandramon paid and the D-Brigade Digimon protected", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-046?effect=protected");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-046" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Commandramon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sealsdramon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "trash · 2" })).toBeTruthy();
    expect(screen.getByText(/2 cards moved: battle area → trash/i)).toBeTruthy();
  });

  it("shows the protected target deleted after declining Commandramon's Decoy", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-046?effect=declined");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-046" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getAllByRole("button", { name: /Commandramon/ })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Sealsdramon" })).toBeNull();
    expect(screen.getByRole("button", { name: "trash · 1" })).toBeTruthy();
    expect(screen.getByText(/1 card moved: battle area → trash/i)).toBeTruthy();
  });

  it("shows Parasaurmon's reducer as a friendly optional action that can be accepted or declined", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-040");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-040" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Parasaurmon · effect/i });
    expect(
      within(dialog).getByText(/Suspender Parasaurmon para reduzir em 1 o custo deste Digimon verde/i),
    ).toBeTruthy();
    expect(within(dialog).getByText(/by suspending this Digimon, reduce the cost by 1/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Yes, activate" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    cleanup();
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-040" />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "No, decline" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the second Parasaurmon reducer as a separate optional confirmation", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-040?effect=reducer");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-040" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Parasaurmon · effect/i });
    expect(within(dialog).getByText(/Suspender o segundo Parasaurmon.*em mais 1/i)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Yes, activate" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "No, decline" })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Yes, activate" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("records Parasaurmon's reduced play cost and identifies the suspended copy", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-040?effect=reduced");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-040" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("img", { name: "Memory: +2" })).toBeTruthy();
    expect(screen.getAllByRole("img", { name: "Parasaurmon" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Goblimon" })).toBeTruthy();
    expect(
      screen.getByText(/Memory 3 → 2 \(Goblimon foi jogado por custo 1 após a redução de Parasaurmon\)/i),
    ).toBeTruthy();
    expect(screen.getByText(/Parasaurmon foi suspenso e reduziu o custo de jogo em 1/i)).toBeTruthy();
  });

  it.each(["inactive", "suspended"])("does not prompt Parasaurmon's reducer when it is %s", (effect) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-040?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-040" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByRole("button", { name: effect === "suspended" ? /Parasaurmon.*Suspended/i : "Parasaurmon" }),
    ).toBeTruthy();
  });

  it("shows two active inherited targets and keeps a suspended Digimon visible but disabled", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-040?effect=inherited");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-040" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Parasaurmon · effect/i });
    expect(within(dialog).getByText(/When an effect suspends one of your Digimon/i)).toBeTruthy();
    expect(
      (within(dialog).getByRole("button", { name: /Elecmon, 2,000 DP, 0 sources/i }) as HTMLButtonElement).disabled,
    ).toBe(false);
    const gomamon = within(dialog).getByRole("button", { name: /Gomamon, 3,000 DP, 1 source/i });
    expect((gomamon as HTMLButtonElement).disabled).toBe(false);
    expect(
      (within(dialog).getByRole("button", { name: /Gabumon, 1,000 DP, Suspended, 0 sources/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.click(gomamon);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Parasaurmon's inherited resolution with the target suspended and a sourced log", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-040?effect=inherited-resolved");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-040" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Inspect opponent Digimon: Elecmon (Suspended)" })).toBeTruthy();
    expect(screen.getByText(/O efeito herdado de Parasaurmon suspendeu Elecmon/i)).toBeTruthy();
  });

  it.each(["offturn", "ineligible"])("does not trigger Parasaurmon for the %s case", (effect) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-040?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-040" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Parasaurmon" })).toBeTruthy();
  });

  it("shows Groundramon's end-turn DNA effect as a friendly optional confirmation", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-041");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-041" />
      </I18nProvider>,
    );

    expect(screen.getByText("DNA digievoluir Groundramon no fim do seu turno?")).toBeTruthy();
    expect(screen.getByText(/This Digimon and 1 of your other Digimon with \[Dramon\]/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Yes, activate" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("distinguishes both eligible Slayerdramon stacks and disables visible Breakdramon", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-041?effect=dna&step=partner");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-041" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Groundramon · effect/i });
    const oneSource = within(dialog).getByRole("button", { name: /Slayerdramon, 12,000 DP, 1 source/i });
    const twoSources = within(dialog).getByRole("button", { name: /Slayerdramon, 12,000 DP, 2 sources/i });
    expect((oneSource as HTMLButtonElement).disabled).toBe(false);
    expect((twoSources as HTMLButtonElement).disabled).toBe(false);
    expect(
      (within(dialog).getByRole("button", { name: /Breakdramon, 12,000 DP, 0 sources/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.click(twoSources);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("offers two Examon copies and keeps incompatible hand cards visible but disabled", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-041?effect=dna&step=result");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-041" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Groundramon · effect/i });
    const examon = within(dialog).getAllByRole("button", { name: /Examon, copy [12] of 2/ });
    expect(examon).toHaveLength(2);
    expect(examon.every((button) => !(button as HTMLButtonElement).disabled)).toBe(true);
    expect(
      (within(dialog).getByRole("button", { name: "Imperialdramon: Dragon Mode" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect((within(dialog).getByRole("button", { name: "Breakdramon" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(examon[1]!);
    expect(within(dialog).getByRole("button", { name: "Examon, copy 2 of 2, selected" })).toBeTruthy();
  });

  it("shows the resolved Examon stack assembled from both DNA materials", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-041?effect=resolved");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-041" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Examon" })).toBeTruthy();
    expect(screen.getByText(/Groundramon e Slayerdramon DNA digievoluíram em Examon/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Examon" }));
    expect(screen.getByRole("button", { name: /Groundramon Groundramon 7,000 DP/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Slayerdramon Slayerdramon 12,000 DP/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Paledramon Paledramon 5,000 DP/i })).toBeTruthy();
  });

  it("opens a block window for Groundramon's printed Blocker", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-041?effect=blocker");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-041" />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: "Block window" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Groundramon, 7,000 DP, 1 source/i })).toBeTruthy();
  });

  it.each([
    ["unsuspend", /ficou suspenso.*reativou uma vez/i, false],
    ["unsuspend-opt", /já usou.*Once Per Turn.*permaneceu suspenso/i, true],
    ["evade", /Evade herdado de Wingdramon.*reativou/i, false],
  ] as const)("shows Slayerdramon's %s orientation", (effect, log, suspended) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-024?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-024" />
      </I18nProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
    expect(screen.getByRole("button", { name: suspended ? "Slayerdramon (Suspended)" : "Slayerdramon" })).toBeTruthy();
  });

  it("shows Wingdramon as Slayerdramon's inherited Evade source", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-024?effect=evade");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-024" />
      </I18nProvider>,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Slayerdramon" }), { key: "Enter" });
    expect(screen.getByRole("img", { name: "Wingdramon" })).toBeTruthy();
  });

  it.each(["No, decline", "Yes, activate"])("offers Slayerdramon's Start of Opponent Main activation: %s", (action) => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-024");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-024" />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: /Slayerdramon · effect/i });
    expect(within(dialog).getByText(/Suspender 1.*Dramon ou Examon.*forçar um ataque/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: action }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows only Slayerdramon's legal cost permanents as actionable", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-024?effect=cost");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-024" />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: /Slayerdramon · effect/i });
    for (const name of ["Slayerdramon", "Wingdramon", "Examon"]) {
      expect((within(dialog).getByRole("button", { name: new RegExp(name) }) as HTMLButtonElement).disabled).toBe(
        false,
      );
    }
    expect((within(dialog).getByRole("button", { name: /WarGreymon/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it.each(["attacker-choice", "disabled-choice"])(
    "lets the opponent choose Slayerdramon's forced attacker for %s",
    (effect) => {
      mockDesktop();
      window.history.replaceState({}, "", `/dev/card-effects/EX3-024?effect=${effect}`);
      render(
        <I18nProvider>
          <CardEffectsDemo cardId="EX3-024" />
        </I18nProvider>,
      );
      const dialog = screen.getByRole("dialog", { name: /Slayerdramon · effect/i });
      const gomamon = within(dialog).getByRole("button", { name: /Gomamon, 3,000 DP/i });
      expect((gomamon as HTMLButtonElement).disabled).toBe(false);
      fireEvent.click(gomamon);
      fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
      expect(screen.queryByRole("dialog")).toBeNull();
    },
  );

  it.each([
    ["forced-attack", /Wingdramon foi suspenso.*oponente escolheu Gomamon.*ataque forçado/i],
    ["zero-opponent", /não havia Digimon do oponente.*sem ataque/i],
    ["disabled-resolved", /Digimon impedido de atacar.*escolha era válida.*nenhum ataque/i],
    ["declined", /recusada.*nenhum custo.*nenhum ataque/i],
    ["two-copies", /Duas cópias.*primeira iniciou.*segunda não criou/i],
    ["main-inherited", /principal e a cópia herdada.*segunda não pôde declarar/i],
    ["inherited", /efeito herdado.*Dolphmon.*suspendeu Wingdramon/i],
  ] as const)("shows Slayerdramon's %s resolved state", (effect, log) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-024?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-024" />
      </I18nProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
  });

  it.each(["inherited", "main-inherited"])("shows Slayerdramon in the %s source stack", (effect) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-024?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-024" />
      </I18nProvider>,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Dolphmon" }), { key: "Enter" });
    expect(screen.getAllByRole("img", { name: "Slayerdramon" }).length).toBeGreaterThan(0);
  });

  it("shows Slayerdramon's alternate evolution from Wingdramon", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-024?effect=alternate");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-024" />
      </I18nProvider>,
    );
    expect(screen.getByText(/digievoluiu de Wingdramon.*custo alternativo de 3/i)).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("button", { name: "Slayerdramon" }), { key: "Enter" });
    expect(screen.getByRole("img", { name: "Wingdramon" })).toBeTruthy();
  });

  it.each([
    ["trial-played", /Trial jogou Azulongmon.*comprou 2.*ganhou 2 de memória/i, 2, 34],
    ["effect-played", /Outro efeito jogou Azulongmon.*comprou 2.*não ganhou memória/i, 2, 34],
    ["manual", /jogado manualmente.*pagou 12.*comprou 2.*não ganhou/i, 2, 34],
    ["one-card-deck", /havia só 1 carta.*comprou apenas essa/i, 1, 0],
    ["empty-deck", /baralho vazio.*nenhuma carta foi comprada/i, 0, 0],
  ] as const)("shows Azulongmon's %s On Play state", (effect, log, hand, deck) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-025?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-025" />
      </I18nProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
    expect(screen.getByText(new RegExp(`hand ${hand}`, "i"))).toBeTruthy();
    expect(screen.getAllByRole("img", { name: `deck · ${deck}` }).length).toBeGreaterThan(0);
    expect(screen.getByText(`Turn 8 · memory ${effect === "trial-played" ? "+2" : "0"}`)).toBeTruthy();
  });

  it.each(["No, decline", "Yes, activate"])("offers Azulongmon's friendly On Deletion errata: %s", (action) => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-025");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-025" />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: /Azulongmon · effect/i });
    expect(within(dialog).getByText(/Colocar 1 Trial.*mão.*área de batalha/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: action }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("distinguishes Azulongmon's Trial copies and disables the unrelated hand card", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-025?effect=trial-choice");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-025" />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: /Azulongmon · effect/i });
    expect(within(dialog).getByRole("button", { name: /Trial of the Four Great Dragons, copy 1 of 2/i })).toBeTruthy();
    const second = within(dialog).getByRole("button", { name: /Trial of the Four Great Dragons, copy 2 of 2/i });
    expect((within(dialog).getByRole("button", { name: "Agumon" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(second);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Azulongmon's Q3402 result without activating Trial's Main draw", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-025?effect=accepted");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-025" />
      </I18nProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByText(/Q3402.*apenas colocou Trial.*Main.*Draw 1.*não foram ativados.*baralho ficou intacto/i),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Trial of the Four Great Dragons" })).toBeTruthy();
    expect(screen.getAllByRole("img", { name: "deck · 36" }).length).toBeGreaterThan(0);
  });

  it.each([
    ["declined", /opcional.*recusada.*permaneceram na mão/i],
    ["trial-in-play", /Já havia Trial.*não abriu uma ação/i],
    ["no-trial-hand", /Não havia Trial na mão.*não abriu uma escolha/i],
  ] as const)("shows Azulongmon's %s On Deletion boundary", (effect, log) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-025?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-025" />
      </I18nProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
  });

  it.each(["No, decline", "Yes, activate"])("offers Aegisdramon's friendly When Digivolving optional: %s", (action) => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-026");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-026" />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: /Aegisdramon · effect/i });
    expect(within(dialog).getByText(/Jogar 1 carta elegível.*fontes.*Digimon azuis.*sem pagar/i)).toBeTruthy();
    expect(within(dialog).getByText(/Aqua.*Sea Animal/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: action }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows every Aegisdramon source and disables the invalid level and host boundaries", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-026?effect=select");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-026" />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: /Aegisdramon · effect/i });
    for (const name of ["Gabumon", "Gizamon", "Seadramon"]) {
      expect((within(dialog).getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(false);
    }
    expect((within(dialog).getByRole("button", { name: "Paledramon" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(dialog).getByRole("button", { name: "Gomamon" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(dialog).getByRole("button", { name: "Gizamon" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each([
    ["resolved", /jogou Gizamon.*fontes de Dolphmon.*sem pagar.*somente a fonte escolhida/i, true],
    ["declined", /recusou.*nenhuma fonte saiu/i, false],
  ] as const)("shows Aegisdramon's %s When Digivolving result", (effect, log, played) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-026?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-026" />
      </I18nProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
    expect(screen.queryAllByRole("button", { name: "Gizamon" })).toHaveLength(played ? 1 : 0);
    fireEvent.keyDown(screen.getByRole("button", { name: "Dolphmon" }), { key: "Enter" });
    expect(screen.getByRole("img", { name: "Gabumon" })).toBeTruthy();
  });

  it.each([
    [
      "opponent-reactivate",
      /Reativar o efeito When Digivolving deste Aegisdramon/i,
      /When your opponent plays a Digimon/i,
    ],
    ["opponent-play", /efeito foi reativado.*Jogar 1 carta elegível/i, /You may play 1 blue level 3/i],
  ] as const)("keeps Aegisdramon's nested %s optional separate", (effect, prompt, text) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-026?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-026" />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: /Aegisdramon · effect/i });
    expect(within(dialog).getByText(prompt)).toBeTruthy();
    expect(within(dialog).getByText(text)).toBeTruthy();
  });

  it("shows the reactivated Aegisdramon selection with the same accessible filters", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-026?effect=opponent-select");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-026" />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: /Aegisdramon · effect/i });
    expect(within(dialog).getByRole("button", { name: "Gizamon" })).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: "Paledramon" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it.each([
    ["opponent-declined", /reativação opcional.*recusada.*nenhuma fonte/i],
    ["second-play", /segundo Digimon.*mesmo turno.*Once Per Turn.*não abriu nova ação/i],
    ["own-turn", /durante o turno de Aegisdramon.*watcher.*não ativou/i],
  ] as const)("shows Aegisdramon's %s negative without a modal", (effect, log) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-026?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-026" />
      </I18nProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
  });

  it("offers Aegisdramon's watcher again after the turn reset", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-026?effect=reset");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-026" />
      </I18nProvider>,
    );
    expect(screen.getByRole("dialog", { name: /Aegisdramon · effect/i })).toBeTruthy();
    expect(screen.getByText(/turno mudou.*nova jogada do oponente/i)).toBeTruthy();
  });

  it.each([
    ["inherited", "Examon", /Examon tem Examon no nome e recebeu Blocker de Groundramon/i, true],
    ["inherited-negative", "Omnimon", /não tem Dramon nem Examon no nome.*não concedeu Blocker/i, false],
  ])("shows Groundramon's inherited condition for %s", (effect, hostName, message, gainsBlocker) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-041?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-041" />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: hostName })).toBeTruthy();
    expect(screen.getByText(message)).toBeTruthy();
    const blocker = screen.queryByText("Blocker");
    expect(Boolean(blocker)).toBe(gainsBlocker);
  });

  it("shows only active opposing targets for suspended Toropiamon's When Digivolving effect", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-042");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-042" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Toropiamon · effect/i });
    expect(screen.getByText(/Toropiamon digievoluiu suspensa. Escolha 1 Digimon ativo do oponente/i)).toBeTruthy();
    expect(screen.getByText(/If this Digimon is suspended, suspend 1 of your opponent's Digimon/i)).toBeTruthy();
    expect(
      (within(dialog).getByRole("button", { name: /Elecmon, 3,000 DP, 0 sources/i }) as HTMLButtonElement).disabled,
    ).toBe(false);
    const gomamon = within(dialog).getByRole("button", { name: /Gomamon, 3,000 DP, 0 sources/i });
    expect((gomamon as HTMLButtonElement).disabled).toBe(false);
    expect(
      (within(dialog).getByRole("button", { name: /Gabumon, 1,000 DP, Suspended, 0 sources/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(within(dialog).queryByRole("button", { name: "None" })).toBeNull();
    fireEvent.click(gomamon);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("explains Toropiamon's inherited suspension trigger and keeps the source visible", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-042?effect=inherited");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-042" />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: /Toropiamon · effect/i })).toBeTruthy();
    expect(screen.getByText(/Um efeito suspendeu seu Digimon. Escolha 1 Digimon ativo do oponente/i)).toBeTruthy();
    expect(screen.getByText(/Once Per Turn.*When an effect suspends one of your Digimon/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Groundramon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pomumon (Suspended)" })).toBeTruthy();
  });

  it("shows Q3416 resolving after Evade suspends Toropiamon's host", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-042?effect=evade");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-042" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Groundramon (Suspended)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Inspect opponent Digimon: Elecmon (Suspended)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Inspect opponent Digimon: Gabumon" })).toBeTruthy();
    expect(screen.getByText(/Evade suspendeu Groundramon, então Toropiamon suspendeu Elecmon/i)).toBeTruthy();
  });

  it("opens no Toropiamon decision after digivolving from an active base", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-042?effect=inactive");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-042" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Toropiamon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Inspect opponent Digimon: Elecmon" })).toBeTruthy();
  });

  it("shows Entmon's Digisorption as one friendly optional confirmation", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-043");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-043" />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: /Entmon · effect/i })).toBeTruthy();
    expect(screen.getByText(/Usar Digisorption -3 de Entmon/i)).toBeTruthy();
    expect(screen.getByText(/you may suspend 1 of your Digimon to reduce the digivolution cost by 3/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
  });

  it("shows only active own Digimon as Entmon's mandatory Digisorption payment", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-043?effect=cost");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-043" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Entmon · effect/i });
    expect(screen.getByText(/Escolha 1 dos seus Digimon ativos para suspender e reduzir o custo em 3/i)).toBeTruthy();
    const entmon = within(dialog).getByRole("button", { name: /Entmon, 8,000 DP, 1 source/i });
    const pomumon = within(dialog).getByRole("button", { name: /Pomumon, 2,000 DP, 0 sources/i });
    expect((entmon as HTMLButtonElement).disabled).toBe(false);
    expect((pomumon as HTMLButtonElement).disabled).toBe(false);
    expect(
      (within(dialog).getByRole("button", { name: /Mushroomon, 2,000 DP, Suspended, 0 sources/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(within(dialog).queryByRole("button", { name: "None" })).toBeNull();
    fireEvent.click(pomumon);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Entmon's reduced cost and successful unsuspension at the threshold", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-043?effect=reduced");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-043" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("img", { name: "Memory: 0" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Entmon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pomumon (Suspended)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mushroomon" })).toBeTruthy();
    expect(screen.getByText(/Entmon contou consigo mesma e 1 aliado suspenso, então foi dessuspensa/i)).toBeTruthy();
    expect(screen.getByText(/Memory 1 → 0 \(Entmon: Digisorption reduziu o custo de evolução em 3\)/i)).toBeTruthy();
  });

  it("keeps Entmon suspended below the threshold after declining Digisorption", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-043?effect=threshold");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-043" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("img", { name: "Memory: -3" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Entmon (Suspended)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pomumon" })).toBeTruthy();
    expect(screen.getByText(/Memory 1 → -3 \(Entmon: Digisorption recusada; custo completo pago\)/i)).toBeTruthy();
  });

  it("shows only active opposing targets for Breakdramon's mandatory suspension", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-044");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-044" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Breakdramon · effect/i });
    expect(screen.getByText(/Escolha 1 Digimon ativo do oponente para suspender/i)).toBeTruthy();
    const elecmon = within(dialog).getByRole("button", { name: /Elecmon, 2,000 DP, 0 sources/i });
    const agumon = within(dialog).getByRole("button", { name: /Agumon, 2,000 DP, 0 sources/i });
    expect((elecmon as HTMLButtonElement).disabled).toBe(false);
    expect((agumon as HTMLButtonElement).disabled).toBe(false);
    expect(
      (within(dialog).getByRole("button", { name: /Gabumon, 2,000 DP, Suspended, 0 sources/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(within(dialog).queryByRole("button", { name: "None" })).toBeNull();
    fireEvent.click(agumon);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Breakdramon surviving battle and trashing the top security card", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-044?effect=security");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-044" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Breakdramon (Suspended)" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "security · 4" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "trash · 2" })).toBeTruthy();
    expect(screen.getByText(/Breakdramon venceu a batalha e descartou a carta do topo da segurança/i)).toBeTruthy();
    expect(screen.getByText(/1 card moved: security → trash/i)).toBeTruthy();
  });

  it("shows Breakdramon's inherited security effect on a distinct host", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-044?effect=inherited");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-044" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Wingdramon (Suspended)" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "security · 4" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "trash · 2" })).toBeTruthy();
    expect(screen.getByText(/O efeito herdado de Breakdramon descartou a carta do topo da segurança/i)).toBeTruthy();
  });

  it("shows Hydramon's optional suspension with friendly accept and decline actions", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-045");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-045" />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: /Hydramon · effect/i })).toBeTruthy();
    expect(screen.getByText(/Ativar o efeito de Hydramon para suspender 1 Digimon/i)).toBeTruthy();
    expect(screen.getByText("[When Digivolving] You may suspend 1 Digimon.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, activate" })).toBeTruthy();
  });

  it("lets Hydramon suspend any active Digimon and disables an already suspended target", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-045?effect=suspend");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-045" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Hydramon · effect/i });
    expect(screen.getByText(/Escolha 1 Digimon ativo para suspender/i)).toBeTruthy();
    expect(
      (within(dialog).getByRole("button", { name: /Hydramon, 13,000 DP, 1 source/ }) as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(
      (within(dialog).getByRole("button", { name: /Pomumon, 2,000 DP, 0 sources/ }) as HTMLButtonElement).disabled,
    ).toBe(false);
    const elecmon = within(dialog).getByRole("button", { name: /Elecmon, 2,000 DP, 1 source/ });
    expect((elecmon as HTMLButtonElement).disabled).toBe(false);
    expect(
      (within(dialog).getByRole("button", { name: /Gabumon, 2,000 DP, Suspended, 0 sources/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(within(dialog).queryByRole("button", { name: "None" })).toBeNull();
    fireEvent.click(elecmon);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Hydramon's memory gain from suspended Vegetation and Fairy allies", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-045?effect=memory");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-045" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("img", { name: "Memory: +2" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Hydramon.*Suspended/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Pomumon.*Suspended/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Tinkermon.*Suspended/i })).toBeTruthy();
    expect(
      screen.getByText(/Memory 0 → 2 \(Hydramon: 2 outros Digimon Vegetation\/Fairy estão suspensos\)/i),
    ).toBeTruthy();
  });

  it("shows only suspended opposing targets for Hydramon's mandatory end-turn return", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-045?effect=end-turn");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-045" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Hydramon · effect/i });
    expect(screen.getByText(/Escolha 1 Digimon suspenso do oponente para devolver ao fundo do baralho/i)).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: /Elecmon.*Suspended/i }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect((within(dialog).getByRole("button", { name: /Gabumon.*Suspended/i }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect(
      (within(dialog).getByRole("button", { name: /Agumon, 2,000 DP, 0 sources/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(within(dialog).queryByRole("button", { name: "None" })).toBeNull();
  });

  it("shows Hydramon's returned target at deck bottom and its source in trash", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-045?effect=returned");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-045" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: "Elecmon" })).toBeNull();
    expect(screen.getByRole("button", { name: /Gabumon.*Suspended/i })).toBeTruthy();
    expect(screen.getByRole("img", { name: "deck · 37" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "trash · 1" })).toBeTruthy();
    expect(screen.getByText(/1 card moved: battle area → deck/i)).toBeTruthy();
    expect(screen.getByText(/1 card moved: digivolutionCards → trash/i)).toBeTruthy();
  });

  it("shows both inherited reveal cards in trash after declining Commandramon per Q3419", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-051?effect=inherited&step=declined");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-051" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "trash · 2" })).toBeTruthy();
    expect(screen.getByText(/2 cards moved: deck → trash/i)).toBeTruthy();
  });

  it("shows Jazarichmon's De-Digivolve choice with distinct stacks and blocks level 3", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-052");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-052" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Jazarichmon · effect/i });
    expect(screen.getByText(/Escolha 1 Digimon do oponente para receber De-Digivolve 1/i)).toBeTruthy();
    expect(
      (
        within(dialog).getByRole("button", {
          name: /Metallicdramon, 12,000 DP, 1 source, copy 1 of 2$/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    expect(
      (within(dialog).getByRole("button", { name: /Metallicdramon, 12,000 DP, 2 sources/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect((within(dialog).getByRole("button", { name: /Commandramon, 2,000 DP/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.click(within(dialog).getByRole("button", { name: /Metallicdramon, 12,000 DP, 1 source, copy 1 of 2$/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Jazarichmon's Hina clause as one friendly optional confirmation", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-052?step=hina");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-052" />
      </I18nProvider>,
    );

    expect(screen.getByRole("dialog", { name: /Jazarichmon · effect/i })).toBeTruthy();
    expect(screen.getByText(/Jogar Hina Kurihara da sua mão sem pagar o custo/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Select Hina Kurihara" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "No, decline" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Yes, activate" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Hina in play after Jazarichmon's optional clause resolves", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-052?step=resolved");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-052" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Hina Kurihara" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Jazarichmon" })).toBeTruthy();
  });

  it("shows Jazarichmon's inherited Security Attack on a host with an On Play effect", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-052?effect=inherited");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-052" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Metallicdramon" })).toBeTruthy();
    expect(screen.getByText("Security Attack")).toBeTruthy();
  });

  it("shows Metallicdramon's friendly post-De-Digivolve deletion choice and disables expensive targets", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-053");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-053" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Metallicdramon · effect/i });
    expect(screen.getByText(/Escolha 1 Digimon do oponente com custo de jogo 5 ou menos/i)).toBeTruthy();
    expect(
      (within(dialog).getByRole("button", { name: /Sealsdramon, 4,000 DP, 0 sources/ }) as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(
      (
        within(dialog).getByRole("button", {
          name: /Sealsdramon, 4,000 DP, 1 source, copy 2 of 2$/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    expect((within(dialog).getByRole("button", { name: /Cyberdramon, 7,000 DP/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.click(within(dialog).getByRole("button", { name: /Sealsdramon, 4,000 DP, 0 sources/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Metallicdramon's resolved deletion in the opponent's trash", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-053?effect=resolved");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-053" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "trash · 1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Inspect opponent Digimon: Sealsdramon" })).toBeTruthy();
  });

  it("shows Metallicdramon's opponent-turn Blocker and Reboot while Hina is in play", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-053?effect=keywords");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-053" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: /Metallicdramon.*Suspended/i })).toBeTruthy();
    expect(screen.getByText("Blocker")).toBeTruthy();
    expect(screen.getByText("Reboot")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hina Kurihara" })).toBeTruthy();
  });

  it("opens Coredramon's printed Blocker window with explicit accept and decline actions", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-039");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-039" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: "Block window" });
    fireEvent.click(within(dialog).getByRole("button", { name: /Coredramon, 6,000 DP, 0 sources/i }));
    expect(screen.queryByRole("dialog")).toBeNull();

    cleanup();
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-039" />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Take the attack — no block" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Coredramon suspended and surviving after it blocks", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-039?effect=blocked");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-039" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: /Coredramon.*Suspended/i })).toBeTruthy();
    expect(screen.getByText(/Attack was blocked/i)).toBeTruthy();
  });

  it("keeps Coredramon active and reduces security after declining the block", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-039?effect=declined");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-039" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Coredramon" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "security · 4" })).toBeTruthy();
    expect(screen.getByText(/Security check on you revealed Agumon.*battle/i)).toBeTruthy();
  });

  it.each([
    ["inherited", "Wingdramon", /Wingdramon tem Dramon no nome e recebeu Blocker de Coredramon/i, true],
    ["inherited-negative", "Omnimon", /não tem Dramon nem Examon no nome.*não concedeu Blocker/i, false],
  ])("shows Coredramon's inherited name condition for %s", (effect, hostName, message, opensWindow) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-039?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-039" />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: hostName })).toBeTruthy();
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.getByText(/\[All Turns\].*gains ＜Blocker＞/i)).toBeTruthy();
    expect(Boolean(screen.queryByRole("dialog", { name: "Block window" }))).toBe(opensWindow);
    expect(screen.queryAllByRole("button", { name: /Wingdramon, 7,000 DP, 1 source/i })).toHaveLength(
      opensWindow ? 1 : 0,
    );
  });

  it("keeps EX3-039 as Wingdramon's source and restores inherited Blocker after Armor Purge", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-039?effect=promoted");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-039" />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /Wingdramon, 7,000 DP, 1 source/i })).toBeTruthy();
    expect(screen.getByText(/Após Armor Purge.*Coredramon como fonte.*passou a ter Blocker/i)).toBeTruthy();
    expect(screen.getByText(/\[All Turns\].*Dramon.*Examon.*gains ＜Blocker＞/i)).toBeTruthy();
  });

  it("shows Pomumon's mandatory Your Turn target choice with live accessible state", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-038");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-038" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Pomumon · effect/i });
    expect(within(dialog).getByText("Escolha 1 Digimon ativo do oponente para suspender.")).toBeTruthy();
    expect(within(dialog).getByText(/\[Your Turn\] When an effect suspends this Digimon/i)).toBeTruthy();
    const elecmon = within(dialog).getByRole("button", { name: /Elecmon, 2,000 DP, 0 sources/i });
    expect(within(dialog).getByRole("button", { name: /Gabumon, 2,000 DP, 1 source/i })).toBeTruthy();
    const suspended = within(dialog).getByRole("button", {
      name: /Agumon, 2,000 DP, Suspended, 0 sources/i,
    }) as HTMLButtonElement;
    expect(suspended.disabled).toBe(true);

    fireEvent.click(elecmon);
    expect(
      within(dialog)
        .getByRole("button", { name: /Elecmon.*selected/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Pomumon and its chosen target suspended after resolution with a sourced log", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-038?effect=resolved");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-038" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: /Pomumon.*Suspended/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Gabumon.*Suspended/i })).toBeTruthy();
    expect(screen.getByText(/Pomumon's \[Your Turn\] effect suspended Gabumon/i)).toBeTruthy();
  });

  it.each([
    ["not-effect", /suspended by a game action, not an effect.*did not trigger/i],
    ["opponent-turn", /suspended during the opponent's turn.*\[Your Turn\].*did not trigger/i],
  ])("does not open Pomumon's trigger for %s", (effect, explanation) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-038?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-038" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: /Pomumon.*Suspended/i })).toBeTruthy();
    expect(screen.getByText(explanation)).toBeTruthy();
  });

  it("does not open an impossible Pomumon prompt when every opposing Digimon is already suspended", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-038?effect=no-active-targets");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-038" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: /Elecmon.*Suspended/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Gabumon.*Suspended/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Agumon.*Suspended/i })).toBeTruthy();
  });

  it("shows all four Dracomon reveals while requiring the Dramon category first", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-037");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-037" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Dracomon · effect/i });
    expect(within(dialog).getByText(/Escolha 1 carta verde ou azul com Dramon no nome/i)).toBeTruthy();
    expect(within(dialog).getByText(/Reveal the top 4 cards of your deck/i)).toBeTruthy();
    const wingdramon = within(dialog).getByRole("button", { name: "Wingdramon" });
    expect((within(dialog).getByRole("button", { name: "Examon" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(dialog).getByRole("button", { name: "Agumon" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(dialog).getByRole("button", { name: "Gabumon" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(wingdramon);
    expect(within(dialog).getByRole("button", { name: /Wingdramon.*selected/i })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("requires Examon after Dracomon's Dramon category was added to hand", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-037?step=examon");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-037" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Dracomon · effect/i });
    expect(within(dialog).getByText(/Escolha 1 carta com Examon no nome/i)).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: "Examon" }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(dialog).getByRole("button", { name: "Wingdramon" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/hand 1/i)).toBeTruthy();
  });

  it("reorders Dracomon's remaining cards with card-specific accessible actions", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-037?step=order");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-037" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Dracomon · effect/i });
    expect(
      within(dialog)
        .getAllByAltText(/Agumon|Gabumon/)
        .map((image) => image.getAttribute("alt")),
    ).toEqual(["Agumon", "Gabumon"]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Move card up — Gabumon, 2" }));
    expect(
      within(dialog)
        .getAllByAltText(/Agumon|Gabumon/)
        .map((image) => image.getAttribute("alt")),
    ).toEqual(["Gabumon", "Agumon"]);
    expect(within(dialog).getByRole("button", { name: "Move card down — Gabumon, 1" })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm order" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Dracomon's completed reveal with hand and sourced resolution log", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-037?effect=resolved");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-037" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/hand 2/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Select Wingdramon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Select Examon" })).toBeTruthy();
    expect(screen.getByText(/Dracomon adicionou Wingdramon e Examon.*fundo do baralho/i)).toBeTruthy();
  });

  it.each([
    ["no-dramon", "Examon", 0],
    ["no-examon", "Wingdramon", 0],
    ["no-categories", "Confirm order", 4],
  ])("skips Dracomon's unavailable category for %s", (effect, actionName, orderActionCount) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-037?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-037" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Dracomon · effect/i });
    expect(within(dialog).getByRole("button", { name: actionName })).toBeTruthy();
    expect(within(dialog).queryAllByRole("button", { name: /Move card up/ })).toHaveLength(orderActionCount);
  });

  it.each([
    ["inherited", /Examon foi suspenso.*concedeu \+1000 DP/i],
    ["inherited-opt", /Dois Digimon elegíveis.*Once Per Turn.*apenas \+1000 DP/i],
  ])("shows Dracomon's inherited DP bonus for %s without stacking", (effect, log) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-037?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-037" />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /Wingdramon, 8,000 DP, DP \+1K/i })).toBeTruthy();
    expect(screen.getByText(log)).toBeTruthy();
    expect(screen.getByText(/\[All Turns\]\[Once Per Turn\].*gets \+1000 DP/i)).toBeTruthy();
  });

  it("does not grant Dracomon's inherited bonus when the suspended Digimon has no eligible name", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-037?effect=inherited-negative");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-037" />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: "Wingdramon" })).toBeTruthy();
    expect(screen.getByText(/Elecmon não tem Dramon nem Examon.*não concedeu \+1000 DP/i)).toBeTruthy();
  });

  it("shows Magnadramon's global Security Attack -1 without inventing a target decision", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-036");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-036" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: /Magnadramon/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Inspect opponent Digimon: Elecmon/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Inspect opponent Digimon: Gabumon/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Inspect opponent Digimon: Agumon/ })).toBeTruthy();
    expect(screen.getByText(/todos os Digimon do oponente receberam Security Attack -1.*fim do turno/i)).toBeTruthy();
    expect(screen.getByText(/\[On Play\] All of your opponent's Digimon gain.*Security Attack -1/i)).toBeTruthy();
  });

  it("shows Magnadramon's Trial replacement as global Security Attack -2 instead", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-036?effect=trial");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-036" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Trial of the Four Great Dragons" })).toBeTruthy();
    expect(screen.getByText(/jogada pelo efeito de Trial.*todos.*Security Attack -2.*fim do turno/i)).toBeTruthy();
    expect(
      screen.getByText(/played by \[Trial of the Four Great Dragons\].*Security Attack -2.*instead/i),
    ).toBeTruthy();
  });

  it("shows Magnadramon's Security Attack reduction expired after the opponent's turn", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-036?effect=expired");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-036" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/turno do oponente terminou.*redução.*expirou para todos/i)).toBeTruthy();
  });

  it.each([
    ["No, decline", false],
    ["Yes, activate", true],
  ])("offers Magnadramon's friendly On Deletion action: %s", (actionName, accepts) => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-036?effect=on-deletion");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-036" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Magnadramon · effect/i });
    expect(within(dialog).getByText(/Colocar 1 Trial of the Four Great Dragons.*área de batalha/i)).toBeTruthy();
    expect(within(dialog).getByText(/\[On Deletion\].*If you don't have.*you may place 1 \[Trial/i)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "No, decline" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Yes, activate" })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: actionName }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(typeof accepts).toBe("boolean");
  });

  it("shows both Trial copies as eligible and keeps the filler visible but disabled", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-036?effect=trial-choice");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-036" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Magnadramon · effect/i });
    const firstTrial = within(dialog).getByRole("button", {
      name: "Trial of the Four Great Dragons, copy 1 of 2",
    });
    const secondTrial = within(dialog).getByRole("button", {
      name: "Trial of the Four Great Dragons, copy 2 of 2",
    });
    expect((within(dialog).getByRole("button", { name: "Agumon" }) as HTMLButtonElement).disabled).toBe(true);
    expect(firstTrial).toBeTruthy();
    fireEvent.click(secondTrial);
    expect(
      within(dialog).getByRole("button", { name: /Trial of the Four Great Dragons, copy 2 of 2, selected/i }),
    ).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each([
    ["accepted", /colocou 1 Trial of the Four Great Dragons.*área de batalha/i, 2],
    ["declined", /colocação opcional.*foi recusada.*permaneceram na mão/i, 3],
  ])("shows Magnadramon's %s On Deletion result", (effect, log, handCount) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-036?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-036" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "trash · 1" })).toBeTruthy();
    expect(screen.getByText(new RegExp(`hand ${handCount}`, "i"))).toBeTruthy();
    expect(screen.getByText(log)).toBeTruthy();
    expect(screen.queryAllByRole("button", { name: "Trial of the Four Great Dragons" })).toHaveLength(
      effect === "accepted" ? 1 : 0,
    );
  });

  it.each([
    ["trial-in-play", /Já havia uma Trial.*efeito On Deletion não abriu/i, true],
    ["no-trial-hand", /Não havia Trial.*na mão.*nenhuma ação/i, false],
  ])("does not open Magnadramon's impossible On Deletion action for %s", (effect, log, trialInPlay) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-036?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-036" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
    expect(Boolean(screen.queryByRole("button", { name: "Trial of the Four Great Dragons" }))).toBe(trialInPlay);
  });

  it("shows Airdramon's private security search with every own card as one mandatory choice", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-029");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-029" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Airdramon · effect/i });
    expect(within(dialog).getByText(/Escolha 1 carta da sua segurança.*revelar.*adicionar à mão/i)).toBeTruthy();
    expect(within(dialog).getByText(/Search your security stack.*If it's a yellow card/i)).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: "Tsukaimon" }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(dialog).getByRole("button", { name: "Monodramon" }) as HTMLButtonElement).disabled).toBe(false);
    const gryphonmon = within(dialog).getByRole("button", { name: "Gryphonmon" });
    expect((gryphonmon as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(gryphonmon);
    expect(within(dialog).getByRole("button", { name: /Gryphonmon, selected/i })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each([
    ["yellow", /revelou Tsukaimon.*carta amarela.*Recovery \+1.*embaralhada.*oculta/i],
    ["multicolor", /revelou Gryphonmon.*multicolorida.*amarela.*Recovery \+1.*embaralhada.*oculta/i],
  ] as const)("shows Airdramon's %s Recovery result without revealing the unchosen cards", (effect, log) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-029?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-029" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
    expect(screen.getByText(/hand 1/i)).toBeTruthy();
    expect(screen.getByLabelText("security · 2")).toBeTruthy();
    expect(screen.getByRole("img", { name: "deck · 34" })).toBeTruthy();
    expect(
      screen.getByText(`You revealed ${effect === "yellow" ? "Tsukaimon" : "Gryphonmon"} with Airdramon`),
    ).toBeTruthy();
    expect(screen.queryByText(effect === "yellow" ? "Gryphonmon" : "Tsukaimon")).toBeNull();
  });

  it("shows Airdramon's non-yellow choice without Recovery while still shuffling security", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-029?effect=non-yellow");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-029" />
      </I18nProvider>,
    );

    expect(
      screen.getByText(/revelou Monodramon.*não era amarela.*não houve Recovery.*embaralhada.*oculta/i),
    ).toBeTruthy();
    expect(screen.getByText(/hand 1/i)).toBeTruthy();
    expect(screen.getByLabelText("security · 2")).toBeTruthy();
    expect(screen.getByRole("img", { name: "deck · 35" })).toBeTruthy();
    expect(screen.queryByText("Tsukaimon")).toBeNull();
    expect(screen.queryByText("Gryphonmon")).toBeNull();
  });

  it("explains Airdramon's yellow selection when an empty deck cannot recover", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-029?effect=yellow-empty-deck");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-029" />
      </I18nProvider>,
    );

    expect(
      screen.getByText(/revelou Tsukaimon.*baralho estava vazio.*Recovery \+1 não moveu carta.*embaralhada/i),
    ).toBeTruthy();
    expect(screen.getByLabelText("security · 2")).toBeTruthy();
    expect(screen.getByRole("img", { name: "deck · 0" })).toBeTruthy();
  });

  it("does not open an impossible Airdramon choice when security is empty", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-029?effect=empty-security");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-029" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByText(/segurança estava vazia.*não abriu uma escolha impossível.*baralho permaneceu intacto/i),
    ).toBeTruthy();
    expect(screen.getByLabelText("security · 0")).toBeTruthy();
    expect(screen.getByRole("img", { name: "deck · 35" })).toBeTruthy();
  });

  it.each([
    ["dragon", /Goldramon foi jogado.*efeito herdado de Agumon comprou 1 carta/i, "Goldramon"],
    ["trial", /Trial.*colocada.*efeito herdado de Agumon comprou 1 carta/i, "Trial of the Four Great Dragons"],
  ] as const)("shows EX3-027's automatic %s draw without inventing a decision", (effect, log, permanentName) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-027?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-027" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: permanentName })).toBeTruthy();
    expect(screen.getByText(log)).toBeTruthy();
    expect(screen.getByText(/hand 1/i)).toBeTruthy();
    expect(screen.getByRole("img", { name: "deck · 35" })).toBeTruthy();
  });

  it.each([
    ["dragon-then-trial", /Goldramon.*primeiro.*Trial.*depois.*cota compartilhada.*Once Per Turn.*1 carta/i],
    ["trial-then-dragon", /Trial.*primeiro.*Goldramon.*depois.*cota compartilhada.*Once Per Turn.*1 carta/i],
  ] as const)("shares EX3-027's Once Per Turn for %s", (effect, log) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-027?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-027" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Goldramon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Trial of the Four Great Dragons" })).toBeTruthy();
    expect(screen.getByText(log)).toBeTruthy();
    expect(screen.getByText(/hand 1/i)).toBeTruthy();
  });

  it("shows two inherited EX3-027 copies drawing independently from one event", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-027?effect=two-copies");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-027" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Liollmon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reppamon" })).toBeTruthy();
    expect(screen.getByText(/Duas cópias herdadas de Agumon.*mesmo Goldramon.*2 cartas/i)).toBeTruthy();
    expect(screen.getByText(/hand 2/i)).toBeTruthy();
    expect(screen.getByRole("img", { name: "deck · 34" })).toBeTruthy();
  });

  it("makes EX3-027 visible in its host's accessible stack viewer", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-027?effect=dragon");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-027" />
      </I18nProvider>,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: "Liollmon" }), { key: "Enter" });
    expect(screen.getByRole("img", { name: "Agumon" })).toBeTruthy();
  });

  it.each([
    ["next-turn", /troca de turno.*Once Per Turn.*renovado.*segunda compra/i, 2, 34],
    ["opponent-turn", /turno do oponente.*Your Turn.*não comprou/i, 0, 36],
    ["unrelated", /Gabumon não possui Four Great Dragons.*não comprou/i, 0, 36],
    ["empty-deck", /baralho estava vazio.*nenhuma carta foi comprada/i, 0, 0],
  ] as const)("shows EX3-027's %s boundary without a modal", (effect, log, hand, deck) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-027?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-027" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
    expect(screen.getByText(new RegExp(`hand ${hand}`, "i"))).toBeTruthy();
    expect(screen.getAllByRole("img", { name: `deck · ${deck}` }).length).toBeGreaterThan(0);
  });

  it("shows Patamon's errata reveal and disables Three Great Angels plus the second slot", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-028");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-028" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Patamon · effect/i });
    expect(
      within(dialog).getByText(/Angel, Cherub, Throne, Authority, Seraph ou Virtue.*exceto Three Great Angels/i),
    ).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: "SlashAngemon" }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(dialog).getByRole("button", { name: "Seraphimon" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(dialog).getByRole("button", { name: "Azulongmon" }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(dialog).getByText(/other than \[Three Great Angels\]/i)).toBeTruthy();
  });

  it("requires Patamon's Four Great Dragons slot after the first mandatory addition", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-028?step=dragon");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-028" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Patamon · effect/i });
    expect((within(dialog).getByRole("button", { name: "Azulongmon" }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(dialog).getByRole("button", { name: "SlashAngemon" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it.each([
    ["no-dragon", 3],
    ["no-categories", 4],
  ] as const)("applies Patamon's Q3403 boundary for %s", (effect, count) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-028?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-028" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Patamon · effect/i });
    expect(within(dialog).getByText(/Escolha a ordem/i)).toBeTruthy();
    expect(within(dialog).getAllByRole("button", { name: /Move/i })).toHaveLength(count * 2);
  });

  it("Q3403 still requires Patamon's sole Four Great Dragons card when no Angel-family card is eligible", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-028?effect=no-angel");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-028" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Patamon · effect/i });
    expect(within(dialog).getByText(/Escolha 1 carta com Four Great Dragons/i)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Azulongmon" })).toBeTruthy();
  });

  it("shows Patamon's color and Three Great Angels filter boundaries without offering either card", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-028?effect=filter-boundary");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-028" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Patamon · effect/i });
    expect(within(dialog).getByText(/Nenhuma carta era elegível/i)).toBeTruthy();
    expect(within(dialog).getAllByRole("button", { name: /Move/i })).toHaveLength(6);
    expect(within(dialog).getAllByText("Cherubimon")).toHaveLength(2);
  });

  it("Q3404 orders exactly Patamon's two cards remaining after both mandatory additions", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-028?step=order");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-028" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Patamon · effect/i });
    expect(within(dialog).getAllByRole("button", { name: /Move/i })).toHaveLength(4);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm order" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("orders the single remaining card when Patamon reveals a three-card deck", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-028?effect=short-deck");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-028" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Patamon · effect/i });
    expect(within(dialog).getAllByRole("button", { name: /Move/i })).toHaveLength(2);
    expect(screen.getByText(/hand 2/i)).toBeTruthy();
  });

  it("shows Patamon's resolved search without inventing an inherited effect", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-028?effect=resolved");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-028" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/Patamon adicionou SlashAngemon e Azulongmon.*Seraphimon foi excluído/i)).toBeTruthy();
    expect(screen.getByText(/hand 2/i)).toBeTruthy();
    expect(screen.getByRole("img", { name: "deck · 34" })).toBeTruthy();
    expect(screen.queryByText("Rush")).toBeNull();
  });

  it("shows Gatomon's errata reveal and disables the excluded Three Great Angels card", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-030");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-030" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Gatomon · effect/i });
    expect(
      within(dialog).getByText(/Angel, Cherub, Throne, Authority, Seraph ou Virtue.*exceto Three Great Angels/i),
    ).toBeTruthy();
    expect(within(dialog).getByText(/other than \[Three Great Angels\]/i)).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: "SlashAngemon" }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(dialog).getByRole("button", { name: "Seraphimon" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(dialog).getByRole("button", { name: "Azulongmon" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(dialog).getByRole("button", { name: "Gabumon" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("requires Gatomon's Four Great Dragons slot after the Angel-family addition", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-030?step=dragon");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-030" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Gatomon · effect/i });
    expect(within(dialog).getByText(/Escolha 1 carta com Four Great Dragons/i)).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: "Azulongmon" }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(dialog).getByRole("button", { name: "SlashAngemon" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it.each([
    ["no-dragon", 3],
    ["no-categories", 4],
  ] as const)("applies Gatomon's Q3406 ordering boundary for %s", (effect, count) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-030?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-030" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Gatomon · effect/i });
    expect(within(dialog).getByText(/Escolha a ordem.*fundo do baralho/i)).toBeTruthy();
    expect(within(dialog).getAllByRole("button", { name: /Move/i })).toHaveLength(count * 2);
  });

  it("Q3406 still requires the sole Four Great Dragons card when no Angel-family card is eligible", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-030?effect=no-angel");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-030" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Gatomon · effect/i });
    expect(within(dialog).getByText(/Escolha 1 carta com Four Great Dragons/i)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Azulongmon" })).toBeTruthy();
  });

  it("Q3407 orders exactly the two cards remaining after Gatomon's mandatory additions", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-030?step=order");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-030" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Gatomon · effect/i });
    expect(within(dialog).getAllByRole("button", { name: /Move/i })).toHaveLength(4);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm order" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Gatomon's resolved errata search with zones and an explanatory log", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-030?effect=resolved");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-030" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByText(/adicionou SlashAngemon e Azulongmon.*Seraphimon foi excluído.*Three Great Angels/i),
    ).toBeTruthy();
    expect(screen.getByText(/hand 2/i)).toBeTruthy();
    expect(screen.getByRole("img", { name: "deck · 34" })).toBeTruthy();
  });

  it("shows Gatomon's inherited Rush and lets the newly played dragon attack", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-030?effect=inherited");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-030" />
      </I18nProvider>,
    );

    expect(screen.getByText(/concedeu Rush ao Goldramon recém-jogado.*host não recebeu Rush/i)).toBeTruthy();
    expect(screen.getAllByText("Rush")).toHaveLength(1);
    fireEvent.keyDown(screen.getByRole("button", { name: "Goldramon" }), { key: "Enter" });
    fireEvent.click(screen.getByText("Attack"));
    expect(screen.getByRole("button", { name: "security · 5" })).toBeTruthy();
  });

  it("applies Gatomon's multi-play errata with a common Digimon visible but disabled", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-030?effect=inherited-multi");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-030" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Gatomon · effect/i });
    const goldramon = within(dialog).getByRole("button", { name: /Goldramon, 11,000 DP, 0 sources/i });
    const magnadramon = within(dialog).getByRole("button", { name: /Magnadramon, 12,000 DP, 0 sources/i });
    const agumon = within(dialog).getByRole("button", { name: /Agumon, 2,000 DP, 0 sources/i });
    expect((goldramon as HTMLButtonElement).disabled).toBe(false);
    expect((magnadramon as HTMLButtonElement).disabled).toBe(false);
    expect((agumon as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(magnadramon);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows only Gatomon's chosen simultaneous-play dragon with Rush after resolution", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-030?effect=inherited-multi-resolved");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-030" />
      </I18nProvider>,
    );

    expect(screen.getByText(/só os dois Four Great Dragons eram elegíveis.*Magnadramon foi escolhido/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Agumon" })).toBeTruthy();
    expect(screen.getAllByText("Rush")).toHaveLength(1);
  });

  it.each([
    ["inherited-opt", /segunda jogada não recebeu Rush.*Once Per Turn/i, 1],
    ["inherited-expired", /turno terminou.*Rush.*expirou/i, 0],
  ] as const)("shows Gatomon's inherited %s boundary", (effect, log, rushCount) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-030?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-030" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
    expect(screen.queryAllByText("Rush")).toHaveLength(rushCount);
  });

  it("shows all four Veedramon reveals and requires one eligible yellow Dramon", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-031");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-031" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Veedramon · effect/i });
    expect(within(dialog).getByText(/Escolha 1 carta amarela com Dramon no nome/i)).toBeTruthy();
    expect(within(dialog).getByText(/Reveal the top 4 cards.*Four Great Dragons/i)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Magnadramon" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Veedramon" })).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: "Azulongmon" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(dialog).getByRole("button", { name: "Airdramon" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(dialog).getByRole("button", { name: "Magnadramon" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not offer the overlapping card again for Veedramon's Four Great Dragons slot", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-031?step=dragon");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-031" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Veedramon · effect/i });
    expect(within(dialog).getByText(/Escolha 1 carta com Four Great Dragons/i)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Azulongmon" })).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: "Magnadramon" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(dialog).getByRole("button", { name: "Veedramon" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it.each([
    ["no-dragon", 3, /Veedramon/i],
    ["no-categories", 4, /Escolha a ordem/i],
  ] as const)("applies Veedramon's Q3408 search boundary for %s", (effect, count, prompt) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-031?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-031" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Veedramon · effect/i });
    expect(within(dialog).getByText(prompt)).toBeTruthy();
    expect(within(dialog).getAllByRole("button", { name: /Move/i })).toHaveLength(count * 2);
  });

  it("Q3408 still requires the sole Four Great Dragons card when no yellow Dramon was revealed", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-031?effect=no-dramon");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-031" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Veedramon · effect/i });
    expect(within(dialog).getByText(/Escolha 1 carta com Four Great Dragons/i)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Azulongmon" })).toBeTruthy();
  });

  it("Q3409 orders exactly the two cards remaining after both mandatory additions", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-031?step=order");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-031" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Veedramon · effect/i });
    expect(within(dialog).getByText(/Escolha a ordem.*fundo do baralho/i)).toBeTruthy();
    expect(within(dialog).getAllByRole("button", { name: /Move/i })).toHaveLength(4);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm order" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Veedramon's resolved search in the real hand, deck, and friendly log", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-031?effect=resolved");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-031" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/adicionou Magnadramon e Azulongmon.*outras 2 cartas.*ordem escolhida/i)).toBeTruthy();
    expect(screen.getByText(/hand 2/i)).toBeTruthy();
    expect(screen.getByRole("img", { name: "deck · 34" })).toBeTruthy();
  });

  it("shows inherited Rush only on the newly played Four Great Dragons and exposes its attack action", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-031?effect=inherited");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-031" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/concedeu Rush ao Goldramon recém-jogado.*host não recebeu Rush/i)).toBeTruthy();
    expect(screen.getAllByText("Rush")).toHaveLength(1);
    fireEvent.keyDown(screen.getByRole("button", { name: "Goldramon" }), { key: "Enter" });
    fireEvent.click(screen.getByText("Attack"));
    expect(screen.getByRole("button", { name: "security · 5" })).toBeTruthy();
  });

  it("applies Veedramon's errata by requiring a choice between two Four Great Dragons played together", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-031?effect=inherited-multi");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-031" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Veedramon · effect/i });
    expect(within(dialog).getByText(/Escolha 1 dos Four Great Dragons recém-jogados.*Rush/i)).toBeTruthy();
    expect(within(dialog).getByText(/1 of those Digimon gains <Rush>/i)).toBeTruthy();
    const goldramon = within(dialog).getByRole("button", { name: /Goldramon, 11,000 DP, 0 sources/i });
    expect((goldramon as HTMLButtonElement).disabled).toBe(false);
    const magnadramon = within(dialog).getByRole("button", { name: /Magnadramon, 12,000 DP, 0 sources/i });
    expect((magnadramon as HTMLButtonElement).disabled).toBe(false);
    const agumon = within(dialog).getByRole("button", { name: /Agumon, 2,000 DP, 0 sources/i });
    expect((agumon as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(magnadramon);
    expect(within(dialog).getByRole("button", { name: /Magnadramon.*selected/i })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows only the chosen simultaneous-play Digimon with Rush after Veedramon's errata resolves", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-031?effect=inherited-multi-resolved");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-031" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByText(/jogados simultaneamente.*Magnadramon foi escolhido.*somente ele recebeu Rush/i),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Agumon" })).toBeTruthy();
    expect(screen.getAllByText("Rush")).toHaveLength(1);
    fireEvent.keyDown(screen.getByRole("button", { name: "Magnadramon" }), { key: "Enter" });
    expect(screen.getByText("Attack")).toBeTruthy();
  });

  it.each([
    ["inherited-opt", /segunda jogada não recebeu Rush.*Once Per Turn/i, 1],
    ["inherited-expired", /turno terminou.*Rush.*expirou/i, 0],
  ] as const)("shows Veedramon's inherited %s boundary", (effect, log, rushCount) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-031?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-031" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
    expect(screen.queryAllByText("Rush")).toHaveLength(rushCount);
  });

  it("offers Majiramon's two opponent Digimon as one mandatory, friendly target choice", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-032");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-032" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Majiramon · effect/i });
    expect(within(dialog).getByText(/Escolha 1 Digimon do oponente.*Security Attack -2/i)).toBeTruthy();
    expect(within(dialog).getByText(/until the end of your opponent's turn/i)).toBeTruthy();
    expect(within(dialog).getByText(/Four Sovereigns.*gain 2 memory/i)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: /Elecmon, 2,000 DP, 0 sources/i })).toBeTruthy();
    const gabumon = within(dialog).getByRole("button", { name: /Gabumon, 2,000 DP, 1 source/i });
    expect(within(dialog).queryByRole("button", { name: /Majiramon/i })).toBeNull();
    fireEvent.click(gabumon);
    expect(within(dialog).getByRole("button", { name: /Gabumon.*selected/i })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each([
    ["resolved", /escolheu Elecmon.*Security Attack -2.*Sem Four Sovereigns.*memória ficou em 3/i, 3],
    ["no-sovereign", /Sem Four Sovereigns.*não ganhou 2 de memória.*memória ficou em 3/i, 3],
    ["four-sovereigns", /Azulongmon.*Four Sovereigns.*ganhou 2 de memória.*memória ficou em 5/i, 5],
  ] as const)("shows Majiramon's %s resolved On Play state", (effect, log, memory) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-032?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-032" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Majiramon" })).toBeTruthy();
    expect(screen.getByText(log)).toBeTruthy();
    expect(screen.getByText(/1 of your opponent's Digimon gains.*Security Attack -2/i)).toBeTruthy();
    expect(Boolean(screen.queryByRole("button", { name: "Azulongmon" }))).toBe(effect === "four-sovereigns");
    expect(screen.getAllByText("Your turn").length).toBeGreaterThan(0);
    expect(screen.getByText(`Turn 8 · memory +${memory}`)).toBeTruthy();
  });

  it("does not offer an impossible target but still shows Majiramon's independent memory bonus", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-032?effect=no-target");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-032" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Azulongmon" })).toBeTruthy();
    expect(screen.getByText(/Não havia Digimon do oponente.*não abriu uma escolha impossível/i)).toBeTruthy();
    expect(screen.getByText(/Azulongmon.*ganhar 2 de memória.*memória ficou em 5/i)).toBeTruthy();
    expect(screen.getAllByText("Your turn").length).toBeGreaterThan(0);
    expect(screen.getByText("Turn 8 · memory +5")).toBeTruthy();
  });

  it.each([
    ["active", /Durante o turno do oponente.*continua com Security Attack -2.*fim deste turno/i],
    ["expired", /turno do oponente terminou.*Security Attack -2.*expirou.*valor normal/i],
  ])("shows Majiramon's duration as %s", (effect, log) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-032?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-032" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
    expect(screen.getAllByText(effect === "active" ? "Opponent's turn" : "Your turn").length).toBeGreaterThan(0);
    expect(screen.getByText(`Turn ${effect === "active" ? 8 : 9} · memory 0`)).toBeTruthy();
  });

  it.each(["No, decline", "Yes, activate"])("offers AeroVeedramon's friendly errata action: %s", (action) => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-033");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-033" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /AeroVeedramon · effect/i });
    expect(within(dialog).getByText(/Colocar 1 Trial of the Four Great Dragons.*área de batalha/i)).toBeTruthy();
    expect(within(dialog).getByText(/If you don't have.*you may place 1 \[Trial/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: action }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("distinguishes AeroVeedramon's Trial copies and disables the unrelated hand card", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-033?effect=trial-choice");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-033" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /AeroVeedramon · effect/i });
    expect(within(dialog).getByRole("button", { name: "Trial of the Four Great Dragons, copy 1 of 2" })).toBeTruthy();
    const second = within(dialog).getByRole("button", { name: "Trial of the Four Great Dragons, copy 2 of 2" });
    expect((within(dialog).getByRole("button", { name: "Agumon" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(second);
    expect(within(dialog).getByRole("button", { name: /copy 2 of 2, selected/i })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each([
    ["accepted", /sem jogar a Option, ativar Main ou comprar uma carta/i, 2, true],
    ["declined", /colocação opcional foi recusada.*duas cópias.*permaneceram na mão/i, 3, false],
    ["existing-trial", /Já havia uma Trial.*não abriu a ação opcional/i, 1, true],
    ["no-trial-hand", /Não havia Trial.*não abriu uma ação impossível/i, 1, false],
  ] as const)("shows AeroVeedramon's %s placement state", (effect, log, handCount, placed) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-033?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-033" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(new RegExp(`hand ${handCount}`, "i"))).toBeTruthy();
    expect(screen.getByText(log)).toBeTruthy();
    expect(Boolean(screen.queryByRole("button", { name: "Trial of the Four Great Dragons" }))).toBe(placed);
  });

  it.each([
    ["self-dragon", /Goldramon.*turno do oponente.*recebeu Blocker/i, true],
    ["self-trial", /Trial of the Four Great Dragons.*turno do oponente.*recebeu Blocker/i, true],
    ["self-negative", /próprio turno.*não recebeu Blocker/i, false],
  ] as const)("shows AeroVeedramon's conditional self Blocker for %s", (effect, log, gainsBlocker) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-033?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-033" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
    expect(screen.getByText(/\[Opponent's Turn\].*this Digimon gains.*Blocker/i)).toBeTruthy();
    expect(Boolean(screen.queryByText("Blocker"))).toBe(gainsBlocker);
  });

  it("opens AeroVeedramon's real Blocker window with accessible accept and decline actions", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-033?effect=blocker");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-033" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: "Block window" });
    fireEvent.click(within(dialog).getByRole("button", { name: /AeroVeedramon, 7,000 DP, 1 source/i }));
    expect(screen.queryByRole("dialog")).toBeNull();

    cleanup();
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-033" />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Take the attack — no block" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each([
    ["inherited", /efeito herdado.*deu Blocker a Goldramon e Magnadramon/i, 2],
    ["inherited-negative", /próprio turno.*não deu Blocker/i, 0],
  ] as const)("shows AeroVeedramon's %s all-dragons inherited state", (effect, log, blockerCount) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-033?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-033" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
    expect(screen.getByText(/All of your Digimon with \[Four Great Dragons\].*gain.*Blocker/i)).toBeTruthy();
    expect(screen.queryAllByText("Blocker")).toHaveLength(blockerCount);
  });

  it("offers only the allied Four Great Dragons in AeroVeedramon's inherited Blocker window", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-033?effect=inherited-blocker");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-033" />
      </I18nProvider>,
    );

    expect(screen.getByText(/efeito herdado de AeroVeedramon deu Blocker somente a Magnadramon/i)).toBeTruthy();
    const dialog = screen.getByRole("dialog", { name: "Block window" });
    expect(within(dialog).getByRole("button", { name: /Magnadramon, 12,000 DP, 0 sources/i })).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: /Goldramon/i })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: /Angemon/i })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: /Agumon/i })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: /Magnadramon, 12,000 DP, 0 sources/i }));
    expect(screen.queryByRole("dialog")).toBeNull();

    cleanup();
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-033" />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Take the attack — no block" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each(["No, decline", "Yes, activate"])("offers Angewomon's friendly errata action: %s", (action) => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-034");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-034" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Angewomon · effect/i });
    expect(within(dialog).getByText(/Colocar 1 Trial of the Four Great Dragons.*área de batalha/i)).toBeTruthy();
    expect(within(dialog).getByText(/If you don't have.*you may place 1 \[Trial/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: action }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("distinguishes both Trial copies and keeps the unrelated hand card disabled", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-034?effect=trial-choice");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-034" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Angewomon · effect/i });
    expect(within(dialog).getByRole("button", { name: "Trial of the Four Great Dragons, copy 1 of 2" })).toBeTruthy();
    const second = within(dialog).getByRole("button", {
      name: "Trial of the Four Great Dragons, copy 2 of 2",
    });
    expect((within(dialog).getByRole("button", { name: "Agumon" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(second);
    expect(within(dialog).getByRole("button", { name: /copy 2 of 2, selected/i })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each([
    ["accepted", /sem ativar o efeito Main nem comprar uma carta/i, 2, true],
    ["declined", /colocação opcional foi recusada.*duas cópias.*permaneceram na mão/i, 3, false],
  ] as const)("shows Angewomon's %s placement result", (effect, log, handCount, placed) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-034?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-034" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(new RegExp(`hand ${handCount}`, "i"))).toBeTruthy();
    expect(screen.getByText(log)).toBeTruthy();
    expect(Boolean(screen.queryByRole("button", { name: "Trial of the Four Great Dragons" }))).toBe(placed);
  });

  it("does not offer Angewomon's placement while Trial is already in play", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-034?effect=existing-trial");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-034" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/Já havia uma Trial.*não abriu a ação opcional/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Trial of the Four Great Dragons" })).toBeTruthy();
  });

  it("offers every opposing Digimon for Angewomon's mandatory -3000 DP action", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-034?effect=watcher");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-034" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Angewomon · effect/i });
    expect(within(dialog).getByText(/play a Digimon with \[Four Great Dragons\].*or place \[Trial/i)).toBeTruthy();
    expect(within(dialog).getByText(/gets -3000 DP for the turn/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Inspect opponent Digimon: Elecmon/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Inspect opponent Digimon: Gabumon/i })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: /Elecmon, 5,000 DP/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each([
    ["watcher-play", /Four Great Dragons foi jogado.*Elecmon recebeu -3000 DP/i],
    ["watcher-place", /Trial of the Four Great Dragons foi colocada.*Elecmon recebeu -3000 DP/i],
    ["inherited", /efeito herdado de Angewomon.*observou.*Elecmon recebeu -3000 DP/i],
    ["once-per-turn", /já ativou neste turno.*segundo evento não abriu outra escolha/i],
    ["expired", /turno terminou.*redução de -3000 DP.*expirou/i],
  ])("shows Angewomon's %s watcher state without a stale action", (effect, log) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-034?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-034" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
    expect(screen.getByText(/\[Your Turn\]\[Once Per Turn\].*-3000 DP for the turn/i)).toBeTruthy();
  });

  it("shows the inherited watcher reacting when Trial is placed", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-034?effect=inherited-place");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-034" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Magnadramon" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Trial of the Four Great Dragons" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Inspect opponent Digimon: Elecmon/i })).toBeTruthy();
    expect(screen.getByText("5K")).toBeTruthy();
    expect(screen.getByText("8K")).toBeTruthy();
    expect(
      screen.getByText(/efeito herdado de Angewomon observou Trial.*colocada.*Elecmon recebeu -3000 DP/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/\[Your Turn\]\[Once Per Turn\].*place a \[Trial of the Four Great Dragons\]/i),
    ).toBeTruthy();
  });

  it.each(["No, decline", "Yes, activate"])("offers Goldramon's friendly optional return: %s", (action) => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-035");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-035" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Goldramon · effect/i });
    expect(within(dialog).getByText(/Devolver 1 carta Four Great Dragons.*lixo.*mão/i)).toBeTruthy();
    expect(within(dialog).getByText(/\[When Digivolving\].*You may return 1 card/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: action }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("distinguishes duplicate Four Great Dragons and keeps unrelated trash visible but disabled", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-035?effect=return-choice");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-035" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Goldramon · effect/i });
    expect(within(dialog).getByRole("button", { name: "Magnadramon, copy 1 of 2" })).toBeTruthy();
    const second = within(dialog).getByRole("button", { name: "Magnadramon, copy 2 of 2" });
    expect(within(dialog).getByRole("button", { name: "Trial of the Four Great Dragons" })).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: "Agumon" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(second);
    expect(within(dialog).getByRole("button", { name: /Magnadramon, copy 2 of 2, selected/i })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Goldramon's mandatory -6000 DP target action on the real board", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-035?effect=attack&step=target");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-035" />
      </I18nProvider>,
    );

    expect(screen.getByText(/Escolha 1 Digimon do oponente.*-6000 DP/i)).toBeTruthy();
    expect(screen.getByText(/\[When Attacking\].*opponent's Digimon gets -6000/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Inspect opponent Digimon: Agumon$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Inspect opponent Digimon: Agumon Expert$/i })).toBeTruthy();
    expect(screen.getAllByText("10K")).toHaveLength(2);
  });

  it.each([
    ["magnadramon", "Magnadramon", true],
    ["azulongmon", "Azulongmon", false],
    ["megidramon", "Megidramon", false],
  ] as const)("shows the %s payment step with the whole trash visible", (step, eligibleName, mayDecline) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-035?effect=attack&step=${step}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-035" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Goldramon · effect/i });
    expect(within(dialog).getAllByRole("button", { name: new RegExp(eligibleName) }).length).toBeGreaterThan(0);
    expect((within(dialog).getByRole("button", { name: "Agumon" }) as HTMLButtonElement).disabled).toBe(true);
    expect(Boolean(within(dialog).queryByRole("button", { name: "None" }))).toBe(mayDecline);
  });

  it("offers an explicit accessible order for Goldramon's three-card deck-bottom payment", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-035?effect=attack&step=order");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-035" />
      </I18nProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: /Goldramon · effect/i });
    expect(within(dialog).getByText(/Arrange the cards in deck order/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: /Move card down — Magnadramon, 1/i }));
    expect(within(dialog).getByRole("button", { name: /Move card up — Magnadramon, 2/i })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm order" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each([
    ["paid", /devolveu os 3 nomes.*descartou as 2 cartas/i],
    ["declined-cost", /custo de 3 nomes foi recusado.*nenhuma segurança/i],
    ["missing-name", /faltava Megidramon.*custo não foi oferecido/i],
    ["expired", /turno terminou.*redução de -6000 DP.*expirou/i],
  ])("shows Goldramon's %s result without a stale action", (effect, log) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-035?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-035" />
      </I18nProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
  });

  it("shows Goldramon's exact three-name payment in the resulting zones", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-035?effect=paid");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-035" />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: "trash · 2" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "deck · 39" })).toBeTruthy();
    expect(screen.getByText("4K")).toBeTruthy();
    expect(screen.getByText("10K")).toBeTruthy();
  });

  it.each([
    ["play-optional", /Jogar gratuitamente.*fontes.*Digimon azuis/i],
    ["place-optional", /segunda escolha é independente/i],
  ])("offers Plesiomon's independent %s action", (effect, prompt) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-023?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-023" />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: /Plesiomon · effect/i });
    expect(within(dialog).getByText(prompt)).toBeTruthy();
    expect(within(dialog).getByText(/\[When Digivolving\].*blue level 3.*Aqua.*Sea Animal/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "No, decline" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows every source card while enabling only Plesiomon's two valid play branches", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-023?effect=source-choice");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-023" />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: /Plesiomon · effect/i });
    const cards = within(dialog)
      .getAllByRole("button")
      .filter((button) => button.hasAttribute("aria-pressed"));
    const enabled = cards.filter((button) => !(button as HTMLButtonElement).disabled);
    expect(enabled).toHaveLength(2);
    expect(cards.filter((button) => (button as HTMLButtonElement).disabled)).toHaveLength(3);
    fireEvent.click(enabled[0]!);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("offers all hand cards but enables only blue Digimon for Plesiomon's bottom source", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-023?effect=place-choice");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-023" />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: /Plesiomon · effect/i });
    expect(within(dialog).getAllByRole("button", { name: /Gomamon/i }).length).toBeGreaterThan(0);
    expect((within(dialog).getByRole("button", { name: /Monodramon/i }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(dialog).getAllByRole("button", { name: /Gomamon/i })[0]!);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each([
    ["resolved", /duas ações opcionais resolveram em sequência/i],
    ["declined-play-place", /primeira ação opcional foi recusada.*segunda continuou independente/i],
  ])("shows Plesiomon's %s When Digivolving result and accessible stack", (effect, log) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-023?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-023" />
      </I18nProvider>,
    );
    expect(screen.getByText(log)).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("button", { name: "Plesiomon" }), { key: "Enter" });
    expect(screen.getByRole("img", { name: "Gomamon" })).toBeTruthy();
  });

  it("lets Plesiomon choose only an opposing Digimon matching the played level", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-023?effect=inherited-target");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-023" />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: /Plesiomon · effect/i });
    expect(within(dialog).getByText(/nível 3.*igual.*jogado das fontes/i)).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: /Monmon/i }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(dialog).getByRole("button", { name: /Dolphmon/i }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(dialog).getByRole("button", { name: /Monmon/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each([
    ["inherited-resolved", /devolveu apenas o Digimon de nível 3/i],
    ["inherited-opt", /já foi usado neste turno.*não abriu outra escolha/i],
    ["q2109", /não ativou retroativamente/i],
    ["hand-negative", /jogado da mão não acionou/i],
    ["no-same-level", /nenhum Digimon adversário tinha o mesmo nível/i],
    ["two-copies", /cada uma manteve sua própria marca de Once Per Turn/i],
  ])("shows Plesiomon's %s inherited outcome without a stale action", (effect, log) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-023?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-023" />
      </I18nProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
    expect(screen.getByText(/\[All Turns\]\[Once Per Turn\].*same level/i)).toBeTruthy();
  });

  it.each(["No, decline", "Yes, activate"])("shows MegaSeadramon's public attack optional: %s", (action) => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-022?effect=attack");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-022" />
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: "MegaSeadramon (Suspended)" })).toBeTruthy();
    const dialog = screen.getByRole("dialog", { name: /MegaSeadramon · effect/i });
    expect(within(dialog).getByText(/MegaSeadramon atacou.*nível 3.*fontes/i)).toBeTruthy();
    expect(within(dialog).getByText(/\[When Attacking\].*blue level 3/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: action }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows all sources while enabling only blue level 3 cards under blue Digimon", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-022?effect=source-choice");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-022" />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: /MegaSeadramon · effect/i });
    const cards = within(dialog)
      .getAllByRole("button")
      .filter((button) => button.hasAttribute("aria-pressed"));
    const enabled = cards.filter((button) => !(button as HTMLButtonElement).disabled);
    expect(cards).toHaveLength(5);
    expect(enabled).toHaveLength(2);
    expect(cards.filter((button) => (button as HTMLButtonElement).disabled)).toHaveLength(3);
    fireEvent.click(enabled[1]!);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each([
    ["resolved", /jogou Gabumon das fontes como um novo Digimon/i],
    ["declined", /ação opcional foi recusada.*fontes permaneceram/i],
    ["main-second-attack", /segundo ataque.*não é Once Per Turn.*outro play/i],
  ])("shows MegaSeadramon's %s main-effect outcome", (effect, log) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-022?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-022" />
      </I18nProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
  });

  it("moves MegaSeadramon's chosen source to its own permanent and preserves stack inspection", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-022?effect=resolved");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-022" />
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: "Gabumon" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("button", { name: "Dolphmon" }), { key: "Enter" });
    expect(screen.getAllByRole("img", { name: "Gabumon" })).toHaveLength(1);
    expect(screen.getByRole("img", { name: "Gomamon" })).toBeTruthy();
  });

  it.each([
    ["inherited", /primeiro ataque.*efeito herdado.*jogou/i],
    ["inherited-opt", /segundo ataque.*já estava usado/i],
    ["reset", /turno seguinte.*foi renovado/i],
    ["two-copies", /Duas cópias herdadas.*jogaram duas fontes/i],
    ["hand-negative", /jogado da mão não altera nem aciona/i],
    ["other-attacker", /Outro Digimon atacou.*não ativou/i],
  ])("shows MegaSeadramon's %s inherited outcome", (effect, log) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-022?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-022" />
      </I18nProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
    expect(screen.getByText(/\[When Attacking\]\[Once Per Turn\].*blue level 3/i)).toBeTruthy();
  });

  it.each(["inherited", "two-copies"])("exposes MegaSeadramon's %s source stack to keyboard users", (effect) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-022?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-022" />
      </I18nProvider>,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Dolphmon (Suspended)" }), { key: "Enter" });
    expect(screen.getAllByRole("img", { name: "MegaSeadramon" }).length).toBe(effect === "two-copies" ? 2 : 1);
  });

  it("shows every opponent Digimon while enabling only source hosts for CrysPaledramon", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-021?effect=host");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-021" />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: /CrysPaledramon · effect/i });
    const cards = within(dialog)
      .getAllByRole("button")
      .filter((button) => button.hasAttribute("aria-pressed"));
    expect(cards).toHaveLength(4);
    expect(cards.filter((button) => !(button as HTMLButtonElement).disabled)).toHaveLength(2);
    expect(cards.filter((button) => (button as HTMLButtonElement).disabled)).toHaveLength(2);
    fireEvent.click(cards.find((button) => !(button as HTMLButtonElement).disabled)!);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("allows exactly 2 non-adjacent sources for CrysPaledramon's Q3393 choice", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-021?effect=sources");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-021" />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: /CrysPaledramon · effect/i });
    expect(within(dialog).getByText(/quaisquer 2 fontes.*não precisam ser adjacentes/i)).toBeTruthy();
    const cards = within(dialog)
      .getAllByRole("button")
      .filter((button) => button.hasAttribute("aria-pressed"));
    expect(cards).toHaveLength(4);
    fireEvent.click(cards[0]!);
    expect((within(dialog).getByRole("button", { name: "Confirm targets" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(cards[2]!);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("re-evaluates CrysPaledramon's restriction targets after removing two sources", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-021?effect=restriction");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-021" />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: /CrysPaledramon · effect/i });
    expect(within(dialog).getByText(/reavaliados depois.*2 fontes/i)).toBeTruthy();
    const cards = within(dialog)
      .getAllByRole("button")
      .filter((button) => button.hasAttribute("aria-pressed"));
    expect(cards.filter((button) => !(button as HTMLButtonElement).disabled)).toHaveLength(2);
    expect(cards.filter((button) => (button as HTMLButtonElement).disabled)).toHaveLength(2);
  });

  it("lets the one-source host become CrysPaledramon's independent second target", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-021?effect=short-restriction");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-021" />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: /CrysPaledramon · effect/i });
    expect(within(dialog).getByText(/Apenas 1 fonte.*agora vazio.*outro Digimon/i)).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: /Wingdramon/i }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(dialog).getByRole("button", { name: /Dolphmon/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it.each([
    ["resolved", /removeu 2 fontes não adjacentes.*não pode atacar nem bloquear/i],
    ["short-source", /apenas 1 fonte.*máximo possível.*Q3392/i],
    ["no-sources", /primeira etapa foi ignorada.*Then ainda restringiu/i],
  ])("shows CrysPaledramon's %s resolution without a stale decision", (effect, log) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-021?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-021" />
      </I18nProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
    expect(screen.getByText(/can't attack or block until the end of your opponent's turn/i)).toBeTruthy();
  });

  it("shows CrysPaledramon's non-adjacent removal in trash and accessible remaining stack", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-021?effect=resolved");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-021" />
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: "trash · 2" })).toBeTruthy();
    const host = screen.getByRole("button", { name: "Inspect opponent Digimon: Dolphmon" });
    expect(host.getAttribute("tabindex")).toBe("0");
  });

  it.each([
    ["combat", /não apareceu na janela de Blocker.*não pôde declarar ataque/i],
    ["opponent-turn", /Durante todo o turno do oponente.*sem poder atacar ou bloquear/i],
    ["expired", /restrições de ataque e bloqueio expiraram.*voltou a poder agir/i],
  ])("shows CrysPaledramon's %s restriction boundary", (effect, log) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-021?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-021" />
      </I18nProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
  });

  it.each(["No, decline", "Yes, activate"])("offers Wingdramon's friendly end-turn DNA action: %s", (action) => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-020");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-020" />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: /Wingdramon · effect/i });
    expect(within(dialog).getByText(/DNA digievoluir Wingdramon.*outro Dramon.*fim do seu turno/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: action }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows all allied candidates and disables invalid Wingdramon DNA partners", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-020?effect=partner");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-020" />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: /Wingdramon · effect/i });
    const cards = within(dialog)
      .getAllByRole("button")
      .filter((button) => button.hasAttribute("aria-pressed"));
    expect(cards).toHaveLength(4);
    expect(cards.filter((button) => !(button as HTMLButtonElement).disabled)).toHaveLength(2);
    expect(cards.filter((button) => (button as HTMLButtonElement).disabled)).toHaveLength(2);
  });

  it("shows the whole hand and enables only compatible Examon DNA results", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-020?effect=result");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-020" />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: /Wingdramon · effect/i });
    const cards = within(dialog)
      .getAllByRole("button")
      .filter((button) => button.hasAttribute("aria-pressed"));
    expect(cards).toHaveLength(4);
    expect(cards.filter((button) => !(button as HTMLButtonElement).disabled)).toHaveLength(2);
    expect(cards.filter((button) => (button as HTMLButtonElement).disabled)).toHaveLength(2);
    fireEvent.click(cards.find((button) => !(button as HTMLButtonElement).disabled)!);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm targets" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Wingdramon and Breakdramon as accessible Examon DNA materials", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-020?effect=resolved");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-020" />
      </I18nProvider>,
    );
    expect(screen.getByText(/nível 6.*DNA digievoluíram em Examon/i)).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("button", { name: "Examon" }), { key: "Enter" });
    expect(screen.getByRole("img", { name: "Wingdramon" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Breakdramon" })).toBeTruthy();
  });

  it.each([
    ["declined", /opcional.*recusada.*materiais.*mão não mudaram/i],
    ["no-legal", /não havia resultado de DNA compatível.*nenhuma ação opcional impossível/i],
    ["treat", /próprio turno.*tratar Wingdramon como nível 6 somente para DNA/i],
    ["treat-opponent", /turno do oponente.*não foi tratado como nível 6/i],
    ["normal-negative", /não permite uma evolução normal.*Slayerdramon permaneceu/i],
  ])("shows Wingdramon's %s DNA/treatment state without stale actions", (effect, log) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-020?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-020" />
      </I18nProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
  });

  it.each([
    ["evade", /aceitou Evade.*suspendeu-se.*evitou/i, true],
    ["evade-declined", /recusou Evade.*enviado ao lixo/i, false],
    ["evade-disabled", /já estava suspenso.*indisponível.*não evitou/i, false],
    ["inherited-evade", /Paledramon.*Evade herdado.*evitou/i, true],
    ["inherited-negative", /não tem Dramon nem Examon.*não recebeu Evade/i, true],
    ["inherited-disabled", /Evade herdado já estava suspenso.*indisponível/i, false],
  ] as const)("shows Wingdramon's %s Evade outcome", (effect, log, remains) => {
    mockDesktop();
    window.history.replaceState({}, "", `/dev/card-effects/EX3-020?effect=${effect}`);
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-020" />
      </I18nProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(log)).toBeTruthy();
    expect(
      screen.queryAllByRole("button", { name: /Wingdramon \(Suspended\)|Paledramon \(Suspended\)|Monzaemon/ }).length >
        0,
    ).toBe(remains);
  });

  it("keeps Wingdramon's inherited Evade source stack keyboard-accessible", () => {
    mockDesktop();
    window.history.replaceState({}, "", "/dev/card-effects/EX3-020?effect=inherited-evade");
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="EX3-020" />
      </I18nProvider>,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Paledramon (Suspended)" }), { key: "Enter" });
    expect(screen.getByRole("img", { name: "Wingdramon" })).toBeTruthy();
  });

  it("reports cards that do not have a simulated match yet", () => {
    render(
      <I18nProvider>
        <CardEffectsDemo cardId="BT12-001" />
      </I18nProvider>,
    );

    expect(screen.getByText("No simulated match is registered for BT12-001. Try EX3-074.")).toBeTruthy();
  });
});
