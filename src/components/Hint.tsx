import { useId, useState } from 'react';

export function Hint({ text }: { text: string }) {
  const id = useId();
  const [pinned, setPinned] = useState(false);

  return (
    <span className={pinned ? 'hint is-pinned' : 'hint'}>
      <button
        type="button"
        className="hint-button"
        aria-label="More information"
        aria-describedby={id}
        aria-expanded={pinned}
        onClick={() => setPinned((open) => !open)}
        onBlur={() => setPinned(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setPinned(false);
            event.currentTarget.blur();
          }
        }}
      >
        i
      </button>
      <span role="tooltip" id={id} className="hint-bubble">
        {text}
      </span>
    </span>
  );
}
