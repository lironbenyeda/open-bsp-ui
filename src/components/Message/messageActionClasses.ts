/**
 * Shared visibility for floating message actions (reply, react).
 *
 * - Pointer devices that can hover: reveal on message hover (and when forced).
 * - Touch / coarse pointers: only reveal when the message opens its action tray
 *   (long-press), so every bubble is not permanently cluttered with icons.
 */
export function messageActionTriggerClass({
  forceVisible,
  horizontalPosition,
}: {
  forceVisible?: boolean;
  horizontalPosition: string;
}): string {
  const forced = forceVisible
    ? " opacity-100 pointer-events-auto bg-muted text-foreground"
    : "";

  return (
    "absolute z-10 flex h-[28px] w-[28px] items-center justify-center " +
    "rounded-full border border-border bg-background text-muted-foreground shadow " +
    "opacity-0 pointer-events-none transition-opacity " +
    "group-hover/message:opacity-100 group-hover/message:pointer-events-auto " +
    "group-data-[actions-open]/message:opacity-100 " +
    "group-data-[actions-open]/message:pointer-events-auto " +
    "hover:bg-muted hover:text-foreground disabled:opacity-50 " +
    `${horizontalPosition} top-1` +
    forced
  );
}
