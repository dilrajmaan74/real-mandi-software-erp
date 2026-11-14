import React, { useEffect, useState } from 'react';
import { DEFAULT_MPH_SETTINGS, MphSettings } from '../../types/mandiPaddyHisab';
import { RotateCcw, Save, Settings } from 'lucide-react';

interface MphSettingsViewProps {
  settings: MphSettings;
  onSaveSettings: (next: MphSettings) => void;
}

export const MphSettingsView: React.FC<MphSettingsViewProps> = ({
  settings,
  onSaveSettings,
}) => {
  const [hybridRate, setHybridRate] = useState(String(settings.hybridPaddyRate));
  const [gradeARate, setGradeARate] = useState(String(settings.paddyAGurdeRate));
  const [jFormLaborRate, setJFormLaborRate] = useState(String(settings.jFormLaborRate));
  const [dryingLaborRate, setDryingLaborRate] = useState(String(settings.paddyDryingLaborRate));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setHybridRate(String(settings.hybridPaddyRate));
    setGradeARate(String(settings.paddyAGurdeRate));
    setJFormLaborRate(String(settings.jFormLaborRate));
    setDryingLaborRate(String(settings.paddyDryingLaborRate));
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const h = Number(hybridRate);
    const g = Number(gradeARate);
    const jl = Number(jFormLaborRate);
    const dl = Number(dryingLaborRate);

    if ([h, g, jl, dl].some((n) => isNaN(n) || n < 0)) {
      setErrorMsg('ਸਾਰੇ ਰੇਟ 0 ਜਾਂ ਇਸ ਤੋਂ ਵੱਧ ਸਹੀ ਨੰਬਰ ਹੋਣੇ ਚਾਹੀਦੇ ਹਨ (All rates must be valid non-negative numbers).');
      return;
    }

    onSaveSettings({
      id: 'default',
      hybridPaddyRate: h,
      paddyAGurdeRate: g,
      jFormLaborRate: jl,
      paddyDryingLaborRate: dl,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleResetDefaults = () => {
    setHybridRate(String(DEFAULT_MPH_SETTINGS.hybridPaddyRate));
    setGradeARate(String(DEFAULT_MPH_SETTINGS.paddyAGurdeRate));
    setJFormLaborRate(String(DEFAULT_MPH_SETTINGS.jFormLaborRate));
    setDryingLaborRate(String(DEFAULT_MPH_SETTINGS.paddyDryingLaborRate));
    setErrorMsg(null);
  };

  return (
    <div className="max-w-2xl bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-slate-700" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Mandi Paddy Hisab Settings (ਰੇਟ ਅਤੇ ਲੇਬਰ ਸੈਟਿੰਗਾਂ)
            </h3>
            <p className="text-[11px] text-slate-500">
              Changes apply permanently for your account and automatically update labour deductions
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleResetDefaults}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
            {errorMsg}
          </div>
        )}

        <div>
          <h4 className="text-xs font-bold text-slate-900 mb-3 pb-1 border-b border-slate-100">
            Default Paddy Rates per Quintal (ਝੋਨੇ ਦੇ ਡਿਫਾਲਟ ਰੇਟ)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Hybrid Paddy Rate (₹ / Quintal)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={hybridRate}
                onChange={(e) => setHybridRate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default: ₹2350</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Paddy A Gurde Rate (₹ / Quintal)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={gradeARate}
                onChange={(e) => setGradeARate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default: ₹2461</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-900 mb-3 pb-1 border-b border-slate-100">
            Labour & Expense Rates per Bag (ਲੇਬਰ ਤੇ ਖਰਚੇ ਪ੍ਰਤੀ ਗੱਟਾ)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                J-Form Labour (₹ / Bag)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={jFormLaborRate}
                onChange={(e) => setJFormLaborRate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default: ₹8 per bag</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Paddy Drying Labour (₹ / Bag)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={dryingLaborRate}
                onChange={(e) => setDryingLaborRate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default: ₹10 per bag</span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings (ਸੈਟਿੰਗਾਂ ਸੇਵ ਕਰੋ)</span>
          </button>
        </div>
      </form>
    </div>
  );
};
