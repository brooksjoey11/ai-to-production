// src/features/submission/LanguageSelector.tsx
interface LanguageSelectorProps {
  value: string;
  onChange: (lang: string) => void;
}

const languages = [
  'plaintext',
  'python',
  'javascript',
  'typescript',
  'java',
  'c',
  'cpp',
  'csharp',
  'go',
  'rust',
  'ruby',
  'php',
  'swift',
  'kotlin',
];

export default function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  return (
    <div>
      <label className="block font-sans text-xs font-bold uppercase tracking-widest mb-2">
        Language
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-4 border-black p-3 font-mono text-sm bg-white focus:outline-none"
      >
        {languages.map((lang) => (
          <option key={lang} value={lang}>
            {lang.charAt(0).toUpperCase() + lang.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}
