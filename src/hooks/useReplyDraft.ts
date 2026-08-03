import useBoundStore from "@/stores/useBoundStore";
import { useAgent } from "@/queries/useAgents";
import { useContactByAddress } from "@/queries/useContacts";
import { formatPhoneNumber } from "@/utils/FormatUtils";
import { useTranslation } from "@/hooks/useTranslation";

/** Active conversation's reply draft + a WhatsApp-style sender label. */
export function useReplyDraft() {
  const { translate: t } = useTranslation();
  const activeConvId = useBoundStore((store) => store.ui.activeConvId);
  const convName = useBoundStore(
    (store) => store.chat.conversations.get(store.ui.activeConvId || "")?.name,
  );
  const replyToMessage = useBoundStore((store) => {
    const id = store.chat.replyToIds.get(store.ui.activeConvId || "");
    if (!id) return undefined;
    return store.chat.messages.get(store.ui.activeConvId || "")?.get(id);
  });
  const setConversationReplyTo = useBoundStore(
    (store) => store.chat.setConversationReplyTo,
  );

  const isGroupReplyIncoming =
    !!replyToMessage?.group_address &&
    replyToMessage.direction === "incoming" &&
    !!replyToMessage.contact_address;
  const { data: replySenderContact } = useContactByAddress(
    isGroupReplyIncoming ? replyToMessage?.contact_address : undefined,
    replyToMessage?.service,
  );
  const { data: replyAgent } = useAgent(
    (replyToMessage &&
      replyToMessage.direction !== "incoming" &&
      replyToMessage.agent_id) ||
      "",
  );

  let replySenderLabel = t("Mensaje");
  if (replyToMessage) {
    if (replyToMessage.direction === "incoming") {
      replySenderLabel =
        replySenderContact?.name ||
        (isGroupReplyIncoming
          ? formatPhoneNumber(replyToMessage.contact_address!)
          : convName) ||
        t("Contacto");
    } else {
      replySenderLabel = replyAgent?.name || t("Tú");
    }
  }

  function clearReply() {
    if (activeConvId) {
      setConversationReplyTo(activeConvId, null);
    }
  }

  return {
    activeConvId,
    replyToMessage,
    replySenderLabel,
    clearReply,
    setConversationReplyTo,
  };
}
