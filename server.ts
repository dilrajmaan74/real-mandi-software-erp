import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

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

  // Start Vite in dev mode or serve static files in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KisanMitra ERP server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
