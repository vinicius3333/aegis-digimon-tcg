/* One button that renders the deck to a PNG and downloads it, showing progress
   and a short-lived error state inline. */

import { useEffect, useRef, useState } from "react";
import {
  Button,
  type ButtonSize,
  type ButtonVariant,
} from "../design/primitives";
import { Icons } from "../design/icons";
import type { DeckListing } from "../game/decks";
import { useTranslation } from "../i18n";
import { downloadDeckImage } from "./deckImageExport";

type ExportState = "idle" | "rendering" | "failed";

export function DeckImageButton({
  deck,
  subtitle,
  variant = "secondary",
  size = "md",
  iconOnly = false,
  label: idleLabel,
  className,
}: {
  deck: DeckListing;
  subtitle?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  label?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<ExportState>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const exportImage = async () => {
    setState("rendering");
    try {
      await downloadDeckImage({ deck, t, subtitle });
      setState("idle");
    } catch {
      setState("failed");
      resetTimer.current = setTimeout(() => setState("idle"), 3000);
    }
  };

  const label =
    state === "rendering"
      ? t("deck.exportImageRendering")
      : state === "failed"
        ? t("deck.exportImageFailed")
        : (idleLabel ?? t("deck.exportImage"));

  return (
    <Button
      className={className}
      variant={variant}
      size={size}
      icon={state === "failed" ? Icons.CircleAlert : Icons.Download}
      disabled={state === "rendering"}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      onClick={exportImage}
    >
      {iconOnly ? null : label}
    </Button>
  );
}
