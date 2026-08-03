import { Reply } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Hover-revealed reply trigger, mirrored after the reaction picker styling.
 */
export default function ReplyButton({
  onReply,
  disabled,
  align,
  offsetForReactions,
}: {
  onReply: () => void;
  disabled?: boolean;
  align: "left" | "right";
  /** Shift aside when the reaction picker is also shown. */
  offsetForReactions?: boolean;
}) {
  const { translate: t } = useTranslation();

  const horizontal =
    align === "right"
      ? offsetForReactions
        ? "left-[34px]"
        : "left-1"
      : offsetForReactions
        ? "right-[34px]"
        : "right-1";

  return (
    <button
      type="button"
      disabled={disabled}
      className={
        "absolute z-10 flex h-[28px] w-[28px] items-center justify-center " +
        "rounded-full border border-border bg-background text-muted-foreground shadow " +
        "opacity-0 pointer-events-none transition-opacity " +
        "group-hover/message:opacity-100 group-hover/message:pointer-events-auto " +
        "hover:bg-muted hover:text-foreground disabled:opacity-50 " +
        `${horizontal} top-1`
      }
      onClick={(event) => {
        event.stopPropagation();
        onReply();
      }}
      aria-label={t("Responder")}
      title={t("Responder")}
    >
      <Reply className="h-[15px] w-[15px]" />
    </button>
  );
}
