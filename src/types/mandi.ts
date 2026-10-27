export interface ArhtiaFirm {
  id: string;
  name: string;
  lic_number: string;
  mobile: string;
  pan_number: string;
  proprietor?: string;
  address: string;
}

export const ARHTIA_FIRMS: ArhtiaFirm[] = [
  {
    id: 'FIRM-01',
    name: 'JAMMU TRADING CO.',
    lic_number: 'JAL/LKH/133',
    mobile: '98147-74651',
    pan_number: 'AROPS7910C',
    proprietor: 'PRO. HIMMAT SINGH',
    address: 'All Mandi (Kamalpur / Mehrajwala / Kang Khurd)',
  },
  {
    id: 'FIRM-02',
    name: 'NEW JAMMU TRADING CO.',
    lic_number: 'JAL/LKH/239',
    mobile: '76966-74561',
    pan_number: 'SBUPS8808D',
    address: 'All Mandi (Kamalpur / Mehrajwala / Kang Khurd)',
  },
];

export const MANDI_LOCATIONS = [
  'Mandi Kamalpur (ਕਮਾਲਪੁਰ)',
  'Mehrajwala (ਮਹਿਰਾਜਵਾਲਾ)',
  'Kang Khurd (ਕੰਗ ਖੁਰਦ)',
  'Khanna Grain Market',
  'Barnala Mandi',
  'Moga Grain Market',
];

export interface ShellerMaster {
  id: string;
  name: string;
  location: string;
  mobile: string;
}

export const DEFAULT_SHELLERS: ShellerMaster[] = [
  { id: 'SH-01', name: 'Guru Nanak Rice Mill (ਸ਼ੈਲਰ)', location: 'Mehrajwala Road', mobile: '98140-11223' },
  { id: 'SH-02', name: 'Punjab Agro Food Sheller', location: 'Kamalpur Mandi', mobile: '98765-44332' },
  { id: 'SH-03', name: 'Kang Khurd Solvex & Rice Mill', location: 'Kang Khurd', mobile: '98881-22334' },
];

export interface LinkedFarmer {
  id: string;
  name_en: string;
  name_pa: string;
  father_husband_name_en?: string;
  father_husband_name_pa?: string;
  village_en?: string;
  village_pa?: string;
  relation: string; // 'Son (ਪੁੱਤਰ)' | 'Brother (ਭਰਾ)' | 'Wife (ਪਤਨੀ)' | 'Father (ਪਿਤਾ)' | 'Joint Partner (ਹਿੱਸੇਦਾਰ)' | 'Other'
  mobile_number: string;
  aadhaar_number: string;
  bank_account?: string;
  ifsc_code?: string;
}

export interface FarmerMaster {
  id: string;
  name_en: string;
  name_pa: string;
  father_husband_name_en: string;
  father_husband_name_pa: string;
  village_en: string;
  village_pa: string;
  mobile_number: string;
  aadhaar_number: string; // 12-digit Aadhaar Card Number
  photo_url?: string; // base64 camera or upload photo
  bank_account?: string;
  ifsc_code?: string;
  bank_name?: string;
  linked_farmers: LinkedFarmer[];
  created_at: string;
  updated_at?: string;
}

export interface CropArrivalEntry {
  id: string;
  date: string;
  mandi_name?: string;
  farmer_id?: string;
  farmer_name: string;
  farmer_name_pa?: string;
  father_husband_name?: string; // ਕਿਸਾਨ ਦੇ ਪਿਤਾ/ਪਤੀ ਦਾ ਨਾਮ
  father_husband_name_pa?: string;
  village: string;
  village_pa?: string;
  mobile: string;
  crop_type: string; // Paddy Grade A, Hybrid, PR-126
  crop_variety: string;
  vehicle_trolley_no: string;
  bag_packing_kg: number; // 37.5 kg standard or 50 kg
  new_jute_bags?: number;
  old_jute_bags?: number;
  total_bags_arrived: number;
  loose_weight_kg?: number; // ਤੋਟਾ / ਬਾਕੀ ਬਚਿਆ ਢਿੱਲਾ ਕਿੱਲੋ (e.g. 15 kg)
  weight_quintals: number;
  moisture_percentage?: number; // ਨਮੀ %
  parchi_no?: string; // ਪਰਚੀ ਨੰਬਰ (Parchi Number)
  gate_pass_no: string; // Compatible with parchi_no

  // 3 Labor & Cleaning Deduction Boxes
  labor_rate?: number; // ₹8 fix
  labor_total?: number;
  sukhi_kiti_rate?: number; // ₹5 optional
  sukhi_kiti_total?: number;
  double_pakha_rate?: number; // ₹4 optional
  double_pakha_total?: number;
  total_labor_deductions?: number;

  synced_to_sheets?: boolean;
}

// 2. Bardana Management (ਬਾਰਦਾਨਾ ਪ੍ਰਬੰਧਨ)
export interface BardanaEntry {
  id: string;
  date: string;
  mandi_name?: string;
  transaction_type: 'Received from Agency' | 'Received from Seller/Sheller' | 'Received from Private Source' | 'Issued to Farmer' | 'Returned to Yard';
  agency_name?: string;
  seller_sheller_name?: string;
  source_type?: 'Government Agency' | 'Rice Sheller' | 'Government Agency & Sheller' | 'Private Open Market' | 'Farmer';
  farmer_name?: string;
  village?: string;
  new_jute_bags: number;
  old_jute_bags: number;
  quantity_bags: number; // total = new + old
  bardana_type: string; // Jute Gunny, HDPE, etc.
  balance_after_transaction: number;
  remarks?: string;
  synced_to_sheets?: boolean;
}

// 3. Agency Purchase & Auction (ਸਰਕਾਰੀ ਖਰੀਦ ਤੇ ਬੋਲੀ / J-Form)
export interface AgencyPurchaseEntry {
  id: string;
  date: string;
  firm_id: string; // 'JAMMU TRADING CO.' or 'NEW JAMMU TRADING CO.'
  firm_name: string;
  mandi_name: string; // Mandi Kamalpur, Mehrajwala, Kang Khurd
  farmer_id?: string;
  farmer_name: string;
  father_husband_name?: string;
  address_village: string;
  village?: string;
  mobile: string;
  billed_to_name: string; // Main farmer or linked family member!
  relation_with_main?: string;
  crop_type: string; // Paddy Grade A, Hybrid, PR-126
  crop_variety: string;
  bag_packing_kg: number; // 37.5 kg
  new_jute_bags: number;
  old_jute_bags: number;
  total_bags: number;
  weight_quintals: number;
  rate_per_quintal: number; // ₹2461 fix MSP
  total_amount: number; // weight * rate
  purchasing_agency: string; // Pungrain, Markfed, FCI, Punsup, Miller
  seller_sheller_name?: string;
  
  // 3 distinct labor & deduction boxes
  j_form_labor_rate: number; // ₹8 fix
  j_form_labor_total: number;
  sukhi_kiti_rate: number; // ₹5 optional
  sukhi_kiti_total: number;
  double_pakha_rate: number; // Double pakha charges
  double_pakha_total: number;
  
  previous_khata: number;
  advance_paid: number;
  net_payable: number;
  payment_mode?: string;
  synced_to_sheets?: boolean;
}

// 4. Lifting & Dispatch (ਮੰਡੀ ਲਿਫਟਿੰਗ ਤੇ ਚਲਾਨ)
export interface LiftingDispatchEntry {
  id: string;
  date_time: string;
  firm_name: string; // JAMMU TRADING CO. or NEW JAMMU TRADING CO.
  mandi_name: string;
  purchasing_agency: string;
  seller_sheller_name: string; // Destination Sheller
  crop_type: string;
  truck_number: string;
  driver_name?: string;
  driver_mobile?: string;
  truck_photo?: string; // base64 or photo URL
  destination_godown?: string; // FCI Godown, Sheller Plant, Markfed Warehouse
  bag_category?: 'old' | 'new' | 'both';
  new_bags?: number;
  old_bags?: number;
  bags_lifted: number;
  weight_quintals?: number; // Auto: bags * 0.375
  pending_yard_bags: number;
  challan_no: string;
  lifting_status: 'Fully Lifted' | 'Partially Lifted';
  
  // Two-stage reconciliation: Dispatched (ਮੰਡੀ ਤੋਂ ਰਵਾਨਾ) vs Delivered (ਸ਼ੈਲਰ ਪਹੁੰਚਿਆ)
  delivery_status?: 'Dispatched' | 'Delivered';
  shortage_bags?: number;
  shortage_quintals?: number;
  rejected_bags?: number;
  delivered_date_time?: string;
  delivery_notes?: string;

  synced_to_sheets?: boolean;
}

// Full Combined Mandi Transaction
export interface MasterRecord {
  farmer_id?: string;
  main_farmer_name: string;
  main_farmer_name_pa?: string;
  father_husband_name: string;
  father_husband_name_pa?: string;
  village: string;
  village_pa?: string;
  mobile_number: string;
  aadhaar_number?: string;
  billed_to_name: string;
  billed_to_name_pa?: string;
  billed_to_aadhaar?: string;
  billed_to_mobile?: string;
  billed_to_relation?: string;
}

export interface CropInward {
  crop_type: string;
  crop_variety: string;
  total_bags: number;
  weight_quintals: number;
  rate_per_quintal: number;
  total_amount: number;
}

export interface BardanaTracking {
  bardana_received_from_agency: number;
  bardana_issued_to_farmer: number;
  bardana_balance: number;
  bardana_type: string;
}

export interface ProcurementAgency {
  seller_name: string;
  purchasing_agency: string;
  auction_date: string;
  gate_pass_number: string;
}

export interface LiftingDispatch {
  lifted_bags: number;
  lifting_date: string;
  pending_lifting_bags: number;
  transporter_truck_no: string;
  lifting_status: 'Fully Lifted' | 'Partially Lifted' | 'Pending';
}

export interface LaborPalledari {
  total_laborers_engaged: number;
  palledari_rate_per_bag: number;
  total_palledari_expense: number;
}

export interface FinancialLedger {
  previous_balance: number;
  advance_paid: number;
  net_payable_balance: number;
  payment_mode: string;
}

export interface MandiTransaction {
  id: string;
  created_at: string;
  mandi_yard?: string;
  master_record: MasterRecord;
  crop_inward: CropInward;
  bardana_tracking: BardanaTracking;
  procurement_agency: ProcurementAgency;
  lifting_dispatch: LiftingDispatch;
  labor_palledari: LaborPalledari;
  financial_ledger: FinancialLedger;
  summary_punjabi: string;
  summary_english: string;
  synced_to_sheets?: boolean;
  sheets_synced_at?: string;
  raw_transcript?: string;
}

export interface GoogleSheetConfig {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  connectedAt: string;
}

export interface LetterPadDocument {
  id: string;
  ref_no: string;
  date: string;
  firm_mode: 'dual' | 'firm1' | 'firm2';
  firm1_name: string;
  firm1_lic: string;
  firm1_pan: string;
  firm1_mobile: string;
  firm1_proprietor: string;
  firm2_name: string;
  firm2_lic: string;
  firm2_pan: string;
  firm2_mobile: string;
  firm2_proprietor: string;
  mandi_address: string;
  recipient_title: string;
  recipient_name: string;
  recipient_address: string;
  subject: string;
  salutation: string;
  body_paragraphs: string[];
  closing: string;
  signatory1_title: string;
  signatory2_title: string;
  show_watermark: boolean;
  notes_footer?: string;
  created_at: string;
}

