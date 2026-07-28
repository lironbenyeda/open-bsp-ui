import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { SmilePlus } from "lucide-react";
import { Theme, type EmojiClickData } from "emoji-picker-react";
import type { ConversationRow, MessageRow } from "@/supabase/client";
import { sendReaction } from "@/utils/MessageUtils";
import {
  type AggregatedReaction,
  QUICK_REACTIONS,
} from "@/utils/ReactionUtils";
import { useCurrentAgent } from "@/queries/useAgents";
import { useTranslation } from "@/hooks/useTranslation";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

const PICKER_HEIGHT = 360;
const VIEWPORT_PADDING = 8;

type FloatingStyle = {
  top: number;
  left: number;
  placement: "above" | "below";
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Place a floating panel next to `anchor`, preferring above. Falls back to
 * below (or the side with more room) so it stays inside the viewport.
 */
function placeFloating(
  anchor: DOMRect,
  height: number,
  width: number,
): FloatingStyle {
  const spaceAbove = anchor.top - VIEWPORT_PADDING;
  const spaceBelow = window.innerHeight - anchor.bottom - VIEWPORT_PADDING;
  const placeAbove =
    spaceAbove >= height || (spaceAbove >= spaceBelow && spaceAbove > 64);

  const top = placeAbove
    ? clamp(
        anchor.top - height - 6,
        VIEWPORT_PADDING,
        window.innerHeight - height - VIEWPORT_PADDING,
      )
    : clamp(
        anchor.bottom + 6,
        VIEWPORT_PADDING,
        window.innerHeight - height - VIEWPORT_PADDING,
      );

  const left = clamp(
    anchor.left + anchor.width / 2 - width / 2,
    VIEWPORT_PADDING,
    window.innerWidth - width - VIEWPORT_PADDING,
  );

  return { top, left, placement: placeAbove ? "above" : "below" };
}

function useClickOutside(
  refs: RefObject<HTMLElement | null>[],
  onClose: () => void,
  enabled: boolean,
) {
  const refsRef = useRef(refs);
  refsRef.current = refs;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (refsRef.current.every((ref) => !ref.current?.contains(target))) {
        onClose();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [enabled, onClose]);
}

export function ReactionPicker({
  onPick,
  disabled,
  align,
}: {
  onPick: (emoji: string) => void;
  disabled?: boolean;
  align: "left" | "right";
}) {
  const { translate: t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);
  const [panelStyle, setPanelStyle] = useState<FloatingStyle | null>(null);
  const [pickerWidth, setPickerWidth] = useState(320);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isDark = document.documentElement.classList.contains("dark");

  const close = useCallback(() => {
    setOpen(false);
    setShowFullPicker(false);
  }, []);

  useClickOutside([triggerRef, panelRef], close, open);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    function updatePosition() {
      const anchor = triggerRef.current?.getBoundingClientRect();
      if (!anchor) {
        return;
      }

      const width = Math.min(320, window.innerWidth - 48);
      setPickerWidth(width);

      const quickWidth = 28 * 7 + 16;
      const height = showFullPicker
        ? PICKER_HEIGHT + 40 + 8 // picker + gap + quick bar
        : 40;

      setPanelStyle(
        placeFloating(anchor, height, showFullPicker ? width : quickWidth),
      );
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    // Capture scrolls from the chat scroller (overflow ancestor).
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, showFullPicker]);

  function pick(emoji: string) {
    onPick(emoji);
    close();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={
          "absolute z-10 flex h-[28px] w-[28px] items-center justify-center " +
          "rounded-full border border-border bg-background text-muted-foreground shadow " +
          "opacity-0 pointer-events-none transition-opacity " +
          "group-hover/message:opacity-100 group-hover/message:pointer-events-auto " +
          "hover:bg-muted hover:text-foreground disabled:opacity-50 " +
          (align === "right" ? "left-1 top-1" : "right-1 top-1") +
          (open
            ? " opacity-100 pointer-events-auto bg-muted text-foreground"
            : "")
        }
        onClick={() => {
          setOpen((value) => !value);
          setShowFullPicker(false);
        }}
        aria-label={t("Más reacciones")}
        aria-expanded={open}
      >
        <SmilePlus className="h-[16px] w-[16px]" />
      </button>

      {open &&
        panelStyle &&
        createPortal(
          <div
            ref={panelRef}
            className={
              "fixed z-[1000] flex gap-[6px] " +
              (panelStyle.placement === "above"
                ? "flex-col-reverse"
                : "flex-col")
            }
            style={{ top: panelStyle.top, left: panelStyle.left }}
          >
            <div className="flex w-fit items-center gap-[2px] rounded-full border border-border bg-background px-[6px] py-[4px] shadow">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  disabled={disabled}
                  className="h-[28px] w-[28px] rounded-full text-[18px] leading-none hover:bg-muted disabled:opacity-50"
                  onClick={() => pick(emoji)}
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                disabled={disabled}
                className={
                  "h-[28px] w-[28px] rounded-full text-muted-foreground hover:bg-muted disabled:opacity-50 " +
                  (showFullPicker ? "bg-muted text-foreground" : "")
                }
                onClick={() => setShowFullPicker((value) => !value)}
                aria-label={t("Más reacciones")}
                aria-expanded={showFullPicker}
              >
                <SmilePlus className="h-[16px] w-[16px] mx-auto" />
              </button>
            </div>

            {showFullPicker && (
              <div className="overflow-hidden rounded-xl border border-border bg-background shadow-lg">
                <Suspense
                  fallback={
                    <div
                      className="flex items-center justify-center text-sm text-muted-foreground"
                      style={{ width: pickerWidth, height: PICKER_HEIGHT }}
                    >
                      {t("Cargando...")}
                    </div>
                  }
                >
                  <EmojiPicker
                    onEmojiClick={(emoji: EmojiClickData) => pick(emoji.emoji)}
                    theme={isDark ? Theme.DARK : Theme.LIGHT}
                    width={pickerWidth}
                    height={PICKER_HEIGHT}
                    searchPlaceholder={t("Buscar emoji")}
                    lazyLoadEmojis
                    previewConfig={{ showPreview: false }}
                  />
                </Suspense>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

function ReactionBadges({
  reactions,
  align,
}: {
  reactions: AggregatedReaction[];
  align: "left" | "right";
}) {
  if (!reactions.length) {
    return null;
  }

  return (
    <div
      className={
        "flex max-w-[90%] lg:max-w-[65%] -mt-[6px] mb-[2px] " +
        (align === "right" ? "justify-end" : "justify-start")
      }
    >
      <div className="inline-flex items-center gap-[2px] rounded-full border border-border bg-background px-[6px] py-[2px] text-[14px] shadow-sm">
        {reactions.map(({ emoji, count }) => (
          <span key={emoji} className="inline-flex items-center gap-[2px]">
            <span>{emoji}</span>
            {count > 1 && (
              <span className="text-[11px] text-muted-foreground">{count}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function MessageReactions({
  message,
  conversation,
  reactions,
  ownReaction,
  canReact,
  align,
  picker,
}: {
  message: MessageRow;
  conversation?: ConversationRow;
  reactions: AggregatedReaction[];
  ownReaction?: string;
  canReact: boolean;
  align: "left" | "right";
  /** When true, render only the floating picker trigger (for inside bubble). */
  picker?: boolean;
}) {
  const { data: agent } = useCurrentAgent();
  const [sending, setSending] = useState(false);

  const reactable =
    canReact &&
    !!conversation &&
    !!message.external_id &&
    (message.direction === "incoming" || message.direction === "outgoing");

  async function handlePick(emoji: string) {
    if (!conversation || !message.external_id || sending) {
      return;
    }

    const nextEmoji = ownReaction === emoji ? "" : emoji;

    setSending(true);
    try {
      await sendReaction(
        conversation,
        message.external_id,
        nextEmoji,
        agent?.id,
      );
    } finally {
      setSending(false);
    }
  }

  if (picker) {
    if (!reactable) {
      return null;
    }

    return (
      <ReactionPicker onPick={handlePick} disabled={sending} align={align} />
    );
  }

  if (!reactions.length) {
    return null;
  }

  return (
    <div
      className={
        align === "right"
          ? "lg:px-[63px] px-[24px] flex justify-end"
          : "lg:px-[63px] px-[24px] flex justify-start"
      }
    >
      <ReactionBadges reactions={reactions} align={align} />
    </div>
  );
}
