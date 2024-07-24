import type { Canvas as FabricCanvas } from "fabric";
import { useEffect, useRef, useState } from "react";
import { FabricImage, Rect } from "fabric";

import styles from "./Controls.module.css";

function Controls({ getCanvas }: { getCanvas: () => FabricCanvas }) {
  const selectionRef = useRef<Rect | null>(null);
  const [isSelectionActive, setIsSelectionActive] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);

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

      setHasSelection(false);

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
      square.setControlsVisibility({
        mtr: false,
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
          // check if square exceeds image bounds
          const image = canvas
            .getObjects()
            .find((object) => object.isType("image"));

          if (image) {
            const imageWidth = image.get("width");
            const imageHeight = image.get("height");
            const imageLeft = image.get("left");
            const imageTop = image.get("top");

            if (square.left < imageLeft) {
              square.left = imageLeft;
            }
            if (square.top < imageTop) {
              square.top = imageTop;
            }
            if (square.left + square.width > imageLeft + imageWidth) {
              square.width = imageWidth - square.left + imageLeft;
            }
            if (square.top + square.height > imageTop + imageHeight) {
              square.height = imageHeight - square.top + imageTop;
            }
          }

          canvas.remove(square);
          canvas.add(square);
          square.setControlsVisibility({
            mtr: true,
          });
          canvas.setActiveObject(square);
          setHasSelection(true);
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

  const handleCrop = () => {
    const canvas = getCanvas();
    const square = canvas.getActiveObject();
    const image = canvas.getObjects().find((object) => object.isType("image"));

    if (square && image) {
      const cropped = new Image();
      cropped.src = canvas.toDataURL({
        left: square.left,
        top: square.top,
        width: square.width,
        height: square.height,
        multiplier: 1,
      });
      cropped.onload = () => {
        const newImage = new FabricImage(cropped, {
          left: square.left,
          top: square.top,
        });
        newImage.setCoords();
        canvas.remove(image);
        canvas.remove(square);
        canvas.add(newImage);
        canvas.bringObjectToFront(newImage);
        canvas.centerObject(newImage);
        canvas.renderAll();
      };
    }
  };

  return (
    <div className={styles.container}>
      <button
        className={
          isSelectionActive
            ? [
                styles.button,
                styles.selection,
                styles["selection--active"],
              ].join(" ")
            : [
                styles.button,
                styles.selection,
                styles["selection--inactive"],
              ].join(" ")
        }
        onClick={() => setIsSelectionActive((prevState) => !prevState)}
      >
        Rectangular Selection
      </button>
      {hasSelection && (
        <button className={styles.button} onClick={handleCrop}>
          Crop
        </button>
      )}
    </div>
  );
}

export { Controls };
