import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import type { CardGrip } from "@/packOpening/scene/createCardGrip";
import { resetCardGrip } from "@/packOpening/scene/resetCardGrip";

type Props = {
  grip: CardGrip;
  inspectedIndex: number | undefined;
};

const ZOOM_PER_WHEEL_PIXEL = 0.0015;
const MINIMUM_ZOOM = 0.75;
const MAXIMUM_ZOOM = 1.35;

export function CardGripControls({ grip, inspectedIndex }: Props) {
  const canvas = useThree((state) => state.gl.domElement);
  const inspecting = inspectedIndex !== undefined;

  useEffect(() => resetCardGrip(grip), [grip, inspectedIndex]);

  useEffect(() => {
    if (!inspecting) {
      return;
    }
    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      grip.zoom = Math.max(MINIMUM_ZOOM, Math.min(MAXIMUM_ZOOM, grip.zoom - event.deltaY * ZOOM_PER_WHEEL_PIXEL));
    }
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [canvas, grip, inspecting]);

  return null;
}
