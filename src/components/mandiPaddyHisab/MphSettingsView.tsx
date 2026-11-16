import React, { useEffect, useState } from 'react';
import { DEFAULT_MPH_SETTINGS, MphSettings } from '../../types/mandiPaddyHisab';
import { useMphLang } from '../../lib/mandiPaddyHisabI18n';
import { Plus, RotateCcw, Save, Settings, X } from 'lucide-react';

interface MphSettingsViewProps {
  settings: MphSettings;
  onSaveSettings: (next: MphSettings) => void;
}

export const MphSettingsView: React.FC<MphSettingsViewProps> = ({
  settings,
  onSaveSettings,
}) => {
  const { tr } = useMphLang();
  const [hybridRate, setHybridRate] = useState(String(settings.hybridPaddyRate));
  const [gradeARate, setGradeARate] = useState(String(settings.paddyAGurdeRate));
  const [jFormLaborRate, setJFormLaborRate] = useState(String(settings.jFormLaborRate));
  const [dryingLaborRate, setDryingLaborRate] = useState(String(settings.paddyDryingLaborRate));
  const [dryingRatesList, setDryingRatesList] = useState<number[]>(
    settings.dryingLaborRates && settings.dryingLaborRates.length > 0
      ? settings.dryingLaborRates
      : DEFAULT_MPH_SETTINGS.dryingLaborRates || [8, 10, 12]
  );
  const [newDryingRateInput, setNewDryingRateInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setHybridRate(String(settings.hybridPaddyRate));
    setGradeARate(String(settings.paddyAGurdeRate));
    setJFormLaborRate(String(settings.jFormLaborRate));
    setDryingLaborRate(String(settings.paddyDryingLaborRate));
    setDryingRatesList(
      settings.dryingLaborRates && settings.dryingLaborRates.length > 0
        ? settings.dryingLaborRates
        : DEFAULT_MPH_SETTINGS.dryingLaborRates || [8, 10, 12]
    );
  }, [settings]);

  const handleAddDryingPreset = () => {
    setErrorMsg(null);
    const val = Math.round((Number(newDryingRateInput) || 0) * 100) / 100;
    if (newDryingRateInput.trim() === '' || isNaN(val) || val < 0) {
      setErrorMsg(
        tr(
          'Enter a valid non-negative drying rate to add.',
          'ਜੋੜਨ ਲਈ ਸਹੀ ਸੁਕਾਈ ਲੇਬਰ ਰੇਟ ਦਰਜ ਕਰੋ।'
        )
      );
      return;
    }
    const merged = Array.from(new Set([...dryingRatesList, val])).sort((a, b) => a - b);
    setDryingRatesList(merged);
    setNewDryingRateInput('');
  };

  const handleRemoveDryingPreset = (rate: number) => {
    if (dryingRatesList.length <= 1) return;
    setDryingRatesList((prev) => prev.filter((r) => r !== rate));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const h = Number(hybridRate);
    const g = Number(gradeARate);
    const jl = Number(jFormLaborRate);
    const dl = Number(dryingLaborRate);

    if ([h, g, jl, dl].some((n) => isNaN(n) || n < 0)) {
      setErrorMsg(
        tr(
          'All rates must be valid non-negative numbers.',
          'ਸਾਰੇ ਰੇਟ 0 ਜਾਂ ਇਸ ਤੋਂ ਵੱਧ ਸਹੀ ਨੰਬਰ ਹੋਣੇ ਚਾਹੀਦੇ ਹਨ।'
        )
      );
      return;
    }

    const mergedRates = Array.from(new Set([...dryingRatesList, dl]))
      .filter((n) => Number.isFinite(n) && n >= 0)
      .sort((a, b) => a - b)
      .slice(0, 20);

    onSaveSettings({
      id: 'default',
      hybridPaddyRate: h,
      paddyAGurdeRate: g,
      jFormLaborRate: jl,
      paddyDryingLaborRate: dl,
      dryingLaborRates: mergedRates.length > 0 ? mergedRates : [dl],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleResetDefaults = () => {
    setHybridRate(String(DEFAULT_MPH_SETTINGS.hybridPaddyRate));
    setGradeARate(String(DEFAULT_MPH_SETTINGS.paddyAGurdeRate));
    setJFormLaborRate(String(DEFAULT_MPH_SETTINGS.jFormLaborRate));
    setDryingLaborRate(String(DEFAULT_MPH_SETTINGS.paddyDryingLaborRate));
    setDryingRatesList(DEFAULT_MPH_SETTINGS.dryingLaborRates || [8, 10, 12]);
    setNewDryingRateInput('');
    setErrorMsg(null);
  };

  return (
    <div className="max-w-2xl bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-slate-700" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {tr('Mandi Paddy Hisab Settings', 'ਮੰਡੀ ਝੋਨਾ ਹਿਸਾਬ ਰੇਟ ਅਤੇ ਲੇਬਰ ਸੈਟਿੰਗਾਂ')}
            </h3>
            <p className="text-[11px] text-slate-500">
              {tr(
                'Changes apply permanently for your account and automatically update labour deductions',
                'ਇਹ ਬਦਲਾਅ ਤੁਹਾਡੇ ਖਾਤੇ ਲਈ ਪੱਕੇ ਤੌਰ ਤੇ ਸੇਵ ਹੁੰਦੇ ਹਨ ਅਤੇ ਲੇਬਰ ਕਟੌਤੀ ਆਪਣੇ-ਆਪ ਅੱਪਡੇਟ ਕਰਦੇ ਹਨ'
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleResetDefaults}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{tr('Reset Defaults', 'ਡਿਫਾਲਟ ਰੇਟ')}</span>
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
            {tr('Default Paddy Rates per Quintal', 'ਝੋਨੇ ਦੇ ਡਿਫਾਲਟ ਰੇਟ (ਪ੍ਰਤੀ ਕੁਇੰਟਲ)')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {tr('Default Hybrid Paddy Rate (₹ / Quintal)', 'ਡਿਫਾਲਟ ਹਾਈਬ੍ਰਿਡ ਝੋਨਾ ਰੇਟ (₹ / ਕੁਇੰਟਲ)')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={hybridRate}
                onChange={(e) => setHybridRate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                {tr('Default: ₹2350', 'ਡਿਫਾਲਟ: ₹2350')}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {tr('Default Paddy A Grade Rate (₹ / Quintal)', 'ਡਿਫਾਲਟ ਝੋਨਾ A ਗ੍ਰੇਡ ਰੇਟ (₹ / ਕੁਇੰਟਲ)')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={gradeARate}
                onChange={(e) => setGradeARate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                {tr('Default: ₹2461', 'ਡਿਫਾਲਟ: ₹2461')}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-900 mb-3 pb-1 border-b border-slate-100">
            {tr('Labour & Expense Rates per Bag', 'ਲੇਬਰ ਅਤੇ ਖਰਚੇ ਦੇ ਰੇਟ (ਪ੍ਰਤੀ ਬੈਗ)')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {tr('J-Form Labour (₹ / Bag)', 'ਜੇ-ਫਾਰਮ ਲੇਬਰ (₹ / ਬੈਗ)')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={jFormLaborRate}
                onChange={(e) => setJFormLaborRate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                {tr('Default: ₹8 per bag', 'ਡਿਫਾਲਟ: ₹8 ਪ੍ਰਤੀ ਬੈਗ')}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {tr('Default Paddy Drying Labour (₹ / Bag)', 'ਡਿਫਾਲਟ ਝੋਨਾ ਸੁਕਾਈ ਲੇਬਰ (₹ / ਬੈਗ)')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={dryingLaborRate}
                onChange={(e) => setDryingLaborRate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                {tr('Default: ₹10 per bag', 'ਡਿਫਾਲਟ: ₹10 ਪ੍ਰਤੀ ਬੈਗ')}
              </span>
            </div>
          </div>

          {/* Multi-rate Paddy Drying Labour Preset Manager */}
          <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-800">
                {tr(
                  'Paddy Drying Labour Multi-Rate Presets (₹ / Bag)',
                  'ਝੋਨਾ ਸੁਕਾਈ ਲੇਬਰ ਮਲਟੀ-ਰੇਟ ਸੂਚੀ (₹ / ਬੈਗ)'
                )}
              </label>
              <p className="text-[11px] text-slate-500">
                {tr(
                  'Add multiple drying rates (e.g. ₹8, ₹10, ₹12) to quickly assign different rates per farmer or arrival.',
                  'ਵੱਖ-ਵੱਖ ਸੁਕਾਈ ਰੇਟ (ਜਿਵੇਂ ₹8, ₹10, ₹12) ਜੋੜੋ ਤਾਂ ਜੋ ਹਰ ਕਿਸਾਨ ਜਾਂ ਆਵਕ ਲਈ ਵੱਖਰਾ ਰੇਟ ਚੁਣਿਆ ਜਾ ਸਕੇ।'
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {dryingRatesList.map((r) => {
                const isDefault = Number(dryingLaborRate) === r;
                return (
                  <div
                    key={r}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${
                      isDefault
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-slate-800 border-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setDryingLaborRate(String(r))}
                      className="cursor-pointer"
                      title={tr('Set as Default Rate', 'ਡਿਫਾਲਟ ਰੇਟ ਬਣਾਓ')}
                    >
                      ₹{r}/{tr('Bag', 'ਬੈਗ')}
                      {isDefault ? ` (${tr('Default', 'ਡਿਫਾਲਟ')})` : ''}
                    </button>
                    {dryingRatesList.length > 1 && !isDefault && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDryingPreset(r)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        title={tr('Remove rate', 'ਰੇਟ ਹਟਾਓ')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                step="0.01"
                min="0"
                value={newDryingRateInput}
                onChange={(e) => setNewDryingRateInput(e.target.value)}
                placeholder={tr('Add new rate e.g. 6, 8, 12, 15', 'ਨਵਾਂ ਰੇਟ ਲਿਖੋ ਜਿਵੇਂ 6, 8, 12, 15')}
                className="w-56 px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-emerald-600"
              />
              <button
                type="button"
                onClick={handleAddDryingPreset}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{tr('Add Rate', 'ਰੇਟ ਜੋੜੋ')}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{tr('Save Settings', 'ਸੈਟਿੰਗਾਂ ਸੇਵ ਕਰੋ')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
