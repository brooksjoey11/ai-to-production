// src/features/admin/AdminDashboard.tsx
import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import PromptEditor from './PromptEditor';
import ModelSelector from './ModelSelector';
import HistoryTable from './HistoryTable';
import { trpc } from '../../lib/trpc';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('prompts');
  const utils = trpc.useUtils();

  // Fetch current prompts and models
  const { data: promptsData, refetch: refetchPrompts } = trpc.admin.getPrompt.useQuery();
  const { data: modelsData, refetch: refetchModels } = trpc.admin.getModel.useQuery();

  const updatePrompt = trpc.admin.updatePrompt.useMutation({
    onSuccess: () => {
      utils.admin.getPrompt.invalidate();
    },
  });
  const updateModel = trpc.admin.updateModel.useMutation({
    onSuccess: () => {
      utils.admin.getModel.invalidate();
    },
  });

  const handleSavePrompt = async (step: string, text: string) => {
    await updatePrompt.mutateAsync({ step, promptText: text });
  };

  const handleSaveModel = async (step: string, model: string) => {
    await updateModel.mutateAsync({ step, selectedModel: model });
  };

  return (
    <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
      <Tabs.List className="flex border-b-4 border-black">
        <Tabs.Trigger
          value="prompts"
          className="flex-1 py-4 font-sans font-bold uppercase tracking-widest data-[state=active]:bg-black data-[state=active]:text-white border-r-4 border-black last:border-r-0"
        >
          System Prompts
        </Tabs.Trigger>
        <Tabs.Trigger
          value="models"
          className="flex-1 py-4 font-sans font-bold uppercase tracking-widest data-[state=active]:bg-black data-[state=active]:text-white border-r-4 border-black last:border-r-0"
        >
          Model Selection
        </Tabs.Trigger>
        <Tabs.Trigger
          value="history"
          className="flex-1 py-4 font-sans font-bold uppercase tracking-widest data-[state=active]:bg-black data-[state=active]:text-white"
        >
          Submission History
        </Tabs.Trigger>
      </Tabs.List>

      <div className="mt-8">
        {activeTab === 'prompts' && (
          <PromptEditor
            prompts={promptsData || {}}
            onSave={handleSavePrompt}
            isSaving={updatePrompt.isLoading}
          />
        )}
        {activeTab === 'models' && (
          <ModelSelector
            models={modelsData || {}}
            onSave={handleSaveModel}
            isSaving={updateModel.isLoading}
          />
        )}
        {activeTab === 'history' && <HistoryTable />}
      </div>
    </Tabs.Root>
  );
}
