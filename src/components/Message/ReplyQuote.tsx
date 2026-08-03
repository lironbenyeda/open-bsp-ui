import type { MessageRow } from "@/supabase/client";
import { getMessagePreviewText } from "@/utils/ReplyUtils";
import { useTranslation } from "@/hooks/useTranslation";
import { mediaCategory } from "@/components/Message/media";
import { X } from "lucide-react";

type ReplyQuoteProps = {
  message?: MessageRow;
  senderLabel: string;
  /** Composer bar variant with dismiss control. */
  onDismiss?: () => void;
  onClick?: () => void;
  /** Prefixed title shown in the composer (e.g. "Respondiendo a"). */
  title?: string;
};

function MediaGlyph({ message }: { message: MessageRow }) {
  if (message.content.type !== "file") {
    return null;
  }

  const category = mediaCategory(
    message.content.kind,
    message.content.file?.mime_type || "",
  );

  let iconKind = "document";
  if (message.content.kind === "sticker") {
    iconKind = "sticker";
  } else if (
    category === "audio" ||
    category === "video" ||
    category === "image" ||
    category === "document"
  ) {
    iconKind = category;
  }

  return (
    <svg className="h-[14px] w-[14px] shrink-0 text-muted-foreground">
      <use href={`/icons.svg#chat-${iconKind}`} />
    </svg>
  );
}

/**
 * WhatsApp-style quoted message strip — used inside bubbles and above the
 * composer when replying.
 */
export default function ReplyQuote({
  message,
  senderLabel,
  onDismiss,
  onClick,
  title,
}: ReplyQuoteProps) {
  const { translate: t } = useTranslation();

  const preview = message
    ? getMessagePreviewText(message, t)
    : t("Mensaje original no disponible");

  const body = (
    <div
      className={
        "flex min-w-0 flex-1 items-stretch overflow-hidden rounded-md " +
        "bg-black/[0.06] dark:bg-white/[0.08]" +
        (onClick
          ? " cursor-pointer hover:bg-black/[0.09] dark:hover:bg-white/[0.12]"
          : "")
      }
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className="w-[4px] shrink-0 bg-primary" />
      <div className="min-w-0 flex-1 px-[8px] py-[6px]">
        {title && (
          <div className="text-[12px] text-muted-foreground mb-[2px]">
            {title}
          </div>
        )}
        <div className="text-[12.8px] font-medium text-primary truncate">
          {senderLabel || t("Mensaje")}
        </div>
        <div className="flex items-center gap-[4px] text-[13px] text-muted-foreground">
          {message && <MediaGlyph message={message} />}
          <span className="truncate">{preview || t("Mensaje")}</span>
        </div>
      </div>
    </div>
  );

  if (!onDismiss) {
    return <div className="mx-[3px] mt-[3px] mb-[1px]">{body}</div>;
  }

  return (
    <div className="flex items-stretch gap-[4px] mb-[6px] mx-[4px]">
      {body}
      <button
        type="button"
        className="shrink-0 self-center p-[6px] rounded-full hover:bg-accent text-muted-foreground hover:text-foreground"
        onClick={onDismiss}
        title={t("Cancelar respuesta")}
        aria-label={t("Cancelar respuesta")}
      >
        <X className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}
