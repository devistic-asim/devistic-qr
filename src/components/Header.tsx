import { GITHUB_PROFILE, PRODUCT_NAME } from '../lib/constants';
import type { ThemeChoice } from '../lib/types';
import { ThemeSwitch } from './ThemeSwitch';

export function Header({ theme, onTheme }: { theme: ThemeChoice; onTheme: (theme: ThemeChoice) => void }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="brand">
          <a href={GITHUB_PROFILE} target="_blank" rel="noopener noreferrer">
            <img
              src={`${import.meta.env.BASE_URL}devistic-logo.jpg`}
              alt="Devistic, opens the GitHub profile in a new tab"
              width={44}
              height={44}
            />
          </a>
          <div>
            <h1>{PRODUCT_NAME}</h1>
            <p>Free QR tools. Nothing leaves this browser.</p>
          </div>
        </div>
        <ThemeSwitch value={theme} onChange={onTheme} />
      </div>
    </header>
  );
}
