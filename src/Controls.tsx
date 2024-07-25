import type { Canvas as FabricCanvas } from "fabric";
import { useEffect, useRef, useState } from "react";
import { Path, Rect } from "fabric";

import styles from "./Controls.module.css";

function Controls({ getCanvas }: { getCanvas: () => FabricCanvas }) {
  const [
    { isRedactionActive, isSelectionActive, hasRectangularSelection },
    setState,
  ] = useState({
    isRedactionActive: false,
    isSelectionActive: false,
    hasRectangularSelection: false,
  });
  const [selectionCoords, setSelectionCoords] = useState<any>();

  const updateHasRectangularSelection = (value: boolean) => {
    setState((prevState) => ({
      ...prevState,
      hasRectangularSelection: value,
    }));
  };

  useSelectionTool({
    isSelectionActive,
    getCanvas,
    updateHasRectangularSelection,
  });

  useRedactionTool({ isRedactionActive, getCanvas });

  const handleCrop = () => {
    const canvas = getCanvas();
    const square = canvas.getActiveObject();
    const image = canvas.getObjects().find((object) => object.isType("image"));

    if (square && image) {
      setSelectionCoords(square.oCoords);

      const cropped = new Image();
      cropped.src = canvas.toDataURL({
        left: square.left,
        top: square.top,
        width: square.width,
        height: square.height,

        format: "jpeg",
        multiplier: 1,
      });
      cropped.onload = () => {
        const event = new CustomEvent("add-thumbnail", {
          detail: { url: cropped.src },
        });
        document.dispatchEvent(event);

        // const newImage = new FabricImage(cropped, {
        //   left: square.left,
        //   top: square.top,
        // });
        canvas.remove(square);
        canvas.renderAll();
      };
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.buttons}>
        <button
          className={
            isSelectionActive
              ? [styles.button, styles.buttonActive].join(" ")
              : [styles.button, styles.buttonInactive].join(" ")
          }
          onClick={() =>
            setState((prevState) => ({
              ...prevState,
              isRedactionActive: false,
              isSelectionActive: !prevState.isSelectionActive,
            }))
          }
        >
          Rectangular Selection
        </button>
        <button
          className={
            isRedactionActive
              ? [styles.button, styles.buttonActive].join(" ")
              : [styles.button, styles.buttonInactive].join(" ")
          }
          onClick={() => {
            setState((prevState) => ({
              ...prevState,
              hasRectangularSelection: false,
              isSelectionActive: false,
              isRedactionActive: !prevState.isRedactionActive,
            }));
          }}
        >
          Redact
        </button>
        {hasRectangularSelection && (
          <button className={styles.button} onClick={handleCrop}>
            Crop
          </button>
        )}
      </div>

      <div>
        {selectionCoords && (
          <div>
            <p style={{ fontSize: "12px" }}>
              Crop: {`{`} tl: [{selectionCoords.tl.x}, {selectionCoords.tl.y}],
              tr: [{selectionCoords.tr.x}, {selectionCoords.tr.y}], bl: [
              {selectionCoords.bl.x}, {selectionCoords.bl.y}], br: [
              {selectionCoords.br.x}, {selectionCoords.br.y}] {`}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function useSelectionTool({
  isSelectionActive,
  getCanvas,
  updateHasRectangularSelection,
}) {
  const selectionRef = useRef<Rect | null>(null);

  useEffect(() => {
    let started = false;
    let x = 0;
    let y = 0;

    /* Mousedown */
    const mousedown = (event) => {
      const canvas = getCanvas();

      // allow user to select existing rectangle
      if (event.target === selectionRef.current) {
        return false;
      }

      updateHasRectangularSelection(false);

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
      if (!started) {
        return false;
      }

      const canvas = getCanvas();
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
    const mouseup = () => {
      const canvas = getCanvas();

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

            // if it does, adjust the square
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
          updateHasRectangularSelection(true);
        }

        canvas.renderAll();
        selectionRef.current = square as Rect;
      }
    };

    const canvas = getCanvas();

    if (canvas && isSelectionActive) {
      canvas.on("mouse:down", mousedown);
      canvas.on("mouse:move", mousemove);
      canvas.on("mouse:up", mouseup);

      return () => {
        canvas.off("mouse:down", mousedown);
        canvas.off("mouse:move", mousemove);
        canvas.off("mouse:up", mouseup);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelectionActive]);
}

function useRedactionTool({ isRedactionActive, getCanvas }) {
  const prevRect = useRef<Path | null>(null);

  // not using Rect because for some reason when you resize the Rect it does fill correctly
  useEffect(() => {
    let started = false;
    let x = 0;
    let y = 0;

    const mousedown = (event) => {
      const canvas = getCanvas();

      if (event.target?.isType("path") || event.target?.isType("rect")) {
        canvas.setActiveObject(event.target);
        return false;
      }

      // allow user to select existing rectangle
      if (event.target === prevRect.current) {
        return false;
      }

      // ensure object does not preserve aspect ratio
      canvas.set("uniformScaling", true);

      started = true;
      const mouse = event.e;
      x = mouse.pageX - canvas._offset.left;
      y = mouse.pageY - canvas._offset.top;

      const square = new Path("M0 0h0v0H0Z", {
        // width: 0,
        // height: 0,
        left: x,
        top: y,
        fill: "black",
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
      square.setCoords();
      canvas.setActiveObject(square);
      prevRect.current = square;
    };

    const mousemove = (event) => {
      if (!started) {
        return false;
      }

      const canvas = getCanvas();
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
        // having to do this roundabout way to update path
        const updatedPath = new Path(`M0 0h${width}v${height}H0Z`, {
          left: newLeft,
          top: newTop,
          fill: "black",
          uniformScaling: false,
          cornerColor: "blue",
          transparentCorners: false,
          cornerStrokeColor: "white",
          cornerStyle: "circle",
        });

        square.set({
          path: updatedPath.path,
          width: updatedPath.width,
          height: updatedPath.height,
          pathOffset: updatedPath.pathOffset,
        });
        square.setCoords();

        canvas.renderAll();
      }
    };

    const mouseup = () => {
      const canvas = getCanvas();

      if (started) {
        started = false;
      }

      canvas.set("uniformScaling", false);

      const square = canvas.getActiveObject();

      if (square) {
        const height = square.get("height");
        const width = square.get("width");

        if (!height && !width) {
          square.set({
            // width: 100,
            // height: 25,
            path: `M0 0h100v25H0Z`,
          });
        }

        const newPath = new Path(`M0 0h${width}v${height}H0Z`, {
          left: square.left,
          top: square.top,
          width: square.width,
          height: square.height,
          fill: "black",
          uniformScaling: false,
          cornerColor: "blue",
          transparentCorners: false,
          cornerStrokeColor: "white",
          cornerStyle: "circle",
        });

        canvas.remove(square);
        canvas.add(newPath);
        newPath.setControlsVisibility({
          mtr: true,
        });
        canvas.setActiveObject(newPath);
        canvas.renderAll();
        prevRect.current = newPath;
      }
    };

    const canvas = getCanvas();

    if (canvas && isRedactionActive) {
      canvas.on("mouse:down", mousedown);
      canvas.on("mouse:move", mousemove);
      canvas.on("mouse:up", mouseup);

      return () => {
        canvas.off("mouse:down", mousedown);
        canvas.off("mouse:move", mousemove);
        canvas.off("mouse:up", mouseup);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRedactionActive]);
}

export { Controls };
