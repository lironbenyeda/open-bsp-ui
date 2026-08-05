import { Reply } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { messageActionTriggerClass } from "./messageActionClasses";

/**
 * Reply trigger on a message bubble.
 * Visible on hover (desktop) or when the message action tray is open (mobile long-press).
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
      className={messageActionTriggerClass({ horizontalPosition: horizontal })}
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
