// src/features/admin/PromptEditor.tsx
import { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { Loader2, Save, Eye, EyeOff } from 'lucide-react';

const STEPS = ['forensic', 'rebuilder', 'quality'] as const;

interface PromptEditorProps {
  prompts: Record<string, string>;
  onSave: (step: string, text: string) => Promise<void>;
  isSaving: boolean;
}

export default function PromptEditor({ prompts, onSave, isSaving }: PromptEditorProps) {
  const [selectedStep, setSelectedStep] = useState<(typeof STEPS)[number]>('forensic');
  const [localPrompts, setLocalPrompts] = useState<Record<string, string>>(prompts);
  const [showPreview, setShowPreview] = useState(false);

  const handleChange = (val: string) => {
    setLocalPrompts((prev) => ({ ...prev, [selectedStep]: val }));
  };

  const handleSave = () => {
    onSave(selectedStep, localPrompts[selectedStep] || '');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {STEPS.map((step) => (
          <button
            key={step}
            onClick={() => setSelectedStep(step)}
            className={`py-6 px-4 font-black text-lg border-4 transition-colors uppercase tracking-widest ${
              selectedStep === step
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-black hover:bg-gray-100'
            }`}
          >
            {step}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="border-4 border-black overflow-hidden">
          <CodeMirror
            value={localPrompts[selectedStep] || ''}
            onChange={handleChange}
            extensions={[markdown()]}
            theme="light"
            height="400px"
            className="text-sm"
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              foldGutter: true,
              dropCursor: true,
              allowMultipleSelections: true,
              indentOnInput: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              rectangularSelection: true,
              highlightSelectionMatches: true,
            }}
          />
        </div>

        {showPreview && (
          <div className="border-4 border-black p-6 bg-white overflow-y-auto max-h-96">
            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
              {localPrompts[selectedStep]}
            </pre>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-2 px-4 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
        >
          {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>

        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="font-bold">Characters:</span>{' '}
            {localPrompts[selectedStep]?.length || 0}
          </div>
          <div className="text-sm">
            <span className="font-bold">Est. Tokens:</span>{' '}
            {Math.ceil((localPrompts[selectedStep]?.length || 0) / 4)}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-4 bg-black text-white font-bold uppercase tracking-widest border-4 border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              Save Prompt
            </>
          )}
        </button>
      </div>
    </div>
  );
}
