import { PRIVACY_TEXT } from '../lib/constants';

export function PrivacyNotice({ onDismiss, onClear }: { onDismiss: () => void; onClear: () => void }) {
  return (
    <section className="privacy" aria-label="Privacy">
      <p>{PRIVACY_TEXT}</p>
      <div className="privacy-actions">
        <button type="button" className="button secondary" onClick={onClear}>
          Clear my local data
        </button>
        <button type="button" className="button primary" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </section>
  );
}
