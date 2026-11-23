import { GITHUB_PROFILE, GITHUB_REPO } from '../lib/constants';

export function Footer({ onClear, onShowHistory }: { onClear: () => void; onShowHistory: () => void }) {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p>
          <a href={GITHUB_PROFILE} target="_blank" rel="noopener noreferrer">
            GitHub profile
          </a>
          <span aria-hidden="true"> · </span>
          <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer">
            Star or contribute
          </a>
        </p>
        <p className="footer-actions">
          <button type="button" className="button ghost" onClick={onShowHistory}>
            Saved data
          </button>
          <button type="button" className="button ghost" onClick={onClear}>
            Clear my local data
          </button>
        </p>
      </div>
    </footer>
  );
}
