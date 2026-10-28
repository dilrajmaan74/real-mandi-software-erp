import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Sparkles, Check } from 'lucide-react';
import { getSavedVillages, registerVillage, VillageItem } from '../lib/villages';

interface VillageSelectorProps {
  valueEn: string;
  valuePa?: string;
  onChange: (villageEn: string, villagePa: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  datalistId?: string;
  className?: string;
  showChips?: boolean;
  maxChips?: number;
}

export const VillageSelector: React.FC<VillageSelectorProps> = ({
  valueEn,
  valuePa = '',
  onChange,
  label = 'ਪਿੰਡ (Village / Pind):',
  placeholder = 'ਪਿੰਡ ਦਾ ਨਾਮ ਚੁਣੋ ਜਾਂ ਲਿਖੋ (e.g. Bhadaur)',
  required = false,
  datalistId = 'village-options-list',
  className = '',
  showChips = true,
  maxChips = 8,
}) => {
  const [villages, setVillages] = useState<VillageItem[]>(() => getSavedVillages());
  const [activeChip, setActiveChip] = useState<string>('');

  // Listen for real-time updates when new villages are added anywhere in the app
  useEffect(() => {
    const handleUpdate = () => {
      setVillages(getSavedVillages());
    };
    window.addEventListener('kisanmitra_villages_updated', handleUpdate);
    return () => window.removeEventListener('kisanmitra_villages_updated', handleUpdate);
  }, []);

  const handleSelectVillage = async (village: VillageItem) => {
    setActiveChip(village.name_en);
    onChange(village.name_en, village.name_pa);
    // Increment usage count
    await registerVillage(village.name_en, village.name_pa);
  };

  const handleInputChange = async (inputVal: string) => {
    setActiveChip('');
    // Check if input matches an existing village in either English or Punjabi
    const match = villages.find(
      (v) =>
        v.name_en.toLowerCase() === inputVal.trim().toLowerCase() ||
        v.name_pa === inputVal.trim()
    );

    if (match) {
      onChange(match.name_en, match.name_pa);
      setActiveChip(match.name_en);
    } else {
      // Free typing
      onChange(inputVal, valuePa || inputVal);
    }
  };

  const handleBlur = async () => {
    if (valueEn.trim()) {
      // Auto-register newly typed village so it's remembered next time!
      await registerVillage(valueEn.trim(), valuePa?.trim());
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-gray-700 font-bold text-xs flex items-center justify-between">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-700" />
            <span>{label}</span>
          </span>
          <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
            ਆਟੋ-ਸੇਵ ਪਿੰਡ ਲਿਸਟ
          </span>
        </label>
      )}

      {/* Input Field with Datalist */}
      <div className="relative">
        <input
          type="text"
          value={valueEn || valuePa}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleBlur}
          list={datalistId}
          placeholder={placeholder}
          required={required}
          className="w-full p-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-bold shadow-xs focus:border-emerald-600 focus:outline-none text-xs"
        />

        <datalist id={datalistId}>
          {villages.map((v) => (
            <option key={`${v.name_en}-${v.name_pa}`} value={v.name_en}>
              {v.name_pa ? `${v.name_pa} (${v.name_en})` : v.name_en}
            </option>
          ))}
        </datalist>
      </div>

      {/* Quick Select Village Chips */}
      {showChips && villages.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          <span className="text-[10px] text-gray-400 font-medium mr-0.5">ਚੁਣੋ:</span>
          {villages.slice(0, maxChips).map((v) => {
            const isSelected =
              valueEn.toLowerCase() === v.name_en.toLowerCase() ||
              valuePa === v.name_pa ||
              activeChip === v.name_en;

            return (
              <button
                key={v.name_en}
                type="button"
                onClick={() => handleSelectVillage(v)}
                className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                    : 'bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-900 border-gray-200 hover:border-emerald-300'
                }`}
                title={`Select ${v.name_en} (${v.name_pa})`}
              >
                {v.name_pa || v.name_en}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
