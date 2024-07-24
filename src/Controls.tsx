import type { Canvas as FabricCanvas } from "fabric";
import { useEffect, useRef, useState } from "react";
import { Rect } from "fabric";

function Controls({ getCanvas }: { getCanvas: () => FabricCanvas }) {
  const selectionRef = useRef<Rect | null>(null);
  const [isSelectionActive, setIsSelectionActive] = useState(false);

  useEffect(() => {
    const canvas = getCanvas();

    let started = false;
    let x = 0;
    let y = 0;

    /* Mousedown */
    const mousedown = (event) => {
      if (!isSelectionActive) {
        return false;
      }

      // allow user to select existing rectangle
      if (event.target === selectionRef.current) {
        return false;
      }

      // ensure object does not preserve aspect ratio
      canvas.set("uniformScaling", true);

      started = true;
      const mouse = event.e;
      x = mouse.pageX - canvas._offset.left;
      y = mouse.pageY - canvas._offset.top;

      const foundObject = canvas
        .getObjects()
        .find((object) => object === selectionRef.current);

      if (foundObject) {
        canvas.remove(foundObject);
      }

      const square = new Rect({
        width: 0,
        height: 0,
        left: x,
        top: y,
        borderColor: "black",
        borderDashArray: [5, 5],
        fill: "transparent",
        uniformScaling: false,
        cornerColor: "blue",
        transparentCorners: false,
        cornerStrokeColor: "white",
        cornerStyle: "circle",
      });

      canvas.add(square);
      canvas.bringObjectToFront(square);
      canvas.setActiveObject(square);
      selectionRef.current = square;
    };

    /* Mousemove */
    const mousemove = (event) => {
      if (!isSelectionActive) {
        return false;
      }

      if (!started) {
        return false;
      }

      const mouse = event.e;
      const mouseX = mouse.pageX - canvas._offset.left;
      const mouseY = mouse.pageY - canvas._offset.top;
      let width = mouseX - x;
      let height = mouseY - y;

      if (!width || !height) {
        return false;
      }

      // Determine the rectangle's new position and size
      let newLeft;
      let newTop;

      if (width < 0) {
        newLeft = mouseX;
        width = -width;
      } else {
        newLeft = x;
      }

      if (height < 0) {
        newTop = mouseY;
        height = -height;
      } else {
        newTop = y;
      }

      const square = canvas.getActiveObject();

      if (square) {
        square.set({
          width,
          height,
          left: newLeft,
          top: newTop,
        });

        canvas.renderAll();
      }
    };

    /* Mouseup */
    const mouseup = (e) => {
      // if selection tool inactive then remove selection square
      if (!isSelectionActive && e.target !== selectionRef.current) {
        const square = canvas
          .getObjects()
          .find((object) => object === selectionRef.current);

        if (square) {
          canvas.remove(square);
        }

        return false;
      }

      if (started) {
        started = false;
      }

      canvas.set("uniformScaling", false);

      const square = canvas.getActiveObject();

      if (square) {
        const height = square.get("height");
        const width = square.get("width");

        // if rectangle has no size then just remove it
        if (!height && !width) {
          canvas.remove(square);
        } else {
          canvas.remove(square);
          canvas.add(square);
          canvas.setActiveObject(square);
        }

        canvas.renderAll();
        selectionRef.current = square as Rect;
      }
    };

    if (canvas) {
      canvas.on("mouse:down", mousedown);
      canvas.on("mouse:move", mousemove);
      canvas.on("mouse:up", mouseup);
    }

    return () => {
      if (canvas) {
        canvas.off("mouse:down", mousedown);
        canvas.off("mouse:move", mousemove);
        canvas.off("mouse:up", mouseup);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getCanvas, isSelectionActive]);

  return (
    <>
      <button
        className={
          isSelectionActive
            ? "selection selection--active"
            : "selection selection--inactive"
        }
        onClick={() => setIsSelectionActive((prevState) => !prevState)}
      >
        Rectangular Selection
      </button>
    </>
  );
}

export { Controls };
