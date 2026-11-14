import { toJpeg } from 'html-to-image';
import { MphFarmerAccountSummary, MphSettings } from '../types/mandiPaddyHisab';
import { MphLang } from './mandiPaddyHisabI18n';
import {
  formatDateDMY,
  formatINR,
  formatLooseKgGm,
  formatWeightQKG,
} from './mandiPaddyHisabUtils';

export type MphWhatsappMessageMode = 'full' | 'summary';

function trPaddyType(type: string, lang: MphLang): string {
  if (lang === 'pa') {
    if (type === 'Hybrid Paddy') return 'ਹਾਈਬ੍ਰਿਡ ਝੋਨਾ';
    if (type === 'Paddy A Gurde') return 'ਝੋਨਾ ਏ ਗ੍ਰੇਡ';
  }
  return type;
}

function trRelation(rel: string, lang: MphLang): string {
  if (lang !== 'pa') return rel;
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
      return rel;
  }
}

export function normalizeWhatsAppPhone(phone?: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length >= 11) return digits;
  return '';
}

export function buildWhatsAppUrl(phone: string, text: string): string {
  const normalized = normalizeWhatsAppPhone(phone);
  const encoded = encodeURIComponent(text);
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
  const isPa = lang === 'pa';
  const todayStr = formatDateDMY(new Date().toISOString().split('T')[0]);
  const f = summary.farmer;
  const lines: string[] = [];

  // Header
  if (isPa) {
    lines.push('🌾 *ਮੰਡੀ ਝੋਨਾ ਹਿਸਾਬ — ਪੂਰਾ ਖਾਤਾ ਸਟੇਟਮੈਂਟ*');
    lines.push(`*ਤਾਰੀਖ:* ${todayStr}`);
    lines.push('─────────────────────');
    lines.push(`*ਕਿਸਾਨ:* ${f.name}`);
    if (f.fatherName) lines.push(`*ਪਿਤਾ ਦਾ ਨਾਮ:* ${f.fatherName}`);
    lines.push(`*ਪਿੰਡ:* ${f.village}`);
    if (f.mobile) lines.push(`*ਮੋਬਾਈਲ:* ${f.mobile}`);
  } else {
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
            ? ` (+${formatLooseKgGm(a.looseKg, a.looseGm)})`
            : '';
        lines.push(
          `${i + 1}. ${formatDateDMY(a.date)} | ${trPaddyType(a.paddyType, lang)} | ${a.bags} ਗੱਟੇ${looseText} | ${formatWeightQKG(a.weightQtlPart, a.weightKgPart, a.weightGmPart)} @ ₹${a.ratePerQuintal} = *${formatINR(a.paddyAmount)}*`
        );
      });
    }
    lines.push(
      `• *ਕੁੱਲ ਗੱਟੇ:* ${summary.totalArrivalBags} | *ਕੁੱਲ ਵਜ਼ਨ:* ${formatWeightQKG(
        summary.weightQtlPart,
        summary.weightKgPart,
        summary.weightGmPart
      )}`
    );
    lines.push(`• *ਕੁੱਲ ਝੋਨੇ ਦੀ ਰਕਮ:* *${formatINR(summary.totalPaddyAmount)}*`);
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
    lines.push(`• *Total Paddy Amount:* *${formatINR(summary.totalPaddyAmount)}*`);
  }

  // 2. J-Forms
  lines.push('─────────────────────');
  if (isPa) {
    lines.push(`*2. ਜੇ-ਫਾਰਮ ਵੇਰਵਾ (${summary.jForms.length} ਜੇ-ਫਾਰਮ):*`);
    if (mode === 'full' && summary.jForms.length > 0) {
      summary.jForms.forEach((j, i) => {
        const holder = j.jFormHolderName || j.farmerName;
        const rel = trRelation(j.holderRelation || 'Self', lang);
        const noPart = j.jFormNo ? ` #${j.jFormNo}` : '';
        lines.push(
          `${i + 1}. ${formatDateDMY(j.date)}${noPart} | ${holder} (${rel}) | ${j.bags} ਗੱਟੇ @ ₹${j.rate} = *-${formatINR(j.jFormAmount)}*`
        );
      });
    }
    lines.push(
      `• *(-) ਕੁੱਲ ਜੇ-ਫਾਰਮ (${summary.totalJFormBags} ਗੱਟੇ):* -${formatINR(summary.totalJFormAmount)}`
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
  }

  // 3. Labour & Other Entries
  lines.push('─────────────────────');
  if (isPa) {
    lines.push('*3. ਲੇਬਰ ਅਤੇ ਹੋਰ ਖਰਚੇ:*');
    lines.push(
      `• (-) ਜੇ-ਫਾਰਮ ਲੇਬਰ (${summary.totalArrivalBags} ਗੱਟੇ × ₹${settings.jFormLaborRate}): -${formatINR(summary.totalJFormLabor)}`
    );
    lines.push(
      `• (-) ਝੋਨਾ ਸੁਕਾਈ ਲੇਬਰ (${summary.totalDryingBags} ਗੱਟੇ × ₹${settings.paddyDryingLaborRate}): -${formatINR(summary.totalDryingLabor)}`
    );
    if (mode === 'full' && summary.otherEntries.length > 0) {
      summary.otherEntries.forEach((o, i) => {
        lines.push(
          `  ${i + 1}. ${formatDateDMY(o.date)} | ${o.description}: ${o.entryType === 'add' ? '+' : '-'}${formatINR(o.amount)}`
        );
      });
    }
    const otherNet = summary.totalOtherAdditions - summary.totalOtherDeductions;
    if (summary.otherEntries.length > 0 || otherNet !== 0) {
      lines.push(
        `• (+/-) ਹੋਰ ਖਾਤਾ ਕੁੱਲ: ${otherNet >= 0 ? '+' : '-'}${formatINR(Math.abs(otherNet))}`
      );
    }
  } else {
    lines.push('*3. Labour & Other Adjustments:*');
    lines.push(
      `• (-) J-Form Labour (${summary.totalArrivalBags} Bags × ₹${settings.jFormLaborRate}): -${formatINR(summary.totalJFormLabor)}`
    );
    lines.push(
      `• (-) Paddy Drying Labour (${summary.totalDryingBags} Bags × ₹${settings.paddyDryingLaborRate}): -${formatINR(summary.totalDryingLabor)}`
    );
    if (mode === 'full' && summary.otherEntries.length > 0) {
      summary.otherEntries.forEach((o, i) => {
        lines.push(
          `  ${i + 1}. ${formatDateDMY(o.date)} | ${o.description}: ${o.entryType === 'add' ? '+' : '-'}${formatINR(o.amount)}`
        );
      });
    }
    const otherNet = summary.totalOtherAdditions - summary.totalOtherDeductions;
    if (summary.otherEntries.length > 0 || otherNet !== 0) {
      lines.push(
        `• (+/-) Other Net: ${otherNet >= 0 ? '+' : '-'}${formatINR(Math.abs(otherNet))}`
      );
    }
  }

  // 4. Paddy Bakaya
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
      `💰 *ਝੋਨਾ ਬਕਾਇਆ (Round Off):* ${summary.finalBalance < 0 ? '-' : ''}${formatINR(
        Math.abs(summary.finalBalance),
        false
      )} (${paddyStatusPa})`
    );
  } else {
    lines.push(
      `💰 *Paddy Bakaya (Round Off):* ${summary.finalBalance < 0 ? '-' : ''}${formatINR(
        Math.abs(summary.finalBalance),
        false
      )} (${paddyStatusEn})`
    );
  }

  // 5. Advances & Interest (if any)
  if (summary.advances.length > 0) {
    lines.push('─────────────────────');
    if (isPa) {
      lines.push(`*4. ਪੇਸ਼ਗੀ ਅਤੇ ਵਿਆਜ ਖਾਤਾ (${summary.advances.length} ਐਂਟਰੀਆਂ):*`);
      if (mode === 'full') {
        summary.advances.forEach((adv, i) => {
          lines.push(
            `${i + 1}. ${adv.purpose} (${formatDateDMY(adv.startDate)} → ${formatDateDMY(adv.endDate)}, ${adv.days} ਦਿਨ) | ਮੂਲ: ${formatINR(adv.principalAmount)} @ ${adv.interestRateMonthly}% + ਵਿਆਜ: ${formatINR(adv.interestAmount)} = *-${formatINR(adv.totalAmount)}*`
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
          lines.push(
            `${i + 1}. ${adv.purpose} (${formatDateDMY(adv.startDate)} → ${formatDateDMY(adv.endDate)}, ${adv.days}d) | Principal: ${formatINR(adv.principalAmount)} @ ${adv.interestRateMonthly}% + Int: ${formatINR(adv.interestAmount)} = *-${formatINR(adv.totalAmount)}*`
          );
        });
      }
      lines.push(`• (-) Total Principal: -${formatINR(summary.totalAdvancePrincipal)}`);
      lines.push(`• (-) Total Interest: -${formatINR(summary.totalAdvanceInterest)}`);
      lines.push(`• *(-) Total Advance + Interest:* *-${formatINR(summary.totalAdvanceWithInterest)}*`);
    }
  }

  // 6. Grand Final Balance
  lines.push('─────────────────────');
  if (isPa) {
    const finalStatus =
      summary.combinedBalanceStatus === 'payable'
        ? 'ਕਿਸਾਨ ਨੂੰ ਪੈਸੇ ਦੇਣੇ ਹਨ (Payable)'
        : summary.combinedBalanceStatus === 'receivable'
        ? 'ਕਿਸਾਨ ਤੋਂ ਪੈਸੇ ਲੈਣੇ ਹਨ (Receivable)'
        : 'ਹਿਸਾਬ ਬਰਾਬਰ — ਕੋਈ ਬਕਾਇਆ ਨਹੀਂ';
    lines.push(
      `👉 *ਅੰਤਿਮ ਕੁੱਲ ਬਕਾਇਆ: ${formatINR(Math.abs(summary.combinedFinalBalance), false)}*`
    );
    lines.push(`*ਸਥਿਤੀ:* ${finalStatus}`);
  } else {
    const finalStatus =
      summary.combinedBalanceStatus === 'payable'
        ? 'Farmer Nu Paise Dene Hai (Payable)'
        : summary.combinedBalanceStatus === 'receivable'
        ? 'Farmer Paise Lene Hai (Receivable)'
        : 'Settled (No Balance Due)';
    lines.push(
      `👉 *Grand Final Balance: ${formatINR(Math.abs(summary.combinedFinalBalance), false)}*`
    );
    lines.push(`*Status:* ${finalStatus}`);
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
        await navigator.share({
          title:
            lang === 'pa'
              ? `ਮੰਡੀ ਝੋਨਾ ਹਿਸਾਬ - ${summary.farmer.name}`
              : `Mandi Paddy Hisab - ${summary.farmer.name}`,
          text:
            lang === 'pa'
              ? `🌾 ${summary.farmer.name} ਦਾ ਪੂਰਾ ਝੋਨਾ ਹਿਸਾਬ`
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
