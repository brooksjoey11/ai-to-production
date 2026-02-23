// src/features/admin/ModelSelector.tsx
import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';

const STEPS = ['forensic', 'rebuilder', 'quality'] as const;
const AVAILABLE_MODELS = [
  'gpt-4-turbo',
  'gpt-4o',
  'claude-3.5-sonnet',
  'gemini-2.5-flash',
] as const;

interface ModelSelectorProps {
  models: Record<string, string>;
  onSave: (step: string, model: string) => Promise<void>;
  isSaving: boolean;
}

export default function ModelSelector({ models, onSave, isSaving }: ModelSelectorProps) {
  const [localModels, setLocalModels] = useState<Record<string, string>>(models);
  const [savingStep, setSavingStep] = useState<string | null>(null);

  const handleChange = (step: string, model: string) => {
    setLocalModels((prev) => ({ ...prev, [step]: model }));
  };

  const handleSave = async (step: string) => {
    setSavingStep(step);
    await onSave(step, localModels[step] || AVAILABLE_MODELS[0]);
    setSavingStep(null);
  };

  return (
    <div className="space-y-6">
      {STEPS.map((step) => (
        <div key={step} className="border-4 border-black p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="text-xl font-black uppercase mb-2">{step}</h3>
              <p className="text-sm text-gray-600">Select LLM model for {step} step</p>
            </div>
            <div className="flex flex-col md:flex-row gap-4 md:items-center">
              <select
                value={localModels[step] || AVAILABLE_MODELS[0]}
                onChange={(e) => handleChange(step, e.target.value)}
                className="bg-white border-4 border-black p-3 font-mono text-sm focus:outline-none"
              >
                {AVAILABLE_MODELS.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleSave(step)}
                disabled={isSaving && savingStep === step}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm border-4 border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {isSaving && savingStep === step ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
