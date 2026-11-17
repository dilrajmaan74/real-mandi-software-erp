import { toJpeg } from 'html-to-image';
import {
  DEFAULT_MPH_SETTINGS,
  MphFarmerAccountSummary,
  MphOtherEntry,
  MphSettings,
} from '../types/mandiPaddyHisab';
import { MphLang } from './mandiPaddyHisabI18n';
import {
  displayMphText,
  formatAdvanceMonthsDays,
  formatDateDMY,
  formatDryingBreakdownText,
  formatINR,
  formatLooseKgGm,
  formatRupeesInWords,
  formatWeightQKG,
  getAdvanceBreakdown,
  getEffectiveArrivalDryingRate,
  safeNum,
  safeStr,
} from './mandiPaddyHisabUtils';

export type MphWhatsappMessageMode = 'full' | 'summary' | 'receipt';

function trPaddyType(type: string, lang: MphLang): string {
  if (lang === 'pa') {
    if (type === 'Hybrid Paddy') return 'ਹਾਈਬ੍ਰਿਡ ਝੋਨਾ';
    if (type === 'Paddy A Gurde') return 'ਝੋਨਾ ਏ ਗ੍ਰੇਡ';
  }
  return safeStr(type);
}

function trRelation(rel: string, lang: MphLang): string {
  if (lang !== 'pa') return safeStr(rel, 'Self');
  switch (rel) {
    case 'Self':
      return 'ਖੁਦ';
    case 'Son':
      return 'ਪੁੱਤਰ';
    case 'Wife':
      return 'ਪਤਨੀ';
    case 'Hissedar':
      return 'ਹਿੱਸੇਦਾਰ';
    case 'Father':
      return 'ਪਿਤਾ';
    case 'Brother':
      return 'ਭਰਾ';
    case 'Other':
      return 'ਹੋਰ';
    default:
      return safeStr(rel, 'Self');
  }
}

export function normalizeWhatsAppPhone(phone?: string): string {
  const digits = safeStr(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length >= 11) return digits;
  return '';
}

export function buildWhatsAppUrl(phone: string, text: string): string {
  const normalized = normalizeWhatsAppPhone(phone);
  const encoded = encodeURIComponent(safeStr(text));
  return normalized
    ? `https://wa.me/${normalized}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

export function buildFarmerPuraHisabWhatsAppText(
  summary: MphFarmerAccountSummary,
  settings: MphSettings,
  lang: MphLang,
  mode: MphWhatsappMessageMode = 'full'
): string {
  if (!summary || !summary.farmer) return '';
  if (mode === 'receipt') {
    return buildFarmerPaymentReceiptWhatsAppText(summary, settings, lang);
  }
  const safeSettings = {
    ...DEFAULT_MPH_SETTINGS,
    ...(settings || {}),
  };
  const isPa = lang === 'pa';
  const todayStr = formatDateDMY(new Date().toISOString().split('T')[0]);
  const f = summary.farmer;
  const lines: string[] = [];

  // Greeting & Header
  if (isPa) {
    const farmerPa = displayMphText(f.name, 'pa');
    lines.push(`🙏 *ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ${farmerPa} ਜੀ!*`);
    lines.push('🌾 *ਮੰਡੀ ਝੋਨਾ ਹਿਸਾਬ — ਪੂਰਾ ਖਾਤਾ ਸਟੇਟਮੈਂਟ*');
    lines.push(`*ਤਾਰੀਖ:* ${todayStr}`);
    lines.push('─────────────────────');
    lines.push(`*ਕਿਸਾਨ:* ${farmerPa}`);
    if (f.fatherName) lines.push(`*ਪਿਤਾ ਦਾ ਨਾਮ:* ${displayMphText(f.fatherName, 'pa')}`);
    lines.push(`*ਪਿੰਡ:* ${displayMphText(f.village, 'pa')}`);
    if (f.mobile) lines.push(`*ਮੋਬਾਈਲ:* ${safeStr(f.mobile)}`);
  } else {
    lines.push(`🙏 *Sat Sri Akal ${f.name} Ji!*`);
    lines.push('🌾 *Mandi Paddy Hisab — Complete Account Statement*');
    lines.push(`*Date:* ${todayStr}`);
    lines.push('─────────────────────');
    lines.push(`*Farmer:* ${f.name}`);
    if (f.fatherName) lines.push(`*Father Name:* ${f.fatherName}`);
    lines.push(`*Village:* ${f.village}`);
    if (f.mobile) lines.push(`*Mobile:* ${f.mobile}`);
  }

  // 1. Paddy Arrivals
  lines.push('─────────────────────');
  if (isPa) {
    lines.push(`*1. ਝੋਨਾ ਆਵਕ ਵੇਰਵਾ (${summary.arrivals.length} ਐਂਟਰੀਆਂ):*`);
    if (mode === 'full' && summary.arrivals.length > 0) {
      summary.arrivals.forEach((a, i) => {
        const looseText =
          a.looseKg > 0 || a.looseGm > 0
            ? ` (+${formatLooseKgGm(a.looseKg, a.looseGm, 'pa')})`
            : '';
        lines.push(
          `${i + 1}. ${formatDateDMY(a.date)} | ${trPaddyType(a.paddyType, lang)} | ${a.bags} ਬੈਗ${looseText} | ${formatWeightQKG(a.weightQtlPart, a.weightKgPart, a.weightGmPart, 'pa')} @ ₹${a.ratePerQuintal} = *${formatINR(a.paddyAmount)}*`
        );
      });
    }
    lines.push(
      `• *ਕੁੱਲ ਬੈਗ:* ${summary.totalArrivalBags} | *ਕੁੱਲ ਵਜ਼ਨ:* ${formatWeightQKG(
        summary.weightQtlPart,
        summary.weightKgPart,
        summary.weightGmPart,
        'pa'
      )}`
    );
    lines.push(`• *(+) ਕੁੱਲ ਝੋਨੇ ਦੀ ਰਕਮ:* *${formatINR(summary.totalPaddyAmount)}*`);
  } else {
    lines.push(`*1. Paddy Arrival Details (${summary.arrivals.length} Entries):*`);
    if (mode === 'full' && summary.arrivals.length > 0) {
      summary.arrivals.forEach((a, i) => {
        const looseText =
          a.looseKg > 0 || a.looseGm > 0
            ? ` (+${formatLooseKgGm(a.looseKg, a.looseGm)})`
            : '';
        lines.push(
          `${i + 1}. ${formatDateDMY(a.date)} | ${trPaddyType(a.paddyType, lang)} | ${a.bags} Bags${looseText} | ${formatWeightQKG(a.weightQtlPart, a.weightKgPart, a.weightGmPart)} @ ₹${a.ratePerQuintal} = *${formatINR(a.paddyAmount)}*`
        );
      });
    }
    lines.push(
      `• *Total Bags:* ${summary.totalArrivalBags} | *Total Weight:* ${formatWeightQKG(
        summary.weightQtlPart,
        summary.weightKgPart,
        summary.weightGmPart
      )}`
    );
    lines.push(`• *(+) Total Paddy Amount:* *${formatINR(summary.totalPaddyAmount)}*`);
  }

  // 2. J-Forms
  lines.push('─────────────────────');
  if (isPa) {
    lines.push(`*2. ਜੇ-ਫਾਰਮ ਵੇਰਵਾ (${summary.jForms.length} ਜੇ-ਫਾਰਮ):*`);
    if (mode === 'full' && summary.jForms.length > 0) {
      summary.jForms.forEach((j, i) => {
        const holder = displayMphText(j.jFormHolderName || j.farmerName, 'pa');
        const rel = trRelation(j.holderRelation || 'Self', lang);
        const noPart = j.jFormNo ? ` #${j.jFormNo}` : '';
        lines.push(
          `${i + 1}. ${formatDateDMY(j.date)}${noPart} | ${holder} (${rel}) | ${j.bags} ਬੈਗ @ ₹${j.rate} = *-${formatINR(j.jFormAmount)}*`
        );
      });
    }
    lines.push(
      `• *(-) ਕੁੱਲ ਜੇ-ਫਾਰਮ (${summary.totalJFormBags} ਬੈਗ):* -${formatINR(summary.totalJFormAmount)}`
    );
    lines.push(
      `• *(=) ਫਰਕ ਬਕਾਇਆ (ਝੋਨੇ ਦੀ ਰਕਮ − ਜੇ-ਫਾਰਮ):* *${summary.paddyVsJFormDiff < 0 ? '-' : ''}${formatINR(Math.abs(summary.paddyVsJFormDiff))}*`
    );
  } else {
    lines.push(`*2. J-Form Details (${summary.jForms.length} J-Forms):*`);
    if (mode === 'full' && summary.jForms.length > 0) {
      summary.jForms.forEach((j, i) => {
        const holder = j.jFormHolderName || j.farmerName;
        const rel = trRelation(j.holderRelation || 'Self', lang);
        const noPart = j.jFormNo ? ` #${j.jFormNo}` : '';
        lines.push(
          `${i + 1}. ${formatDateDMY(j.date)}${noPart} | ${holder} (${rel}) | ${j.bags} Bags @ ₹${j.rate} = *-${formatINR(j.jFormAmount)}*`
        );
      });
    }
    lines.push(
      `• *(-) Total J-Form (${summary.totalJFormBags} Bags):* -${formatINR(summary.totalJFormAmount)}`
    );
    lines.push(
      `• *(=) Difference Balance (Paddy − J-Form):* *${summary.paddyVsJFormDiff < 0 ? '-' : ''}${formatINR(Math.abs(summary.paddyVsJFormDiff))}*`
    );
  }

  // 3. Labour & Before-Paddy Other Entries (affecting Paddy Bakaya)
  const driedEntries = summary.arrivals.filter(
    (a) => a && a.applyDryingLabor !== false && Math.floor(safeNum(a.bags)) > 0
  );
  const beforePaddyEntries = summary.otherEntries.filter((o) => o.impactStage !== 'after_paddy');
  const afterPaddyEntries = summary.otherEntries.filter((o) => o.impactStage === 'after_paddy');

  const totalLabourCombined =
    Math.round((summary.totalJFormLabor + summary.totalDryingLabor) * 100) / 100;
  const beforeOtherNet =
    Math.round((summary.totalOtherAdditions - summary.totalOtherDeductions) * 100) / 100;
  const afterOtherNet =
    Math.round((summary.totalAfterPaddyAdditions - summary.totalAfterPaddyDeductions) * 100) / 100;

  lines.push('─────────────────────');
  if (isPa) {
    lines.push('*3. ਲੇਬਰ ਅਤੇ ਝੋਨੇ ਦੇ ਹਿਸਾਬ ਵਾਲੇ ਹੋਰ ਖਰਚੇ:*');
    lines.push(
      `• (-) ਜੇ-ਫਾਰਮ ਲੇਬਰ (${summary.totalArrivalBags} ਬੈਗ × ₹${safeSettings.jFormLaborRate}): -${formatINR(summary.totalJFormLabor)}`
    );
    lines.push(
      `• (-) ਝੋਨਾ ਸੁਕਾਈ ਲੇਬਰ (${formatDryingBreakdownText(
        summary.dryingRateBreakdown,
        'pa',
        summary.totalDryingBags,
        safeSettings.paddyDryingLaborRate
      )}): -${formatINR(summary.totalDryingLabor)}`
    );
    lines.push(
      `• *(-) ਕੁੱਲ ਲੇਬਰ (ਜੇ-ਫਾਰਮ + ਸੁਕਾਈ):* *-${formatINR(totalLabourCombined)}*`
    );
    if (mode === 'full' && driedEntries.length > 0) {
      driedEntries.forEach((a, i) => {
        const rate = getEffectiveArrivalDryingRate(a, f, safeSettings);
        const amt = Math.round(Math.floor(safeNum(a.bags)) * rate * 100) / 100;
        lines.push(
          `  ${i + 1}. ${formatDateDMY(a.date)} | ${a.bags} ਬੈਗ × ₹${rate} = -${formatINR(amt)}`
        );
      });
    }
    if (beforePaddyEntries.length > 0) {
      lines.push(`• *ਝੋਨਾ ਹਿਸਾਬ ਵਿੱਚ ਹੋਰ ਖਰਚੇ / ਅਦਾਇਗੀਆਂ (${beforePaddyEntries.length} ਐਂਟਰੀਆਂ):*`);
      if (mode === 'full') {
        beforePaddyEntries.forEach((o, i) => {
          const typeLabel =
            o.entryType === 'add' ? '(+) ਕਿਸਾਨ ਵੱਲੋਂ ਜਮ੍ਹਾਂ' : '(-) ਕਿਸਾਨ ਨੂੰ ਦਿੱਤੇ / ਖਰਚ';
          lines.push(
            `  ${i + 1}. ${formatDateDMY(o.date)} | ${displayMphText(o.description, 'pa')} [${typeLabel}]: *${o.entryType === 'add' ? '+' : '-'}${formatINR(o.amount)}*`
          );
        });
      }
      if (summary.totalOtherAdditions > 0) {
        lines.push(`  (+) ਕੁੱਲ ਜਮ੍ਹਾਂ: +${formatINR(summary.totalOtherAdditions)}`);
      }
      if (summary.totalOtherDeductions > 0) {
        lines.push(`  (-) ਕੁੱਲ ਕਟੌਤੀ / ਦਿੱਤੇ: -${formatINR(summary.totalOtherDeductions)}`);
      }
      lines.push(
        `• *(+/-) ਹੋਰ ਖਾਤਾ (ਝੋਨਾ ਹਿਸਾਬ):* ${beforeOtherNet >= 0 ? '+' : '-'}${formatINR(Math.abs(beforeOtherNet))}`
      );
    }
  } else {
    lines.push('*3. Labour & Before-Paddy Other Adjustments:*');
    lines.push(
      `• (-) J-Form Labour (${summary.totalArrivalBags} Bags × ₹${safeSettings.jFormLaborRate}): -${formatINR(summary.totalJFormLabor)}`
    );
    lines.push(
      `• (-) Paddy Drying Labour (${formatDryingBreakdownText(
        summary.dryingRateBreakdown,
        'en',
        summary.totalDryingBags,
        safeSettings.paddyDryingLaborRate
      )}): -${formatINR(summary.totalDryingLabor)}`
    );
    lines.push(
      `• *(-) Total Labour (J-Form + Drying):* *-${formatINR(totalLabourCombined)}*`
    );
    if (mode === 'full' && driedEntries.length > 0) {
      driedEntries.forEach((a, i) => {
        const rate = getEffectiveArrivalDryingRate(a, f, safeSettings);
        const amt = Math.round(Math.floor(safeNum(a.bags)) * rate * 100) / 100;
        lines.push(
          `  ${i + 1}. ${formatDateDMY(a.date)} | ${a.bags} Bags × ₹${rate} = -${formatINR(amt)}`
        );
      });
    }
    if (beforePaddyEntries.length > 0) {
      lines.push(`• *Other Entries in Paddy Hisab (${beforePaddyEntries.length} Entries):*`);
      if (mode === 'full') {
        beforePaddyEntries.forEach((o, i) => {
          const typeLabel = o.entryType === 'add' ? '(+) Received / Credit' : '(-) Paid / Expense';
          lines.push(
            `  ${i + 1}. ${formatDateDMY(o.date)} | ${o.description} [${typeLabel}]: *${o.entryType === 'add' ? '+' : '-'}${formatINR(o.amount)}*`
          );
        });
      }
      if (summary.totalOtherAdditions > 0) {
        lines.push(`  (+) Total Credit: +${formatINR(summary.totalOtherAdditions)}`);
      }
      if (summary.totalOtherDeductions > 0) {
        lines.push(`  (-) Total Paid / Expense: -${formatINR(summary.totalOtherDeductions)}`);
      }
      lines.push(
        `• *(+/-) Other Net (Paddy Hisab):* ${beforeOtherNet >= 0 ? '+' : '-'}${formatINR(Math.abs(beforeOtherNet))}`
      );
    }
  }

  // 4. Paddy Bakaya (Strictly Paddy Account)
  const paddyStatusPa =
    summary.balanceStatus === 'payable'
      ? 'ਕਿਸਾਨ ਨੂੰ ਪੈਸੇ ਦੇਣੇ ਹਨ'
      : summary.balanceStatus === 'receivable'
      ? 'ਕਿਸਾਨ ਤੋਂ ਪੈਸੇ ਲੈਣੇ ਹਨ'
      : 'ਹਿਸਾਬ ਬਰਾਬਰ';
  const paddyStatusEn =
    summary.balanceStatus === 'payable'
      ? 'Payable to Farmer'
      : summary.balanceStatus === 'receivable'
      ? 'Receivable from Farmer'
      : 'Settled';

  lines.push('─────────────────────');
  if (isPa) {
    lines.push(
      `💰 *ਝੋਨਾ ਬਕਾਇਆ — ਸਿਰਫ਼ ਝੋਨੇ ਦਾ ਹਿਸਾਬ (Round Off):* ${summary.finalBalance < 0 ? '-' : ''}${formatINR(
        Math.abs(summary.finalBalance),
        false
      )} (${paddyStatusPa})`
    );
    lines.push(`*ਸ਼ਬਦਾਂ ਵਿੱਚ:* ${formatRupeesInWords(summary.finalBalance, 'pa')}`);
  } else {
    lines.push(
      `💰 *Paddy Bakaya — Paddy Account Only (Round Off):* ${summary.finalBalance < 0 ? '-' : ''}${formatINR(
        Math.abs(summary.finalBalance),
        false
      )} (${paddyStatusEn})`
    );
    lines.push(`*In Words:* ${formatRupeesInWords(summary.finalBalance, 'en')}`);
  }

  // 5. Advances & Interest (if any)
  if (summary.advances.length > 0) {
    lines.push('─────────────────────');
    if (isPa) {
      lines.push(`*4. ਪੇਸ਼ਗੀ ਅਤੇ ਵਿਆਜ ਖਾਤਾ (${summary.advances.length} ਐਂਟਰੀਆਂ):*`);
      if (mode === 'full') {
        summary.advances.forEach((adv, i) => {
          const bd = getAdvanceBreakdown(adv);
          lines.push(
            `${i + 1}. ${displayMphText(adv.purpose, 'pa')} (${formatDateDMY(adv.startDate)} → ${formatDateDMY(adv.endDate)}, ${adv.days} ਦਿਨ / ${formatAdvanceMonthsDays(bd.months, bd.extraDays, 'pa')}) | ਮੂਲ: ${formatINR(adv.principalAmount)} @ ${adv.interestRateMonthly}% (ਮਹੀਨਾ: ${formatINR(bd.monthlyInterestAmount)} | 1 ਦਿਨ: ${formatINR(bd.perDayInterestAmount)}) + ਵਿਆਜ: ${formatINR(adv.interestAmount)} = *-${formatINR(adv.totalAmount)}*`
          );
        });
      }
      lines.push(`• (-) ਕੁੱਲ ਮੂਲ ਰਕਮ: -${formatINR(summary.totalAdvancePrincipal)}`);
      lines.push(`• (-) ਕੁੱਲ ਵਿਆਜ: -${formatINR(summary.totalAdvanceInterest)}`);
      lines.push(`• *(-) ਕੁੱਲ ਪੇਸ਼ਗੀ + ਵਿਆਜ:* *-${formatINR(summary.totalAdvanceWithInterest)}*`);
    } else {
      lines.push(`*4. Pre-Season Advances & Interest (${summary.advances.length} Entries):*`);
      if (mode === 'full') {
        summary.advances.forEach((adv, i) => {
          const bd = getAdvanceBreakdown(adv);
          lines.push(
            `${i + 1}. ${adv.purpose} (${formatDateDMY(adv.startDate)} → ${formatDateDMY(adv.endDate)}, ${adv.days}d / ${formatAdvanceMonthsDays(bd.months, bd.extraDays, 'en')}) | Principal: ${formatINR(adv.principalAmount)} @ ${adv.interestRateMonthly}% (Mo: ${formatINR(bd.monthlyInterestAmount)} | 1 Day: ${formatINR(bd.perDayInterestAmount)}) + Int: ${formatINR(adv.interestAmount)} = *-${formatINR(adv.totalAmount)}*`
          );
        });
      }
      lines.push(`• (-) Total Principal: -${formatINR(summary.totalAdvancePrincipal)}`);
      lines.push(`• (-) Total Interest: -${formatINR(summary.totalAdvanceInterest)}`);
      lines.push(`• *(-) Total Advance + Interest:* *-${formatINR(summary.totalAdvanceWithInterest)}*`);
    }
  }

  // 6. Post-Season / After-Paddy Payments & Receipts (no impact on Paddy Bakaya)
  if (afterPaddyEntries.length > 0) {
    lines.push('─────────────────────');
    const secNo = summary.advances.length > 0 ? '5' : '4';
    if (isPa) {
      lines.push(
        `*${secNo}. ਝੋਨੇ ਦੇ ਹਿਸਾਬ ਤੋਂ ਬਾਅਦ ਜਮ੍ਹਾਂ / ਅਦਾਇਗੀਆਂ (${afterPaddyEntries.length} ਐਂਟਰੀਆਂ):*`
      );
      if (mode === 'full') {
        afterPaddyEntries.forEach((o, i) => {
          const typeLabel =
            o.entryType === 'add' ? '(+) ਕਿਸਾਨ ਵੱਲੋਂ ਜਮ੍ਹਾਂ' : '(-) ਕਿਸਾਨ ਨੂੰ ਦਿੱਤੇ';
          lines.push(
            `  ${i + 1}. ${formatDateDMY(o.date)} | ${displayMphText(o.description, 'pa')} [${typeLabel}]: *${o.entryType === 'add' ? '+' : '-'}${formatINR(o.amount)}*`
          );
        });
      }
      if (summary.totalAfterPaddyAdditions > 0) {
        lines.push(`• (+) ਕੁੱਲ ਕਿਸਾਨ ਵੱਲੋਂ ਜਮ੍ਹਾਂ: +${formatINR(summary.totalAfterPaddyAdditions)}`);
      }
      if (summary.totalAfterPaddyDeductions > 0) {
        lines.push(`• (-) ਕੁੱਲ ਕਿਸਾਨ ਨੂੰ ਦਿੱਤੇ: -${formatINR(summary.totalAfterPaddyDeductions)}`);
      }
      lines.push(
        `• *(+/-) ਹਿਸਾਬ ਤੋਂ ਬਾਅਦ ਸ਼ੁੱਧ:* ${afterOtherNet >= 0 ? '+' : '-'}${formatINR(Math.abs(afterOtherNet))}`
      );
    } else {
      lines.push(
        `*${secNo}. Post-Season / After-Paddy Payments & Settlements (${afterPaddyEntries.length} Entries):*`
      );
      if (mode === 'full') {
        afterPaddyEntries.forEach((o, i) => {
          const typeLabel =
            o.entryType === 'add' ? '(+) Received from Farmer' : '(-) Paid to Farmer';
          lines.push(
            `  ${i + 1}. ${formatDateDMY(o.date)} | ${o.description} [${typeLabel}]: *${o.entryType === 'add' ? '+' : '-'}${formatINR(o.amount)}*`
          );
        });
      }
      if (summary.totalAfterPaddyAdditions > 0) {
        lines.push(
          `• (+) Total Received from Farmer: +${formatINR(summary.totalAfterPaddyAdditions)}`
        );
      }
      if (summary.totalAfterPaddyDeductions > 0) {
        lines.push(`• (-) Total Paid to Farmer: -${formatINR(summary.totalAfterPaddyDeductions)}`);
      }
      lines.push(
        `• *(+/-) After-Paddy Net:* ${afterOtherNet >= 0 ? '+' : '-'}${formatINR(Math.abs(afterOtherNet))}`
      );
    }
  }

  // 7. Quick Hisab Summary + Grand Final Balance + Respectful Closing Line
  lines.push('─────────────────────');
  const absFinal = formatINR(Math.abs(summary.combinedFinalBalance), false);

  if (isPa) {
    lines.push('📋 *ਪੂਰੇ ਹਿਸਾਬ ਦਾ ਸਾਰ (ਆਸਾਨ ਚੈੱਕ):*');
    lines.push(`• (+) ਕੁੱਲ ਝੋਨੇ ਦੀ ਰਕਮ: ${formatINR(summary.totalPaddyAmount)}`);
    lines.push(`• (-) ਕੁੱਲ ਜੇ-ਫਾਰਮ ਰਕਮ: -${formatINR(summary.totalJFormAmount)}`);
    lines.push(`• (-) ਕੁੱਲ ਲੇਬਰ (ਜੇ-ਫਾਰਮ + ਸੁਕਾਈ): -${formatINR(totalLabourCombined)}`);
    if (beforePaddyEntries.length > 0 || beforeOtherNet !== 0) {
      lines.push(
        `• (+/-) ਹੋਰ ਖਰਚੇ (ਝੋਨਾ ਹਿਸਾਬ): ${beforeOtherNet >= 0 ? '+' : '-'}${formatINR(Math.abs(beforeOtherNet))}`
      );
    }
    lines.push(
      `• *= ਝੋਨਾ ਬਕਾਇਆ:* ${summary.finalBalance < 0 ? '-' : ''}${formatINR(Math.abs(summary.finalBalance), false)}`
    );
    if (summary.advances.length > 0) {
      lines.push(`• (-) ਕੁੱਲ ਪੇਸ਼ਗੀ + ਵਿਆਜ: -${formatINR(summary.totalAdvanceWithInterest)}`);
    }
    if (afterPaddyEntries.length > 0 || afterOtherNet !== 0) {
      lines.push(
        `• (+/-) ਹਿਸਾਬ ਤੋਂ ਬਾਅਦ ਅਦਾਇਗੀਆਂ: ${afterOtherNet >= 0 ? '+' : '-'}${formatINR(Math.abs(afterOtherNet))}`
      );
    }
    lines.push('─────────────────────');
    const finalStatus =
      summary.combinedBalanceStatus === 'payable'
        ? 'ਕਿਸਾਨ ਨੂੰ ਪੈਸੇ ਦੇਣੇ ਹਨ (Payable)'
        : summary.combinedBalanceStatus === 'receivable'
        ? 'ਕਿਸਾਨ ਤੋਂ ਪੈਸੇ ਲੈਣੇ ਹਨ (Receivable)'
        : 'ਹਿਸਾਬ ਬਰਾਬਰ — ਕੋਈ ਬਕਾਇਆ ਨਹੀਂ (Settled)';
    lines.push(`👉 *ਅੰਤਿਮ ਕੁੱਲ ਬਕਾਇਆ: ${summary.combinedFinalBalance < 0 ? '-' : ''}${absFinal}*`);
    lines.push(`*ਸ਼ਬਦਾਂ ਵਿੱਚ:* ${formatRupeesInWords(summary.combinedFinalBalance, 'pa')}`);
    lines.push(`*ਸਥਿਤੀ:* ${finalStatus}`);
    lines.push('─────────────────────');
    if (summary.combinedBalanceStatus === 'settled') {
      lines.push(
        '🙏 *ਸੰਦੇਸ਼:* ਸਾਰਾ ਹਿਸਾਬ ਪੂਰੀ ਤਰ੍ਹਾਂ ਬਰਾਬਰ (₹0 ਬਕਾਇਆ) ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਉੱਪਰ ਦਿੱਤਾ ਪੂਰਾ ਵੇਰਵਾ ਚੈੱਕ ਕਰ ਲਓ ਜੀ। ਤੁਹਾਡੇ ਸਾਥ ਅਤੇ ਭਰੋਸੇ ਲਈ ਬਹੁਤ-ਬਹੁਤ ਧੰਨਵਾਦ! 🤝🌾'
      );
    } else if (summary.combinedBalanceStatus === 'payable') {
      lines.push(
        `🙏 *ਸੰਦੇਸ਼:* ਉੱਪਰ ਦਿੱਤੇ ਪੂਰੇ ਹਿਸਾਬ ਮੁਤਾਬਕ ਤੁਹਾਡਾ *${absFinal}* ਬਕਾਇਆ ਬਣਦਾ ਹੈ, ਜੋ ਤੁਹਾਨੂੰ ਅਦਾ ਕੀਤਾ ਜਾਣਾ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਸਾਰਾ ਹਿਸਾਬ ਚੈੱਕ ਕਰ ਲਓ ਜੀ — ਕਿਸੇ ਵੀ ਜਾਣਕਾਰੀ ਲਈ ਕਦੇ ਵੀ ਸੰਪਰਕ ਕਰੋ। ਧੰਨਵਾਦ! 🤝🌾`
      );
    } else {
      lines.push(
        `🙏 *ਸੰਦੇਸ਼:* ਉੱਪਰ ਦਿੱਤੇ ਪੂਰੇ ਹਿਸਾਬ ਮੁਤਾਬਕ *${absFinal}* ਬਕਾਇਆ ਰਕਮ ਤੁਹਾਡੇ ਵੱਲ ਨਿਕਲਦੀ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਸਾਰਾ ਵੇਰਵਾ ਧਿਆਨ ਨਾਲ ਚੈੱਕ ਕਰਕੇ ਬਕਾਇਆ ਜਮ੍ਹਾਂ ਕਰਵਾਉਣ ਦੀ ਖੇਚਲ ਕਰਨੀ ਜੀ। ਕਿਸੇ ਵੀ ਸਵਾਲ ਲਈ ਸੰਪਰਕ ਕਰੋ। ਧੰਨਵਾਦ! 🤝🌾`
      );
    }
  } else {
    lines.push('📋 *Hisab Summary (Quick Check):*');
    lines.push(`• (+) Total Paddy Amount: ${formatINR(summary.totalPaddyAmount)}`);
    lines.push(`• (-) Total J-Form Amount: -${formatINR(summary.totalJFormAmount)}`);
    lines.push(`• (-) Total Labour (J-Form + Drying): -${formatINR(totalLabourCombined)}`);
    if (beforePaddyEntries.length > 0 || beforeOtherNet !== 0) {
      lines.push(
        `• (+/-) Other Entries (Paddy Hisab): ${beforeOtherNet >= 0 ? '+' : '-'}${formatINR(Math.abs(beforeOtherNet))}`
      );
    }
    lines.push(
      `• *= Paddy Bakaya:* ${summary.finalBalance < 0 ? '-' : ''}${formatINR(Math.abs(summary.finalBalance), false)}`
    );
    if (summary.advances.length > 0) {
      lines.push(`• (-) Total Advance + Interest: -${formatINR(summary.totalAdvanceWithInterest)}`);
    }
    if (afterPaddyEntries.length > 0 || afterOtherNet !== 0) {
      lines.push(
        `• (+/-) After-Paddy Payments: ${afterOtherNet >= 0 ? '+' : '-'}${formatINR(Math.abs(afterOtherNet))}`
      );
    }
    lines.push('─────────────────────');
    const finalStatus =
      summary.combinedBalanceStatus === 'payable'
        ? 'Farmer Nu Paise Dene Hai (Payable)'
        : summary.combinedBalanceStatus === 'receivable'
        ? 'Farmer Paise Lene Hai (Receivable)'
        : 'Settled (No Balance Due)';
    lines.push(`👉 *Grand Final Balance: ${summary.combinedFinalBalance < 0 ? '-' : ''}${absFinal}*`);
    lines.push(`*In Words:* ${formatRupeesInWords(summary.combinedFinalBalance, 'en')}`);
    lines.push(`*Status:* ${finalStatus}`);
    lines.push('─────────────────────');
    if (summary.combinedBalanceStatus === 'settled') {
      lines.push(
        '🙏 *Note:* Complete account has been settled in full (₹0 balance due). Kindly review the full statement above. Thank you very much for your trust and cooperation! 🤝🌾'
      );
    } else if (summary.combinedBalanceStatus === 'payable') {
      lines.push(
        `🙏 *Note:* As per the complete statement above, a balance of *${absFinal}* is payable to you. Kindly verify all details above and feel free to reach out for any clarification. Thank you! 🤝🌾`
      );
    } else {
      lines.push(
        `🙏 *Note:* As per the complete statement above, a balance of *${absFinal}* is receivable from your side. Kindly review all details and arrange payment at your convenience. Contact us anytime for any query. Thank you! 🤝🌾`
      );
    }
  }

  return lines.join('\n');
}

export function buildFarmerPaymentReceiptWhatsAppText(
  summary: MphFarmerAccountSummary,
  _settings: MphSettings,
  lang: MphLang,
  entry?: MphOtherEntry | null
): string {
  if (!summary || !summary.farmer) return '';
  const isPa = lang === 'pa';
  const f = summary.farmer;
  const entries = Array.isArray(summary.otherEntries) ? summary.otherEntries : [];
  const afterEntries = entries.filter((o) => o.impactStage === 'after_paddy');
  const fallbackEntry =
    afterEntries.length > 0
      ? afterEntries[afterEntries.length - 1]
      : entries.length > 0
      ? entries[entries.length - 1]
      : null;
  const targetEntry = entry || fallbackEntry;

  const lines: string[] = [];
  const todayStr = formatDateDMY(new Date().toISOString().split('T')[0]);

  if (isPa) {
    const farmerPa = displayMphText(f.name, 'pa');
    lines.push(`🙏 *ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ${farmerPa} ਜੀ!*`);
    lines.push('🧾 *ਅਦਾਇਗੀ / ਵਸੂਲੀ ਰਸੀਦ (ਸਿਰਫ਼ ਐਂਟਰੀ ਅਤੇ ਬਕਾਇਆ)*');
    lines.push(`*ਤਾਰੀਖ:* ${targetEntry ? formatDateDMY(targetEntry.date) : todayStr}`);
    lines.push('─────────────────────');
    lines.push(`*ਕਿਸਾਨ:* ${farmerPa}`);
    if (f.fatherName) lines.push(`*ਪਿਤਾ ਦਾ ਨਾਮ:* ${displayMphText(f.fatherName, 'pa')}`);
    lines.push(`*ਪਿੰਡ:* ${displayMphText(f.village, 'pa')}`);
    if (f.mobile) lines.push(`*ਮੋਬਾਈਲ:* ${safeStr(f.mobile)}`);
  } else {
    lines.push(`🙏 *Sat Sri Akal ${f.name} Ji!*`);
    lines.push('🧾 *Payment / Receipt Slip (Single Entry & Closing Balance)*');
    lines.push(`*Date:* ${targetEntry ? formatDateDMY(targetEntry.date) : todayStr}`);
    lines.push('─────────────────────');
    lines.push(`*Farmer:* ${f.name}`);
    if (f.fatherName) lines.push(`*Father Name:* ${f.fatherName}`);
    lines.push(`*Village:* ${f.village}`);
    if (f.mobile) lines.push(`*Mobile:* ${f.mobile}`);
  }

  let closingBalance = summary.combinedFinalBalance;
  let prevBalance: number | null = null;
  let delta = 0;

  if (targetEntry) {
    const amt = Math.max(0, safeNum(targetEntry.amount));
    delta = targetEntry.entryType === 'add' ? amt : -amt;
    const isInSummary = entries.some((o) => o.id === targetEntry.id);
    const isLatestEntry = entries.length > 0 && entries[entries.length - 1].id === targetEntry.id;

    if (!isInSummary) {
      prevBalance = summary.combinedFinalBalance;
      closingBalance = Math.round(prevBalance + delta);
    } else if (isLatestEntry) {
      closingBalance = summary.combinedFinalBalance;
      prevBalance = Math.round(closingBalance - delta);
    }

    const hasPaise = amt % 1 !== 0;
    const formattedAmt = formatINR(amt, hasPaise);
    const signAmt = `${targetEntry.entryType === 'add' ? '+' : '-'}${formattedAmt}`;
    const wordsRounded = Math.round(amt);

    lines.push('─────────────────────');
    if (isPa) {
      const kindLabel =
        targetEntry.entryType === 'add'
          ? '(+) ਕਿਸਾਨ ਵੱਲੋਂ ਜਮ੍ਹਾਂ / ਵਸੂਲੀ'
          : '(-) ਕਿਸਾਨ ਨੂੰ ਅਦਾਇਗੀ / ਖਰਚ';
      lines.push('💵 *ਮੌਜੂਦਾ ਐਂਟਰੀ ਦਾ ਵੇਰਵਾ:*');
      lines.push(`• *ਤਾਰੀਖ:* ${formatDateDMY(targetEntry.date)}`);
      lines.push(`• *ਕਿਸਮ:* ${kindLabel}`);
      lines.push(`• *ਵੇਰਵਾ:* ${displayMphText(targetEntry.description, 'pa')}`);
      lines.push(`• *ਰਕਮ:* *${signAmt}*`);
      lines.push(`• *ਸ਼ਬਦਾਂ ਵਿੱਚ:* ${formatRupeesInWords(wordsRounded, 'pa')}`);
    } else {
      const kindLabel =
        targetEntry.entryType === 'add'
          ? '(+) Received from Farmer'
          : '(-) Paid to Farmer';
      lines.push('💵 *Payment / Receipt Entry Details:*');
      lines.push(`• *Date:* ${formatDateDMY(targetEntry.date)}`);
      lines.push(`• *Type:* ${kindLabel}`);
      lines.push(`• *Description:* ${targetEntry.description}`);
      lines.push(`• *Amount:* *${signAmt}*`);
      lines.push(`• *In Words:* ${formatRupeesInWords(wordsRounded, 'en')}`);
    }
  } else {
    lines.push('─────────────────────');
    lines.push(
      isPa
        ? 'ℹ️ *ਨੋਟ:* ਅਜੇ ਕੋਈ ਵੱਖਰੀ ਅਦਾਇਗੀ ਐਂਟਰੀ ਦਰਜ ਨਹੀਂ ਹੈ — ਹੇਠਾਂ ਮੌਜੂਦਾ ਬਕਾਇਆ ਦਰਜ ਹੈ।'
        : 'ℹ️ *Note:* No separate payment entry selected — current closing balance shown below.'
    );
  }

  lines.push('─────────────────────');
  const closingAbsStr = formatINR(Math.abs(closingBalance), false);
  const closingStatus: 'payable' | 'receivable' | 'settled' =
    closingBalance > 0 ? 'payable' : closingBalance < 0 ? 'receivable' : 'settled';

  if (isPa) {
    if (prevBalance !== null && targetEntry) {
      const prevAbsStr = formatINR(Math.abs(prevBalance), false);
      const amtHasPaise = Math.abs(delta) % 1 !== 0;
      const deltaStr = `${delta >= 0 ? '+' : '-'}${formatINR(Math.abs(delta), amtHasPaise)}`;
      lines.push(`• *ਪਿਛਲਾ ਬਕਾਇਆ:* ${prevBalance < 0 ? '-' : ''}${prevAbsStr}`);
      lines.push(`• *ਅੱਜ ਦੀ ਐਂਟਰੀ:* ${deltaStr}`);
    }
    const statusLabel =
      closingStatus === 'payable'
        ? 'ਕਿਸਾਨ ਨੂੰ ਪੈਸੇ ਦੇਣੇ ਹਨ (Payable)'
        : closingStatus === 'receivable'
        ? 'ਕਿਸਾਨ ਤੋਂ ਪੈਸੇ ਲੈਣੇ ਹਨ (Receivable)'
        : 'ਹਿਸਾਬ ਬਰਾਬਰ — ਕੋਈ ਬਕਾਇਆ ਨਹੀਂ (Settled)';
    lines.push(`👉 *ਕੁੱਲ ਬਕਾਇਆ (Closing Balance): ${closingBalance < 0 ? '-' : ''}${closingAbsStr}*`);
    lines.push(`*ਸ਼ਬਦਾਂ ਵਿੱਚ:* ${formatRupeesInWords(closingBalance, 'pa')}`);
    lines.push(`*ਸਥਿਤੀ:* ${statusLabel}`);
    lines.push('─────────────────────');
    if (closingStatus === 'settled') {
      lines.push(
        '🙏 *ਸੰਦੇਸ਼:* ਤੁਹਾਡੀ ਇਸ ਅਦਾਇਗੀ ਨਾਲ ਪੂਰਾ ਹਿਸਾਬ ਬਰਾਬਰ (₹0 ਬਕਾਇਆ) ਹੋ ਗਿਆ ਹੈ। ਤੁਹਾਡੇ ਸਾਥ ਅਤੇ ਭਰੋਸੇ ਲਈ ਬਹੁਤ-ਬਹੁਤ ਧੰਨਵਾਦ! 🤝🌾'
      );
    } else if (closingStatus === 'payable') {
      lines.push(
        `🙏 *ਸੰਦੇਸ਼:* ਇਸ ਐਂਟਰੀ ਤੋਂ ਬਾਅਦ ਤੁਹਾਡਾ *${closingAbsStr}* ਬਕਾਇਆ ਬਾਕੀ ਹੈ (ਜੋ ਤੁਹਾਨੂੰ ਅਦਾ ਕੀਤਾ ਜਾਣਾ ਹੈ)। ਕਿਰਪਾ ਕਰਕੇ ਵੇਰਵਾ ਚੈੱਕ ਕਰ ਲਓ ਜੀ। ਧੰਨਵਾਦ! 🤝🌾`
      );
    } else {
      lines.push(
        `🙏 *ਸੰਦੇਸ਼:* ਤੁਹਾਡੀ ਇਹ ਰਸੀਦ ਦਰਜ ਕਰ ਲਈ ਗਈ ਹੈ। ਇਸ ਐਂਟਰੀ ਤੋਂ ਬਾਅਦ *${closingAbsStr}* ਬਕਾਇਆ (Closing Balance) ਤੁਹਾਡੇ ਵੱਲ ਬਾਕੀ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਨੋਟ ਕਰ ਲਓ ਜੀ। ਧੰਨਵਾਦ! 🤝🌾`
      );
    }
  } else {
    if (prevBalance !== null && targetEntry) {
      const prevAbsStr = formatINR(Math.abs(prevBalance), false);
      const amtHasPaise = Math.abs(delta) % 1 !== 0;
      const deltaStr = `${delta >= 0 ? '+' : '-'}${formatINR(Math.abs(delta), amtHasPaise)}`;
      lines.push(`• *Previous Balance:* ${prevBalance < 0 ? '-' : ''}${prevAbsStr}`);
      lines.push(`• *This Entry:* ${deltaStr}`);
    }
    const statusLabel =
      closingStatus === 'payable'
        ? 'Payable to Farmer'
        : closingStatus === 'receivable'
        ? 'Receivable from Farmer'
        : 'Settled (No Balance Due)';
    lines.push(`👉 *Closing Balance: ${closingBalance < 0 ? '-' : ''}${closingAbsStr}*`);
    lines.push(`*In Words:* ${formatRupeesInWords(closingBalance, 'en')}`);
    lines.push(`*Status:* ${statusLabel}`);
    lines.push('─────────────────────');
    if (closingStatus === 'settled') {
      lines.push(
        '🙏 *Note:* With this entry, your account is now completely settled (₹0 balance due). Thank you very much for your trust and cooperation! 🤝🌾'
      );
    } else if (closingStatus === 'payable') {
      lines.push(
        `🙏 *Note:* After this entry, your remaining closing balance of *${closingAbsStr}* is payable to you. Kindly keep this slip for your record. Thank you! 🤝🌾`
      );
    } else {
      lines.push(
        `🙏 *Note:* Your payment entry has been recorded. After this entry, your closing balance due is *${closingAbsStr}*. Kindly keep this slip for your record. Thank you! 🤝🌾`
      );
    }
  }

  return lines.join('\n');
}

export async function exportOrShareStatementJpg(
  element: HTMLElement,
  summary: MphFarmerAccountSummary,
  lang: MphLang
): Promise<'shared' | 'downloaded'> {
  const dataUrl = await toJpeg(element, {
    quality: 0.96,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
  });

  const cleanName = (summary.farmer.name || 'Farmer').replace(/[^a-zA-Z0-9\u0A00-\u0A7F]+/g, '_');
  const fileName = `Mandi_Paddy_Hisab_${cleanName}_${new Date().toISOString().split('T')[0]}.jpg`;

  if (typeof navigator !== 'undefined' && 'canShare' in navigator) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      if (navigator.canShare({ files: [file] })) {
        const shareFarmerName =
          lang === 'pa' ? displayMphText(summary.farmer.name, 'pa') : summary.farmer.name;
        await navigator.share({
          title:
            lang === 'pa'
              ? `ਮੰਡੀ ਝੋਨਾ ਹਿਸਾਬ - ${shareFarmerName}`
              : `Mandi Paddy Hisab - ${summary.farmer.name}`,
          text:
            lang === 'pa'
              ? `🌾 ${shareFarmerName} ਦਾ ਪੂਰਾ ਝੋਨਾ ਹਿਸਾਬ`
              : `🌾 Complete Paddy Account Statement for ${summary.farmer.name}`,
          files: [file],
        });
        return 'shared';
      }
    } catch {
      // Fallback to direct JPG download if user cancels share sheet or share fails
    }
  }

  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return 'downloaded';
}
