import React, { createContext, useContext, useCallback, useRef, useState } from "react";
import PopupModal from "./PopupModal";

const PopupContext = createContext();

export function PopupProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const isOpen = !!current;
  const queueRef = useRef(queue);

  // Prevent duplicate popups by type+title+message
  const showPopup = useCallback((popup) => {
    setQueue((prev) => {
      const exists = prev.some(
        (p) =>
          p.type === popup.type &&
          p.title === popup.title &&
          p.message === popup.message
      );
      if (exists) return prev;
      return [...prev, popup];
    });
  }, []);

  // Advance queue
  React.useEffect(() => {
    queueRef.current = queue;
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((q) => q.slice(1));
    }
  }, [queue, current]);

  // Close popup
  const closePopup = useCallback((confirmed = false) => {
    if (current) {
      if (confirmed && typeof current.onConfirm === "function") {
        current.onConfirm();
      }
      if (!confirmed && typeof current.onCancel === "function") {
        current.onCancel();
      }
      setCurrent(null);
    }
  }, [current]);

  const contextValue = React.useMemo(
    () => ({ showPopup }),
    [showPopup]
  );

  return (
    <PopupContext.Provider value={contextValue}>
      {children}
      {isOpen && (
        <PopupModal
          {...current}
          onClose={() => closePopup(false)}
          onConfirm={() => closePopup(true)}
          onCancel={() => closePopup(false)}
        />
      )}
    </PopupContext.Provider>
  );
}

export function usePopup() {
  const ctx = useContext(PopupContext);
  if (!ctx) throw new Error("usePopup must be used within PopupProvider");
  return ctx;
}
