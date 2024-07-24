import { useEffect, useState } from "react";
import styles from "./App.module.css";

function Thumbnails() {
  const [thumbnails, setThumbnails] = useState<string[]>(["receipt.jpg"]);

  const setThumbnail = (url: string) => {
    setThumbnails((thumbnails) => [...thumbnails, url]);
  };

  useEffect(() => {
    const listener = (e: any) => {
      setThumbnail(e.detail.url);
    };

    document.addEventListener("add-thumbnail", listener, false);

    return () => {
      document.removeEventListener("add-thumbnail", listener, false);
    };
  }, []);

  return (
    <div className={styles.thumbnails}>
      {thumbnails.map((src) => (
        <div key={src} className={styles.thumbnail}>
          <img src={src} alt="thumbnail" />
        </div>
      ))}
    </div>
  );
}

export { Thumbnails };
