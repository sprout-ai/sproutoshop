import type { Canvas as CanvasType } from "fabric";
import { forwardRef, useEffect, useRef } from "react";
import { Canvas as fabricCanvas } from "fabric";

const Canvas = forwardRef<CanvasType, { onLoad?(canvas: CanvasType): void }>(
  ({ onLoad }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      if (!canvasRef.current) {
        return;
      }

      const { width } = canvasRef.current.getBoundingClientRect();
      const canvas = new fabricCanvas(canvasRef.current, {
        width,
        height: width * (9 / 16),
        selection: false,
      });

      if (typeof ref === "object" && ref) {
        ref.current = canvas;
      }

      onLoad?.(canvas);

      return () => {
        if (typeof ref === "object" && ref) {
          ref.current = null;
        }

        void canvas.dispose();
      };
    }, [canvasRef, onLoad, ref]);

    return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
  },
);

Canvas.displayName = "Canvas";

export { Canvas };
