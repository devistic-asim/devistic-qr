type IconProps = { name: string };

const paths: Record<string, string[]> = {
  link: [
    'M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 5.93',
    'M14 11a5 5 0 0 0-7.07 0L5.5 12.43a5 5 0 0 0 7.07 7.07L14 18.07',
  ],
  text: ['M5 6h14', 'M5 12h14', 'M5 18h9'],
  wifi: ['M5 12.5a10 10 0 0 1 14 0', 'M8 15.5a6 6 0 0 1 8 0', 'M12 19h.01'],
  contact: ['M12 12a3.2 3.2 0 1 0-3.2-3.2A3.2 3.2 0 0 0 12 12z', 'M6.5 19.2a5.5 5.5 0 0 1 11 0'],
  email: ['M4 7h16v10H4z', 'M4 7l8 6 8-6'],
  sms: ['M5 6h14v9H8l-3 3z'],
  phone: [
    'M8 4.5h2.2l1 3-1.6 1a12 12 0 0 0 5.9 5.9l1-1.6 3 1V17a1.5 1.5 0 0 1-1.6 1.5A14.5 14.5 0 0 1 6.5 6.1 1.5 1.5 0 0 1 8 4.5z',
  ],
};

export function Icon({ name }: IconProps) {
  const draw = paths[name] ?? paths.text;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      {draw.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
