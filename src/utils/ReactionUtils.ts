import type { MessageRow } from "@/supabase/client";

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

export function isReactionMessage(message: MessageRow): boolean {
  return message.content.type === "text" && message.content.kind === "reaction";
}

export function reactionTargetId(message: MessageRow): string | undefined {
  if (!isReactionMessage(message)) {
    return undefined;
  }

  return message.content.re_message_id;
}

function reactorKey(message: MessageRow): string {
  if (message.direction === "incoming") {
    return `incoming:${message.contact_address || "contact"}`;
  }

  if (message.direction === "outgoing") {
    return `outgoing:${message.agent_id || "organization"}`;
  }

  return `internal:${message.agent_id || message.id}`;
}

export type AggregatedReaction = {
  emoji: string;
  count: number;
};

export type ReactionIndex = Map<
  string,
  Map<string, { emoji: string; message: MessageRow }>
>;

/** Latest reaction per reactor wins; empty emoji removes a reaction. */
export function buildReactionIndex(messages: MessageRow[]): ReactionIndex {
  const index: ReactionIndex = new Map();

  const reactionMessages = messages
    .filter(isReactionMessage)
    .slice()
    .sort((a, b) => {
      const ta = +new Date(a.timestamp);
      const tb = +new Date(b.timestamp);
      if (ta !== tb) return ta - tb;

      const ca = +new Date(a.created_at);
      const cb = +new Date(b.created_at);
      if (ca !== cb) return ca - cb;

      return (a.id || "").localeCompare(b.id || "");
    });

  for (const reaction of reactionMessages) {
    const targetId = reactionTargetId(reaction);
    if (!targetId || reaction.content.type !== "text") {
      continue;
    }

    const reactors = index.get(targetId) || new Map();
    const key = reactorKey(reaction);
    const emoji = reaction.content.text;

    if (!emoji) {
      reactors.delete(key);
    } else {
      reactors.set(key, {
        emoji,
        message: reaction,
      });
    }

    if (reactors.size) {
      index.set(targetId, reactors);
    } else {
      index.delete(targetId);
    }
  }

  return index;
}

export function getAggregatedReactions(
  message: MessageRow,
  index: ReactionIndex,
): AggregatedReaction[] {
  if (!message.external_id) {
    return [];
  }

  const reactors = index.get(message.external_id);
  if (!reactors) {
    return [];
  }

  const grouped = new Map<string, number>();

  for (const { emoji } of reactors.values()) {
    grouped.set(emoji, (grouped.get(emoji) || 0) + 1);
  }

  return Array.from(grouped.entries()).map(([emoji, count]) => ({
    emoji,
    count,
  }));
}

export function getOwnReactionEmoji(
  message: MessageRow,
  index: ReactionIndex,
  agentId?: string,
): string | undefined {
  if (!message.external_id || !agentId) {
    return undefined;
  }

  return index.get(message.external_id)?.get(`outgoing:${agentId}`)?.emoji;
}

export function supportsReactions(
  service: MessageRow["service"] | undefined,
): boolean {
  return (
    service === "whatsapp" ||
    service === "instagram" ||
    service === "whatsapp-web" ||
    service === "local"
  );
}
