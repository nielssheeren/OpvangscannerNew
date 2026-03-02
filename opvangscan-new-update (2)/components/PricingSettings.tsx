
import React, { useState } from 'react';
import { PricingConfig } from '../types';
import { Save, Euro, Clock } from 'lucide-react';

interface PricingSettingsProps {
  pricing: PricingConfig;
  onUpdatePricing: (config: PricingConfig) => void;
}

const PricingSettings: React.FC<PricingSettingsProps> = ({ pricing, onUpdatePricing }) => {
  const [localPricing, setLocalPricing] = useState<PricingConfig>(pricing);
  const [saved, setSaved] = useState(false);

  // Sync local state when props change (e.g. after cloud fetch)
  React.useEffect(() => {
    setLocalPricing(pricing);
  }, [pricing]);

  const handleSave = () => {
    onUpdatePricing(localPricing);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-black">Tarieven Instellen</h3>
        {saved && (
          <span className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-3 py-1 rounded-full">
            Opgeslagen!
          </span>
        )}
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Regular Days */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Maandag - Vrijdag (excl. Wo)</h4>
            <div className="space-y-3">
              <label className="block">
                <span className="text-[10px] font-black text-slate-500 uppercase ml-1">Ochtend (€)</span>
                <div className="relative mt-1">
                  <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input
                    type="number"
                    step="0.05"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-300 transition-colors"
                    value={localPricing.morningPrice}
                    onChange={e => setLocalPricing({ ...localPricing, morningPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-[10px] font-black text-slate-500 uppercase ml-1">Namiddag (€)</span>
                <div className="relative mt-1">
                  <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input
                    type="number"
                    step="0.05"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-300 transition-colors"
                    value={localPricing.eveningPrice}
                    onChange={e => setLocalPricing({ ...localPricing, eveningPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Wednesday */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Woensdag</h4>
            <div className="space-y-3">
              <label className="block">
                <span className="text-[10px] font-black text-indigo-500 uppercase ml-1">Ochtend (€)</span>
                <div className="relative mt-1">
                  <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-300" />
                  <input
                    type="number"
                    step="0.05"
                    className="w-full pl-12 pr-4 py-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl font-bold outline-none focus:border-indigo-300 transition-colors"
                    value={localPricing.wednesdayMorningPrice}
                    onChange={e => setLocalPricing({ ...localPricing, wednesdayMorningPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-[10px] font-black text-indigo-500 uppercase ml-1">Namiddag (€)</span>
                <div className="relative mt-1">
                  <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-300" />
                  <input
                    type="number"
                    step="0.05"
                    className="w-full pl-12 pr-4 py-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl font-bold outline-none focus:border-indigo-300 transition-colors"
                    value={localPricing.wednesdayEveningPrice}
                    onChange={e => setLocalPricing({ ...localPricing, wednesdayEveningPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </label>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Save className="w-4 h-4" /> Tarieven Opslaan
        </button>
      </div>
    </section>
  );
};

export default PricingSettings;
