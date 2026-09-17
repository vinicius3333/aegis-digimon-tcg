import { useEffect, useState } from "react";
import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { TOUCH_LAYOUT_QUERY, useMediaQuery } from "../../../design/useMediaQuery";
import { useTranslation } from "../../../i18n";
import { ArenaPermanentInspector, type ArenaInspectionOptions } from "../../ArenaPermanentInspector";
import { type PendingFateBadge } from "../../pendingFate";
import { type PermanentDetail } from "../../permanentDetail";
import { type StackCard } from "../types";
import { CardZoomOverlay } from "./CardZoomOverlay";
import { StackViewerDialog } from "./StackViewerDialog";
import { StackViewerSheet } from "./StackViewerSheet";

/**
 * Modal that lays out the cards making up a field permanent: thumbnails on the
 * left (active card, its digivolution stack, then linked cards), and a large
 * preview of the last-hovered thumbnail on the right. Surfaces an "Attack" action
 * when the caller deems the permanent eligible.
 */
export function StackViewerOverlay({
  arenaInspection,
  cards,
  title,
  detail,
  fate,
  sheet,
  canAttack,
  canVortex,
  onAttack,
  onVortex,
  onClose,
}: {
  arenaInspection?: ArenaInspectionOptions;
  cards: StackCard[];
  title: string;
  /** The position's computed state: live DP against the printed figure and the resolved keywords. */
  detail?: PermanentDetail;
  /** The badge an open effect has already pinned to this permanent, if any. */
  fate?: PendingFateBadge;
  /**
   * Render as a bottom sheet (touch layouts) instead of the two-column dialog.
   * Defaults to the same phone breakpoint the stylesheet's phone block carries.
   */
  sheet?: boolean;
  canAttack: boolean;
  canVortex?: boolean;
  onAttack: () => void;
  onVortex?: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewZoomed, setPreviewZoomed] = useState(false);
  const [zoomed, setZoomed] = useState<string | null>(null);
  const [zoomedArtId, setZoomedArtId] = useState<string | undefined>();
  const openZoom = (id: string | null, selectedArtId?: string) => {
    setZoomed(id);
    setZoomedArtId(selectedArtId);
  };
  const touchLayout = useMediaQuery(TOUCH_LAYOUT_QUERY);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      // The card zoom sits on top and closes itself on Escape; the sheet under it stays.
      if (event.key === "Escape" && zoomed === null) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, zoomed]);

  if (arenaInspection && detail) {
    return (
      <>
        <ArenaPermanentInspector
          detail={detail}
          inspection={arenaInspection}
          fate={fate}
          zoomed={zoomed !== null}
          onZoom={openZoom}
          onClose={onClose}
          actions={
            canAttack || (canVortex && onVortex) ? (
              <>
                {canAttack ? (
                  <Button size="sm" variant="danger" icon={Icons.Swords} onClick={onAttack}>
                    {t("overlay.attack")}
                  </Button>
                ) : null}
                {canVortex && onVortex ? (
                  <Button size="sm" variant="danger" icon={Icons.Swords} onClick={onVortex}>
                    {t("overlay.vortexAttack")}
                  </Button>
                ) : null}
              </>
            ) : undefined
          }
        />
        {zoomed ? <CardZoomOverlay cardId={zoomed} artId={zoomedArtId} onClose={() => setZoomed(null)} /> : null}
      </>
    );
  }

  if (sheet ?? touchLayout) {
    return (
      <StackViewerSheet
        cards={cards}
        title={title}
        detail={detail}
        fate={fate}
        zoomed={zoomed}
        zoomedArtId={zoomedArtId}
        onZoom={openZoom}
        canAttack={canAttack}
        canVortex={canVortex}
        onAttack={onAttack}
        onVortex={onVortex}
        onClose={onClose}
      />
    );
  }

  return (
    <StackViewerDialog
      cards={cards}
      title={title}
      detail={detail}
      fate={fate}
      activeIndex={activeIndex}
      onActiveIndexChange={setActiveIndex}
      previewZoomed={previewZoomed}
      onPreviewZoomedChange={setPreviewZoomed}
      canAttack={canAttack}
      canVortex={canVortex}
      onAttack={onAttack}
      onVortex={onVortex}
      onClose={onClose}
    />
  );
}
