import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

const LONG_PRESS_MS = 450;
const MOVE_CANCEL_PX = 10;

type RowHandlers = {
  onPointerDown: (event: ReactPointerEvent) => void;
  onPointerMove: (event: ReactPointerEvent) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
};

/**
 * Long-press (touch / pen) opens a message's action tray so reply/react work
 * without hover. Fine-pointer hover still relies on CSS group-hover.
 */
export function useMessageActionTray(): {
  rootRef: RefObject<HTMLDivElement | null>;
  actionsOpen: boolean;
  closeActions: () => void;
  rowHandlers: RowHandlers;
} {
  const [actionsOpen, setActionsOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
  }

  useEffect(() => {
    if (!actionsOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setActionsOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [actionsOpen]);

  function onPointerDown(event: ReactPointerEvent) {
    // Mice get group-hover; avoid long-press competing with text selection/drag.
    if (event.pointerType === "mouse") return;

    startRef.current = { x: event.clientX, y: event.clientY };
    clearTimer();
    timerRef.current = setTimeout(() => {
      setActionsOpen(true);
      timerRef.current = null;
    }, LONG_PRESS_MS);
  }

  function onPointerMove(event: ReactPointerEvent) {
    if (!startRef.current || !timerRef.current) return;
    const dx = event.clientX - startRef.current.x;
    const dy = event.clientY - startRef.current.y;
    if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
      clearTimer();
    }
  }

  function onPointerEnd() {
    clearTimer();
  }

  return {
    rootRef,
    actionsOpen,
    closeActions: () => setActionsOpen(false),
    rowHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
      onPointerLeave: onPointerEnd,
    },
  };
}
