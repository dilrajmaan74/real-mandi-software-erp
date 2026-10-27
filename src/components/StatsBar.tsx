import React from 'react';
import { MandiTransaction } from '../types/mandi';
import { Wheat, Package, Truck, Wallet, Users, Layers } from 'lucide-react';

interface StatsBarProps {
  entries: MandiTransaction[];
}

export const StatsBar: React.FC<StatsBarProps> = ({ entries }) => {
  const totalQuintals = entries.reduce((acc, curr) => acc + (curr.crop_inward?.weight_quintals || 0), 0);
  const totalBags = entries.reduce((acc, curr) => acc + (curr.crop_inward?.total_bags || 0), 0);
  const totalLifted = entries.reduce((acc, curr) => acc + (curr.lifting_dispatch?.lifted_bags || 0), 0);
  const totalPendingLifting = entries.reduce((acc, curr) => acc + (curr.lifting_dispatch?.pending_lifting_bags || 0), 0);
  const totalValuation = entries.reduce((acc, curr) => acc + (curr.crop_inward?.total_amount || 0), 0);
  const bardanaBalance = entries.reduce((acc, curr) => acc + (curr.bardana_tracking?.bardana_balance || 0), 0);

  const stats = [
    {
      label: "Total Arrival (ਆਵਕ)",
      val: `${totalQuintals.toFixed(1)} Qtl`,
      sub: `${totalBags} Total Bags`,
      icon: Wheat,
      color: "text-amber-700 bg-amber-100",
    },
    {
      label: "Lifting Status (ਲਿਫਟਿੰਗ)",
      val: `${totalLifted} Lifted`,
      sub: `${totalPendingLifting} Pending in Yard`,
      icon: Truck,
      color: "text-purple-700 bg-purple-100",
    },
    {
      label: "Gross Crop Value (ਕੁੱਲ ਬੋਲੀ)",
      val: `₹${(totalValuation / 100000).toFixed(2)} Lakh`,
      sub: `Across ${entries.length} Entries`,
      icon: Wallet,
      color: "text-emerald-700 bg-emerald-100",
    },
    {
      label: "Bardana Balance (ਬਾਰਦਾਨਾ)",
      val: `${bardanaBalance} Bags`,
      sub: "Net Agency vs Farmer Stock",
      icon: Package,
      color: "text-orange-700 bg-orange-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-xl border border-gray-200 p-3.5 sm:p-4 shadow-xs flex items-center gap-3.5"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-gray-500 block truncate">
                {stat.label}
              </span>
              <div className="text-base sm:text-lg font-bold text-gray-900 font-mono truncate">
                {stat.val}
              </div>
              <span className="text-[10px] text-gray-400 block truncate font-medium">
                {stat.sub}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
