import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
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

function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [enabled, onClose, ref]);
}

function ReactionPicker({
  onPick,
  disabled,
}: {
  onPick: (emoji: string) => void;
  disabled?: boolean;
}) {
  const { translate: t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setShowFullPicker(false), showFullPicker);

  const isDark = document.documentElement.classList.contains("dark");
  const visible = open || showFullPicker;

  function pick(emoji: string) {
    onPick(emoji);
    setOpen(false);
    setShowFullPicker(false);
  }

  return (
    <div
      ref={containerRef}
      className={
        "absolute z-20 bottom-full mb-[6px] opacity-0 pointer-events-none transition-opacity " +
        "group-hover/message:opacity-100 group-hover/message:pointer-events-auto " +
        (visible ? "opacity-100 pointer-events-auto" : "")
      }
      onMouseLeave={() => {
        if (!showFullPicker) {
          setOpen(false);
        }
      }}
    >
      <div className="flex flex-col items-start gap-[6px]">
        {showFullPicker && (
          <div className="overflow-hidden rounded-xl border border-border shadow-lg">
            <Suspense
              fallback={
                <div className="flex h-[360px] w-[min(320px,calc(100vw-48px))] items-center justify-center bg-background text-sm text-muted-foreground">
                  {t("Cargando...")}
                </div>
              }
            >
              <EmojiPicker
                onEmojiClick={(emoji: EmojiClickData) => pick(emoji.emoji)}
                theme={isDark ? Theme.DARK : Theme.LIGHT}
                width="min(320px, calc(100vw - 48px))"
                height={360}
                searchPlaceholder={t("Buscar emoji")}
                lazyLoadEmojis
                previewConfig={{ showPreview: false }}
              />
            </Suspense>
          </div>
        )}

        <div className="flex items-center gap-[2px] rounded-full border border-border bg-background px-[6px] py-[4px] shadow">
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
            onClick={() => {
              setOpen(true);
              setShowFullPicker((value) => !value);
            }}
            aria-label={t("Más reacciones")}
            aria-expanded={showFullPicker}
          >
            <SmilePlus className="h-[16px] w-[16px] mx-auto" />
          </button>
        </div>
      </div>
    </div>
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
}: {
  message: MessageRow;
  conversation?: ConversationRow;
  reactions: AggregatedReaction[];
  ownReaction?: string;
  canReact: boolean;
  align: "left" | "right";
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

  if (!reactions.length && !reactable) {
    return null;
  }

  return (
    <div
      className={
        "relative group/message " +
        (align === "right"
          ? "lg:px-[63px] px-[24px] flex justify-end"
          : "lg:px-[63px] px-[24px] flex justify-start")
      }
    >
      {reactable && <ReactionPicker onPick={handlePick} disabled={sending} />}
      <ReactionBadges reactions={reactions} align={align} />
    </div>
  );
}
