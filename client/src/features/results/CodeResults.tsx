// src/features/results/CodeResults.tsx
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import ForensicDossier from './ForensicDossier';
import RebuiltCode from './RebuiltCode';
import QualityReport from './QualityReport';
import ExportAll from './ExportAll';

interface CodeResultsProps {
  submissionId: string;
  forensicDossier: string;
  rebuiltCode: string;
  qualityReport: string;
}

export default function CodeResults({
  submissionId,
  forensicDossier,
  rebuiltCode,
  qualityReport,
}: CodeResultsProps) {
  const [activeTab, setActiveTab] = useState('rebuild');

  return (
    <div className="space-y-8">
      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
        <Tabs.List className="grid grid-cols-3 border-4 border-black">
          <Tabs.Trigger
            value="forensic"
            className="py-4 font-sans font-bold uppercase tracking-widest data-[state=active]:bg-black data-[state=active]:text-white border-r-4 border-black last:border-r-0"
          >
            Forensic Dossier
          </Tabs.Trigger>
          <Tabs.Trigger
            value="rebuild"
            className="py-4 font-sans font-bold uppercase tracking-widest data-[state=active]:bg-black data-[state=active]:text-white border-r-4 border-black last:border-r-0"
          >
            Rebuilt Code
          </Tabs.Trigger>
          <Tabs.Trigger
            value="quality"
            className="py-4 font-sans font-bold uppercase tracking-widest data-[state=active]:bg-black data-[state=active]:text-white"
          >
            Quality Report
          </Tabs.Trigger>
        </Tabs.List>

        <div className="mt-8">
          <AnimatePresence mode="wait">
            {activeTab === 'forensic' && (
              <motion.div
                key="forensic"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ForensicDossier content={forensicDossier} />
              </motion.div>
            )}
            {activeTab === 'rebuild' && (
              <motion.div
                key="rebuild"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <RebuiltCode code={rebuiltCode} language="auto" />
              </motion.div>
            )}
            {activeTab === 'quality' && (
              <motion.div
                key="quality"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <QualityReport content={qualityReport} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Tabs.Root>

      <ExportAll
        forensicDossier={forensicDossier}
        rebuiltCode={rebuiltCode}
        qualityReport={qualityReport}
      />
    </div>
  );
}
