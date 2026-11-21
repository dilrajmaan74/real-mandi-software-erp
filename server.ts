import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();
process.env.DISABLE_HMR = 'true';

const isProduction = process.env.NODE_ENV === 'production';

// Parse CLI flags like --port 3000 and --host 0.0.0.0
const cliArgs = process.argv.slice(2);
let cliPort: number | undefined;
let cliHost: string | undefined;

for (let i = 0; i < cliArgs.length; i++) {
  if (cliArgs[i] === '--port' && cliArgs[i + 1]) {
    cliPort = parseInt(cliArgs[i + 1], 10);
    i++;
  } else if (cliArgs[i] === '--host' && cliArgs[i + 1]) {
    cliHost = cliArgs[i + 1];
    i++;
  }
}

// Dev server must run on port 3000
const PORT = cliPort || (isProduction && process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);
const HOST = cliHost || '0.0.0.0';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  const apiKey = process.env.GEMINI_API_KEY || '';
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'KisanMitra ERP',
      hasApiKey: Boolean(apiKey),
      time: new Date().toISOString(),
    });
  });

  // API Route: Parse unstructured voice/text into structured Mandi JSON
  app.post('/api/parse-mandi', async (req, res) => {
    try {
      const { input_text, mandi_name, default_agent_name } = req.body;

      if (!input_text || typeof input_text !== 'string' || !input_text.trim()) {
        return res.status(400).json({ error: 'Please provide valid input text or speech transcript.' });
      }

      if (!apiKey) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY is not configured on the server. Please check your environment configuration.',
        });
      }

      const systemInstruction = `You are an expert AI software architect and automation engine for "KisanMitra ERP" — a comprehensive Mandi & Commission Agency (ਆੜ੍ਹਤ) management software used extensively across Punjab, India (Khanna, Moga, Barnala, Sangrur, Ludhiana, etc.).

Your job is to process unstructured or semi-structured voice/text inputs in Punjabi (Gurmukhi or Roman/Latin script like '400 gatte jhone de'), Hindi, or English regarding grain market operations (Paddy/ਝੋਨਾ, Maize/ਮੱਕੀ, Wheat/ਕਣਕ, Mustard/ਸਰ੍ਹੋਂ, Cotton/ਨਰਮਾ, Basmati, etc.) and convert them into precise, structured JSON data for Google Sheets and accounting ledgers.

Rules for field extraction & calculation:
1. Farmer Identification:
   - main_farmer_name: Account holder / farmer name
   - father_husband_name: Father or husband name
   - village: Village name (ਪਿੰਡ)
   - mobile_number: 10-digit Indian phone number if provided (or empty string)
   - billed_to_name: Specific family member, son, brother, or joint partner name under whom the J-Form / Auction is generated. If not specifically mentioned, default to main_farmer_name.
2. Crop & Inward (ਆਵਕ):
   - crop_type: Standardized to 'Paddy' (ਝੋਨਾ), 'Maize' (ਮੱਕੀ), 'Wheat' (ਕਣਕ), 'Mustard' (ਸਰ੍ਹੋਂ), 'Cotton' (ਨਰਮਾ), 'Basmati' (ਬਾਸਮਤੀ), or similar.
   - crop_variety: Variety if stated (e.g., PR-126, Pusa 44, HD-3086, PBW-550, 1121, etc.).
   - total_bags: Integer count of bags/badiyan/gatte (ਗੱਟੇ / ਬੋਰੀਆਂ).
   - bag_packing_kg: Packing weight in kg per bag. Note: In Punjab, Paddy (ਝੋਨਾ) standard is 37.5 kg per bag. Wheat (ਕਣਕ) is 50 kg per bag. Default accordingly.
   - weight_quintals: Total weight in quintals (ਕੁਇੰਟਲ). If bags are given and weight is not explicit, calculate: (total_bags * bag_packing_kg) / 100.
   - rate_per_quintal: Price per quintal (₹ / Qtl).
   - total_amount: Computed strictly as (weight_quintals * rate_per_quintal), rounded to 2 decimal places.
3. Bardana Management (ਬਾਰਦਾਨਾ):
   - bardana_received_from_agency: Bags received from agency/government.
   - bardana_issued_to_farmer: Bags given to farmer for packaging.
   - bardana_balance: (bardana_received_from_agency - bardana_issued_to_farmer) or remaining stock.
   - bardana_type: 'Jute Bags (ਸਣ/ਪੁਰਾਣਾ)', 'Plastic HDPE', or 'New Markfed/Pungrain Gunny'.
4. Procurement & Agency Details:
   - seller_name: Commission agent / arhtia shop name (use provided default "${default_agent_name || 'M/s Kisan Mitra Commission Agents'}" if not stated).
   - purchasing_agency: e.g. Pungrain, Markfed, Punsup, FCI, Punjab State Warehousing Corporation (PSWC), Punjab Agro, or Private Miller.
   - auction_date: ISO date (YYYY-MM-DD), default to current date if not specified.
   - gate_pass_number: Extracted if provided, else generate format GP-${new Date().getFullYear()}-XXXX.
5. Lifting & Dispatch Report (ਲਿਫਟਿੰਗ):
   - lifted_bags: Number of bags lifted/loaded onto trucks.
   - lifting_date: Date/time of dispatch.
   - pending_lifting_bags: Strictly calculated as (total_bags - lifted_bags), minimum 0.
   - transporter_truck_no: Vehicle number (e.g. PB-10-XX-XXXX) if provided.
   - lifting_status: 'Fully Lifted' (if pending == 0), 'Partially Lifted' (if lifted > 0 && pending > 0), or 'Pending' (if lifted == 0).
6. Labor & Palledari Calculation (ਮਜ਼ਦੂਰੀ ਤੇ ਪੱਲੇਦਾਰੀ):
   - total_laborers_engaged: Number of laborers/palledars.
   - palledari_rate_per_bag: Charges per bag (filling, stitching, weighing, loading - typically ₹10 to ₹18 per bag). If not stated, assume standard ₹14.00.
   - total_palledari_expense: Strictly calculated as (total_bags * palledari_rate_per_bag).
   - borne_by: 'agency' for government procurement (MSP), or 'farmer' if deducted from farmer's sale.
7. Ledger Balance & Financial Accounting (VERY CRITICAL PUNJAB ARHTIA ACCOUNTING RULE):
   - In Mandi Vahi Khata, "Purana Khata / Udhar / Baki" (ਪੁਰਾਣਾ ਬਕਾਇਆ / ਉਧਾਰ) almost always means DEBIT (ਨਾਵੇਂ - Farmer owes Arhtia).
   - balance_type: 'debit' (farmer owes Arhtia, money MUST be SUBTRACTED from farmer payout) or 'credit' (farmer has deposit, ADDED). Default to 'debit' for old udhar/khata.
   - previous_balance: Amount of old debt or deposit.
   - advance_paid: Cash or kind advance (ਪੇਸ਼ਗੀ) given to farmer. (MUST BE SUBTRACTED).
   - palledari_deducted: Boolean (false by default for government MSP where agency pays labor).
   - net_payable_balance: FINAL NET TO PAY FARMER = Crop Total - Advance Paid - (if debit: Previous Balance, else: -Previous Balance) - (if palledari_deducted: Palledari Expense, else 0).
   - payment_mode: Cash, Bank Transfer, NEFT/RTGS, or Cheque.
8. Summaries:
   - summary_punjabi: Authentic Mandi summary written in clean Gurmukhi Punjabi.
   - summary_english: Professional accounting summary in English.

Always output valid JSON conforming strictly to the requested schema.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Parse this Mandi transaction entry for Mandi yard: "${mandi_name || 'Punjab Grain Market'}":\n\n${input_text}`,
              },
            ],
          },
        ],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              master_record: {
                type: Type.OBJECT,
                properties: {
                  main_farmer_name: { type: Type.STRING },
                  father_husband_name: { type: Type.STRING },
                  village: { type: Type.STRING },
                  mobile_number: { type: Type.STRING },
                  billed_to_name: { type: Type.STRING },
                },
                required: ['main_farmer_name', 'village'],
              },
              crop_inward: {
                type: Type.OBJECT,
                properties: {
                  crop_type: { type: Type.STRING },
                  crop_variety: { type: Type.STRING },
                  total_bags: { type: Type.NUMBER },
                  bag_packing_kg: { type: Type.NUMBER },
                  weight_quintals: { type: Type.NUMBER },
                  rate_per_quintal: { type: Type.NUMBER },
                  total_amount: { type: Type.NUMBER },
                },
                required: ['crop_type', 'total_bags', 'weight_quintals', 'rate_per_quintal', 'total_amount'],
              },
              bardana_tracking: {
                type: Type.OBJECT,
                properties: {
                  bardana_received_from_agency: { type: Type.NUMBER },
                  bardana_issued_to_farmer: { type: Type.NUMBER },
                  bardana_balance: { type: Type.NUMBER },
                  bardana_type: { type: Type.STRING },
                },
                required: ['bardana_received_from_agency', 'bardana_issued_to_farmer', 'bardana_balance'],
              },
              procurement_agency: {
                type: Type.OBJECT,
                properties: {
                  seller_name: { type: Type.STRING },
                  purchasing_agency: { type: Type.STRING },
                  auction_date: { type: Type.STRING },
                  gate_pass_number: { type: Type.STRING },
                },
                required: ['seller_name', 'purchasing_agency', 'auction_date'],
              },
              lifting_dispatch: {
                type: Type.OBJECT,
                properties: {
                  lifted_bags: { type: Type.NUMBER },
                  lifting_date: { type: Type.STRING },
                  pending_lifting_bags: { type: Type.NUMBER },
                  transporter_truck_no: { type: Type.STRING },
                  lifting_status: { type: Type.STRING },
                },
                required: ['lifted_bags', 'pending_lifting_bags', 'lifting_status'],
              },
              labor_palledari: {
                type: Type.OBJECT,
                properties: {
                  total_laborers_engaged: { type: Type.NUMBER },
                  palledari_rate_per_bag: { type: Type.NUMBER },
                  total_palledari_expense: { type: Type.NUMBER },
                  borne_by: { type: Type.STRING },
                },
                required: ['palledari_rate_per_bag', 'total_palledari_expense'],
              },
              financial_ledger: {
                type: Type.OBJECT,
                properties: {
                  previous_balance: { type: Type.NUMBER },
                  balance_type: { type: Type.STRING },
                  advance_paid: { type: Type.NUMBER },
                  palledari_deducted: { type: Type.BOOLEAN },
                  net_payable_balance: { type: Type.NUMBER },
                  payment_mode: { type: Type.STRING },
                },
                required: ['previous_balance', 'balance_type', 'advance_paid', 'net_payable_balance'],
              },
              summary_punjabi: { type: Type.STRING },
              summary_english: { type: Type.STRING },
            },
            required: [
              'master_record',
              'crop_inward',
              'bardana_tracking',
              'procurement_agency',
              'lifting_dispatch',
              'labor_palledari',
              'financial_ledger',
              'summary_punjabi',
              'summary_english',
            ],
          },
        },
      });

      const rawText = response.text || '{}';
      const parsedData = JSON.parse(rawText);

      // Perform server-side validation and mathematical verification
      const crop = parsedData.crop_inward;
      if (!crop.bag_packing_kg) {
        crop.bag_packing_kg = crop.crop_type?.toLowerCase().includes('paddy') || crop.crop_type?.includes('ਝੋਨਾ') ? 37.5 : 50;
      }
      if (!crop.weight_quintals && crop.total_bags) {
        crop.weight_quintals = Number(((crop.total_bags * crop.bag_packing_kg) / 100).toFixed(2));
      }
      if (crop.weight_quintals && crop.rate_per_quintal) {
        crop.total_amount = Number((crop.weight_quintals * crop.rate_per_quintal).toFixed(2));
      }

      const lifting = parsedData.lifting_dispatch;
      lifting.pending_lifting_bags = Math.max(0, (crop.total_bags || 0) - (lifting.lifted_bags || 0));
      if (lifting.pending_lifting_bags === 0 && (crop.total_bags || 0) > 0) {
        lifting.lifting_status = 'Fully Lifted';
      } else if ((lifting.lifted_bags || 0) > 0) {
        lifting.lifting_status = 'Partially Lifted';
      } else {
        lifting.lifting_status = 'Pending';
      }

      const labor = parsedData.labor_palledari;
      labor.total_palledari_expense = Number(((crop.total_bags || 0) * (labor.palledari_rate_per_bag || 14)).toFixed(2));
      if (!labor.borne_by) labor.borne_by = 'agency';

      // CORRECT ARHTIA ACCOUNTING FORMULA:
      const fin = parsedData.financial_ledger;
      if (!fin.balance_type) fin.balance_type = 'debit';
      const isDebit = fin.balance_type === 'debit';
      const oldBalAdjustment = isDebit ? -(fin.previous_balance || 0) : (fin.previous_balance || 0);
      const palledariDeduction = fin.palledari_deducted ? (labor.total_palledari_expense || 0) : 0;

      fin.net_payable_balance = Number(
        (crop.total_amount - (fin.advance_paid || 0) + oldBalAdjustment - palledariDeduction).toFixed(2)
      );

      const bardana = parsedData.bardana_tracking;
      bardana.bardana_balance = (bardana.bardana_received_from_agency || 0) - (bardana.bardana_issued_to_farmer || 0);

      // Add a unique entry ID and timestamp
      const timestamp = new Date().toISOString();
      const entryId = `KM-${Date.now().toString().slice(-6)}`;

      return res.json({
        id: entryId,
        created_at: timestamp,
        ...parsedData,
      });
    } catch (err: any) {
      console.error('Error in /api/parse-mandi:', err);
      return res.status(500).json({
        error: err.message || 'Failed to process Mandi transaction. Please try again.',
      });
    }
  });

  // API Route: Extract Punjab Anaaj Kharid / e-Mandikaran J-Form PDFs or Images into structured J-Form entries
  app.post('/api/mph/parse-jform', async (req, res) => {
    try {
      const { files, defaultRate } = req.body || {};

      if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'Please upload at least one J-Form PDF or image file.' });
      }

      if (!apiKey) {
        return res.status(500).json({
          error:
            'GEMINI_API_KEY is not configured on the server. Please configure your API key in Settings > Secrets.',
        });
      }

      const allowedMimes = new Set([
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
      ]);

      const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [];
      for (const f of files) {
        const mimeType = String(f?.mimeType || '').toLowerCase();
        const dataBase64 = String(f?.dataBase64 || '').trim();
        const fileName = String(f?.name || 'jform');
        if (!allowedMimes.has(mimeType) || !dataBase64) {
          return res.status(400).json({
            error: `Unsupported or empty file "${fileName}". Supported formats: PDF, JPG, PNG, WEBP.`,
          });
        }
        parts.push({
          text: `Document File: "${fileName}"`,
        });
        parts.push({
          inlineData: {
            mimeType: mimeType === 'image/jpg' ? 'image/jpeg' : mimeType,
            data: dataBase64,
          },
        });
      }

      const fallbackRate = Number(defaultRate) > 0 ? Number(defaultRate) : 2461;
      parts.push({
        text: `Extract ALL J-Forms (Form-J) from the uploaded Anaaj Kharid / Punjab Mandi Board documents above. Return a JSON object with an "entries" array.`,
      });

      const systemInstruction = `You are a specialist document parser for Punjab Mandi Board / Anaaj Kharid (anaajkharid.in) / e-Mandikaran J-Forms (Form-J) in India.
Documents may be in English, Punjabi (Gurmukhi), or bilingual, and may contain 1 or multiple J-Forms across pages.

Extraction rules for EVERY J-Form found:
1. jFormNo: The official J-Form / Form-J / Serial / Book number (string, trim whitespace; empty string if missing).
2. date: The auction / J-Form / issue date formatted strictly as YYYY-MM-DD (convert DD/MM/YYYY or DD-MM-YYYY accurately). If unclear, leave empty string.
3. farmerName: The Farmer / Seller name printed on the J-Form (exclude prefixes like S/o, W/o, D/o, Sh., S., Smt. and keep the clean person name).
4. fatherName: Father's or Husband's name if printed after S/o, W/o, D/o, ਪੁੱਤਰ, ਪਤਨੀ (empty string if not present).
5. village: Farmer's village / address if printed (empty string if not present).
6. bags: Integer number of bags / units / bori / gatte (0 if not explicitly printed).
7. weightQtl: Total net produce weight in Quintals as a decimal number (if printed in KG such as 3750 KG, divide by 100 to return 37.5). Return 0 if missing.
8. rate: Rate per quintal in INR (₹) as a number. If not printed, use 0.
9. jFormAmount: The net / gross crop value / payable amount printed on the J-Form in INR (₹) as a number (do NOT subtract external advances — extract the J-Form produce total/net amount). If missing but weightQtl > 0 and rate > 0, compute weightQtl * rate rounded to 2 decimals.
10. agency: Buyer / Purchasing agency name (e.g., Pungrain, Markfed, Punsup, PSWC, FCI, Punjab Agro, Private) if shown.
11. crop: Crop / variety name (e.g., Paddy, Grade A, PR-126, Basmati) if shown.
12. notes: Short single-line note combining agency & crop if available, e.g. "Pungrain · Paddy Grade A".

If a PDF contains multiple J-Forms across pages or tables, extract EVERY SINGLE ONE as a separate item in "entries". Do not invent entries that are not in the document.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              entries: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sourceFileName: { type: Type.STRING },
                    jFormNo: { type: Type.STRING },
                    date: { type: Type.STRING },
                    farmerName: { type: Type.STRING },
                    fatherName: { type: Type.STRING },
                    village: { type: Type.STRING },
                    bags: { type: Type.NUMBER },
                    weightQtl: { type: Type.NUMBER },
                    rate: { type: Type.NUMBER },
                    jFormAmount: { type: Type.NUMBER },
                    agency: { type: Type.STRING },
                    crop: { type: Type.STRING },
                    notes: { type: Type.STRING },
                  },
                  required: ['farmerName', 'bags', 'rate', 'jFormAmount'],
                },
              },
            },
            required: ['entries'],
          },
        },
      });

      const rawText = (response.text ?? '{"entries":[]}').trim();
      const parsed = JSON.parse(rawText);
      const rawEntries = Array.isArray(parsed?.entries) ? parsed.entries : [];

      const todayIso = new Date().toISOString().split('T')[0];
      const normalizedEntries = rawEntries
        .filter((e: any) => e && (String(e.farmerName || '').trim() || Number(e.jFormAmount) > 0 || Number(e.bags) > 0))
        .map((e: any) => {
          const weightQtl = Math.max(0, Number(e.weightQtl) || 0);
          let bags = Math.max(0, Math.round(Number(e.bags) || 0));
          if (bags === 0 && weightQtl > 0) {
            bags = Math.round(weightQtl / 0.375);
          }
          let rate = Math.max(0, Number(e.rate) || 0);
          let amount = Math.max(0, Number(e.jFormAmount) || 0);
          if (rate === 0 && amount > 0 && weightQtl > 0) {
            rate = Math.round((amount / weightQtl) * 100) / 100;
          } else if (rate === 0 && amount > 0 && bags > 0) {
            rate = Math.round((amount / (bags * 0.375)) * 100) / 100;
          } else if (rate === 0) {
            rate = fallbackRate;
          }
          if (amount === 0 && weightQtl > 0 && rate > 0) {
            amount = Math.round(weightQtl * rate * 100) / 100;
          } else if (amount === 0 && bags > 0 && rate > 0) {
            amount = Math.round(bags * 0.375 * rate * 100) / 100;
          }

          let cleanDate = String(e.date || '').trim();
          const dmyMatch = cleanDate.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
          if (dmyMatch) {
            cleanDate = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
          } else if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
            cleanDate = todayIso;
          }

          const agency = String(e.agency || '').trim();
          const crop = String(e.crop || '').trim();
          const noteParts = [agency, crop].filter(Boolean);
          const notes = String(e.notes || '').trim() || noteParts.join(' · ') || 'Anaaj Kharid Import';

          return {
            sourceFileName: String(e.sourceFileName || files[0]?.name || 'J-Form'),
            jFormNo: String(e.jFormNo || '').trim(),
            date: cleanDate,
            farmerName: String(e.farmerName || '').trim(),
            fatherName: String(e.fatherName || '').trim(),
            village: String(e.village || '').trim(),
            bags,
            weightQtl: Math.round(weightQtl * 1000) / 1000,
            rate: Math.round(rate * 100) / 100,
            jFormAmount: Math.round(amount * 100) / 100,
            agency,
            crop,
            notes,
          };
        });

      return res.json({ entries: normalizedEntries });
    } catch (err: any) {
      console.error('Error in /api/mph/parse-jform:', err);
      const status = Number(err?.status) || 500;
      const msg = String(err?.message || '');
      if (status === 403 || status === 400 || msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED')) {
        return res.status(400).json({
          error:
            'Gemini API key error while reading J-Form PDF/Image. Please check your key in Settings > Secrets, or upload Excel/CSV format directly.',
        });
      }
      if (status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
        return res.status(429).json({
          error: 'AI quota limit reached temporarily. Please try again shortly or upload Excel/CSV format.',
        });
      }
      return res.status(500).json({
        error: err?.message || 'Failed to read J-Form document. Please verify the file and try again.',
      });
    }
  });

  // Start Vite in dev mode or serve static files in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`Punjabi Mandi Software server is running on http://${HOST}:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error('Server error:', err);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
