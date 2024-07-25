import styles from "./App.module.css";

import type { Canvas as FabricCanvas } from "fabric";
import { useRef, useState } from "react";
import { FabricImage } from "fabric";
import { Canvas } from "./Canvas.tsx";
import { Controls } from "./Controls.tsx";
import { Thumbnails } from "./Thumbnails.tsx";

function App() {
  const [hasLoaded, setHasLoaded] = useState(false);

  // elements
  const headerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // canvas
  const canvasRef = useRef<FabricCanvas>(null);

  const getCanvas = () => canvasRef.current as FabricCanvas;

  const getCanvasContainerDimensions = () => {
    const { width, height } =
      canvasContainerRef.current!.getBoundingClientRect();
    return { width, height };
  };

  const loadImage = (url: string) => FabricImage.fromURL(url);

  const onLoad = async (canvas: FabricCanvas) => {
    // canvas fill container
    const { width, height } = getCanvasContainerDimensions();
    canvas.setDimensions({ width, height });

    const oImg = await loadImage("receipt.jpg");
    oImg.set({
      hasBorders: false,
      hasControls: false,
      selectable: false,
      lockMovementX: true,
      lockMovementY: true,
    });

    // to disable individual controls
    // oImg.setControlsVisibility({
    //   tl: false,
    //   tr: false,
    //   br: false,
    //   bl: false,
    //
    //   mt: false,
    //   mb: false,
    //   ml: false,
    //   mr: false,
    // });

    // scale image but deduct 10% to fit height or width into canvas
    scaleImageToFit({ img: oImg, canvas });

    // add image to canvas
    canvas.add(oImg);

    // center object
    canvas.centerObject(oImg);

    // set object as active
    canvas.setActiveObject(oImg);

    setHasLoaded(true);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header} ref={headerRef}>
        {hasLoaded && <Controls getCanvas={getCanvas} />}
      </div>

      <div className={styles.canvas_container}>
        <Thumbnails />
        <div ref={canvasContainerRef} style={{ width: "100%" }}>
          <Canvas ref={canvasRef} onLoad={onLoad} />
        </div>
      </div>
    </div>
  );
}

function scaleImageToFit({
  img,
  canvas,
}: {
  img: FabricImage;
  canvas: FabricCanvas;
}) {
  const containerHeight = canvas.height;
  let scaleFactor = canvas.width / img.width;
  const scaledHeight = img.height * scaleFactor;

  // if the image is too tall, scale it down to fit the container height
  if (scaledHeight > containerHeight) {
    scaleFactor = containerHeight / img.height;
  }

  // deduct 10%
  img.scale(scaleFactor);

  return {
    width: Math.ceil(canvas.width),
    height: Math.ceil(img.height * scaleFactor),
  };
}

export default App;
