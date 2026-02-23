// src/features/submission/CommentsField.tsx
interface CommentsFieldProps {
  value: string;
  onChange: (val: string) => void;
}

export default function CommentsField({ value, onChange }: CommentsFieldProps) {
  return (
    <div>
      <label className="block font-sans text-xs font-bold uppercase tracking-widest mb-2">
        Additional Context (optional)
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add any notes for the detective..."
        className="w-full border-4 border-black p-3 font-mono text-sm bg-white h-32 resize-none"
      />
    </div>
  );
}
