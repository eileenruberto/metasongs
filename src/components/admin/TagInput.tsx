import { useState } from 'preact/hooks';

interface Props {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export default function TagInput({ values, onChange, placeholder }: Props) {
  const [draft, setDraft] = useState('');

  const addTag = (raw: string) => {
    const value = raw.trim();
    if (!value || values.includes(value)) return;
    onChange([...values, value]);
    setDraft('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div class="admin-checkboxes">
      {values.map((v) => (
        <label key={v}>
          {v}
          <button
            type="button"
            aria-label={`Remove ${v}`}
            onClick={() => onChange(values.filter((x) => x !== v))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
          >
            ×
          </button>
        </label>
      ))}
      <input
        type="text"
        value={draft}
        placeholder={placeholder}
        onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(draft)}
        style={{ border: 'none', background: 'none', font: 'inherit', minWidth: '8rem', outline: 'none' }}
      />
    </div>
  );
}
