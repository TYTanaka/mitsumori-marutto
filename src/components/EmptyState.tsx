/**
 * Shared empty state for the venue list (H3): one line of explanation
 * plus the next action, instead of each tab improvising its own
 * blank/bare message.
 */
export function EmptyState({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <p>{message}</p>
      {actionLabel && onAction && (
        <button className="btn btn-primary" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
