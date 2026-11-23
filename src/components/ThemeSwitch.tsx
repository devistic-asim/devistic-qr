import type { ThemeChoice } from '../lib/types';

const choices: { id: ThemeChoice; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
];

export function ThemeSwitch({ value, onChange }: { value: ThemeChoice; onChange: (theme: ThemeChoice) => void }) {
  return (
    <div className="theme-switch" role="radiogroup" aria-label="Color theme">
      {choices.map((choice) => (
        <button
          key={choice.id}
          type="button"
          role="radio"
          aria-checked={value === choice.id}
          className={value === choice.id ? 'is-selected' : undefined}
          onClick={() => onChange(choice.id)}
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}
