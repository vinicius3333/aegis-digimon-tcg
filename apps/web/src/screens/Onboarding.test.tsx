// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Onboarding, accentForAvatar, type OnboardingResult } from "./Onboarding";
import { I18nProvider } from "../i18n";

type OnboardingEnter = (identity: OnboardingResult) => void;

function renderOnboarding(onEnter: OnboardingEnter = vi.fn<OnboardingEnter>()) {
  render(
    <I18nProvider>
      <Onboarding onEnter={onEnter} />
    </I18nProvider>,
  );
  return onEnter;
}

describe("onboarding", () => {
  afterEach(() => cleanup());

  it("offers both a Discord account and a guest path before asking anything", () => {
    renderOnboarding();

    expect(screen.getByRole("button", { name: /Continue with Discord/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Play as guest/ })).toBeTruthy();
    expect(screen.queryByLabelText("Nickname")).toBeNull();
  });

  it("carries a handle and a Digimon portrait out of the guest path", () => {
    const onEnter = renderOnboarding();

    fireEvent.click(screen.getByRole("button", { name: /Play as guest/ }));
    fireEvent.change(screen.getByLabelText("Nickname"), { target: { value: "VesperKnell" } });
    fireEvent.click(screen.getByRole("button", { name: "Greymon" }));
    fireEvent.click(screen.getByRole("button", { name: "Enter Aegis" }));

    expect(onEnter).toHaveBeenCalledWith({
      name: "VesperKnell",
      color: accentForAvatar("greymon", "Blue"),
      avatarId: "greymon",
    });
  });

  it("keeps the entry action disabled until the handle is long enough", () => {
    renderOnboarding();

    fireEvent.click(screen.getByRole("button", { name: /Play as guest/ }));
    fireEvent.change(screen.getByLabelText("Nickname"), { target: { value: "V" } });

    expect(screen.getByRole("button", { name: "Enter Aegis" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Use 2 to 16 characters")).toBeTruthy();
  });

  it("filters the portrait grid by name", () => {
    renderOnboarding();

    fireEvent.click(screen.getByRole("button", { name: /Play as guest/ }));
    fireEvent.change(screen.getByLabelText("Portrait"), { target: { value: "megasea" } });

    expect(screen.getByRole("button", { name: "MegaSeadramon" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Greymon" })).toBeNull();
  });

  it("derives a stable identity accent from the chosen portrait", () => {
    expect(accentForAvatar("greymon", "Blue")).toBe(accentForAvatar("greymon", "Red"));
    expect(accentForAvatar(null, "Green")).toBe("Green");
  });
});
