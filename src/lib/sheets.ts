import { 
  MandiTransaction, 
  FarmerMaster, 
  CropArrivalEntry, 
  BardanaEntry, 
  AgencyPurchaseEntry, 
  LiftingDispatchEntry 
} from '../types/mandi';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export interface SheetInitResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

export const MANDI_SHEET_TABS = {
  FARMER_REGISTER: 'Farmer_Register',
  CROP_ARRIVAL: 'Crop_Arrival_Inward',
  BARDANA: 'Bardana_Inventory',
  AGENCY_PURCHASE: 'Agency_Purchase_Auction',
  LIFTING: 'Lifting_Dispatches',
  MASTER: 'Master_ERP_Feed',
};

const TAB_HEADERS: Record<string, string[]> = {
  [MANDI_SHEET_TABS.FARMER_REGISTER]: [
    'Farmer ID',
    'Name (English)',
    'Name (ਪੰਜਾਬੀ)',
    'Father/Husband (English)',
    'Father/Husband (ਪੰਜਾਬੀ)',
    'Village (English)',
    'Village (ਪੰਜਾਬੀ)',
    'Aadhaar Card No.',
    'Mobile',
    'Bank Account',
    'IFSC Code',
    'Total Linked Farmers',
    'Linked Farmers Breakdown (Names, Relations, Aadhaar, Mobile)',
    'Date Registered',
  ],
  [MANDI_SHEET_TABS.CROP_ARRIVAL]: [
    'Inward ID',
    'Date',
    'Dana Mandi',
    'Farmer Name',
    'Village',
    'Mobile',
    'Crop Type',
    'Variety',
    'Vehicle / Trolley No.',
    'Bag Packing (Kg)',
    'New Jute Bags (ਨਵਾਂ)',
    'Old Jute Bags (ਪੁਰਾਣਾ)',
    'Total Bags (ਕੁੱਲ ਗੱਟੇ)',
    'Tota / Loose (ਤੋਟਾ Kg)',
    'Weight (Quintals)',
    'Moisture % (ਨਮੀ)',
    'Labor / J-Form (₹)',
    'Sukhi Kiti (₹)',
    'Double Pakha (₹)',
    'Total Labor Deductions (₹)',
    'Gate Pass No.',
  ],
  [MANDI_SHEET_TABS.BARDANA]: [
    'Entry ID',
    'Date',
    'Dana Mandi',
    'Transaction Type (ਕਿਸਮ)',
    'Source / Party / Sheller / Private',
    'Farmer Name',
    'Village',
    'New Jute Bags (ਨਵਾਂ)',
    'Old Jute Bags (ਪੁਰਾਣਾ)',
    'Total Bags Count (ਕੁੱਲ)',
    'Balance Stock After Entry',
    'Remarks / ਵੇਰਵਾ',
  ],
  [MANDI_SHEET_TABS.AGENCY_PURCHASE]: [
    'Auction / J-Form ID',
    'Auction Date',
    'Arhtia Firm Name',
    'Dana Mandi',
    'Main Farmer Name',
    'Father / Husband Name',
    'Billed To Name (ਜੇ-ਫਾਰਮ)',
    'Relation with Main',
    'Village',
    'Mobile',
    'Crop Type',
    'Variety',
    'New Jute Bags',
    'Old Jute Bags',
    'Total Bags (37.5kg)',
    'Weight (Quintals)',
    'Rate (₹/Qtl MSP)',
    'Gross Amount (₹)',
    'Purchasing Agency',
    'J-Form Labor ₹8/bag (₹)',
    'Sukhi Kiti ₹5/bag (₹)',
    'Double Pakha (₹)',
    'Previous Khata (₹)',
    'Advance Paid (₹)',
    'Net Payable to Farmer (₹)',
  ],
  [MANDI_SHEET_TABS.LIFTING]: [
    'Lifting ID',
    'Date & Time',
    'Arhtia Firm Name',
    'Dana Mandi',
    'Purchasing Agency',
    'Destination Sheller / Godown',
    'Crop Type',
    'Truck Number',
    'Driver Mobile',
    'Bags Lifted (ਚੁੱਕੇ ਗੱਟੇ)',
    'Pending Yard Bags (ਬਾਕੀ ਗੱਟੇ)',
    'Dispatch Challan No.',
    'Lifting Status',
  ],
  [MANDI_SHEET_TABS.MASTER]: [
    'Entry ID',
    'Date & Time',
    'Farmer Name',
    'Billed To (J-Form)',
    'Village',
    'Mobile',
    'Crop',
    'Bags',
    'Weight (Qtl)',
    'Rate (₹)',
    'Gross (₹)',
    'Agency',
    'Bardana Recv',
    'Bardana Issued',
    'Lifted Bags',
    'Pending Bags',
    'Net Payable (₹)',
  ],
};

/**
 * Creates a brand new Google Spreadsheet with all 5 distinct Mandi tabs + master feed.
 */
export async function createMandiSpreadsheet(
  token: string,
  customTitle?: string
): Promise<SheetInitResult> {
  const currentYear = new Date().getFullYear();
  const title = customTitle || `KisanMitra ERP - Punjab Mandi Records ${currentYear}`;

  const sheetsPayload = Object.values(MANDI_SHEET_TABS).map((tabTitle) => ({
    properties: {
      title: tabTitle,
      gridProperties: {
        frozenRowCount: 1,
      },
    },
  }));

  const response = await fetch(SHEETS_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: sheetsPayload,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets API Error (${response.status}): ${errorText}`);
  }

  const createdData = await response.json();
  const spreadsheetId = createdData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Populate header rows for each tab
  await writeInitialHeaders(token, spreadsheetId);

  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
  };
}

/**
 * Writes styled header rows into each of the standard tabs.
 */
async function writeInitialHeaders(token: string, spreadsheetId: string) {
  const data = Object.entries(TAB_HEADERS).map(([tabName, headers]) => ({
    range: `${tabName}!A1`,
    values: [headers],
  }));

  const response = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data,
      }),
    }
  );

  if (!response.ok) {
    console.warn('Header initialization notice:', await response.text());
  }
}

/**
 * Tests access to a spreadsheet ID and fetches metadata.
 */
export async function testSheetAccess(
  token: string,
  spreadsheetId: string
): Promise<{ title: string; sheets: string[] }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const response = await fetch(
    `${SHEETS_API_BASE}/${cleanId}?fields=spreadsheetId,properties.title,sheets.properties.title`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Spreadsheet not found. Please verify the Google Sheet ID or URL.');
    }
    if (response.status === 403) {
      throw new Error('Access denied. Please ensure your Google account has Editor access to this spreadsheet.');
    }
    const err = await response.text();
    throw new Error(`Failed to access Google Sheet (${response.status}): ${err}`);
  }

  const data = await response.json();
  const sheets = (data.sheets || []).map((s: any) => s.properties?.title || '');
  return {
    title: data.properties?.title || 'Connected Sheet',
    sheets,
  };
}

// 1. Append Farmer to Farmer_Register Sheet
export async function appendFarmerToSheets(
  token: string,
  spreadsheetId: string,
  farmer: FarmerMaster
): Promise<{ success: boolean; timestamp: string }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const dateStr = farmer.created_at
    ? new Date(farmer.created_at).toLocaleDateString('en-IN')
    : new Date().toLocaleDateString('en-IN');

  const linkedBreakdown = (farmer.linked_farmers || [])
    .map((lf) => `${lf.name_en} (${lf.name_pa}) [${lf.relation}] - Father: ${lf.father_husband_name_en || 'N/A'}, Village: ${lf.village_en || 'N/A'}, Aadhaar: ${lf.aadhaar_number || 'N/A'}, Mob: ${lf.mobile_number || 'N/A'}`)
    .join('; ');

  const row = [
    farmer.id,
    farmer.name_en,
    farmer.name_pa,
    farmer.father_husband_name_en || '',
    farmer.father_husband_name_pa || '',
    farmer.village_en,
    farmer.village_pa,
    farmer.aadhaar_number || '',
    farmer.mobile_number || '',
    farmer.bank_account || '',
    farmer.ifsc_code || '',
    farmer.linked_farmers ? farmer.linked_farmers.length : 0,
    linkedBreakdown,
    dateStr,
  ];

  return appendRowToTab(token, cleanId, MANDI_SHEET_TABS.FARMER_REGISTER, row);
}

// 2. Append Crop Arrival to Crop_Arrival_Inward Sheet
export async function appendCropArrivalToSheets(
  token: string,
  spreadsheetId: string,
  entry: CropArrivalEntry
): Promise<{ success: boolean; timestamp: string }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const row = [
    entry.id,
    entry.date,
    entry.mandi_name || 'Dana Mandi',
    entry.farmer_name + (entry.farmer_name_pa ? ` (${entry.farmer_name_pa})` : ''),
    entry.village,
    entry.mobile,
    entry.crop_type,
    entry.crop_variety,
    entry.vehicle_trolley_no || 'Trolley',
    entry.bag_packing_kg || 37.5,
    entry.new_jute_bags || 0,
    entry.old_jute_bags || 0,
    entry.total_bags_arrived,
    entry.loose_weight_kg || 0,
    entry.weight_quintals,
    entry.moisture_percentage || 'Standard',
    entry.labor_total || 0,
    entry.sukhi_kiti_total || 0,
    entry.double_pakha_total || 0,
    entry.total_labor_deductions || 0,
    entry.parchi_no || entry.gate_pass_no,
  ];

  return appendRowToTab(token, cleanId, MANDI_SHEET_TABS.CROP_ARRIVAL, row);
}

// 3. Append Bardana to Bardana_Inventory Sheet
export async function appendBardanaToSheets(
  token: string,
  spreadsheetId: string,
  entry: BardanaEntry
): Promise<{ success: boolean; timestamp: string }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const sourceParty = entry.seller_sheller_name || entry.agency_name || (entry.farmer_name ? `Farmer: ${entry.farmer_name}` : 'Mandi Yard');
  const row = [
    entry.id,
    entry.date,
    entry.mandi_name || 'Dana Mandi',
    entry.transaction_type,
    sourceParty,
    entry.farmer_name || 'N/A',
    entry.village || 'N/A',
    entry.new_jute_bags || 0,
    entry.old_jute_bags || 0,
    entry.quantity_bags,
    entry.balance_after_transaction,
    entry.remarks || '',
  ];

  return appendRowToTab(token, cleanId, MANDI_SHEET_TABS.BARDANA, row);
}

// 4. Append Agency Purchase / J-Form to Agency_Purchase_Auction Sheet
export async function appendAgencyPurchaseToSheets(
  token: string,
  spreadsheetId: string,
  entry: AgencyPurchaseEntry
): Promise<{ success: boolean; timestamp: string }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const row = [
    entry.id,
    entry.date,
    entry.firm_name || 'JAMMU TRADING CO.',
    entry.mandi_name || 'Dana Mandi',
    entry.farmer_name,
    entry.father_husband_name || '-',
    entry.billed_to_name,
    entry.relation_with_main || 'Self',
    entry.address_village || entry.village || '',
    entry.mobile,
    entry.crop_type,
    entry.crop_variety,
    entry.new_jute_bags || 0,
    entry.old_jute_bags || 0,
    entry.total_bags,
    entry.weight_quintals,
    entry.rate_per_quintal || 2461,
    entry.total_amount,
    entry.purchasing_agency,
    entry.j_form_labor_total || 0,
    entry.sukhi_kiti_total || 0,
    entry.double_pakha_total || 0,
    entry.previous_khata || 0,
    entry.advance_paid || 0,
    entry.net_payable,
  ];

  return appendRowToTab(token, cleanId, MANDI_SHEET_TABS.AGENCY_PURCHASE, row);
}

// 5. Append Lifting to Lifting_Dispatches Sheet
export async function appendLiftingDispatchToSheets(
  token: string,
  spreadsheetId: string,
  entry: LiftingDispatchEntry
): Promise<{ success: boolean; timestamp: string }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const row = [
    entry.id,
    entry.date_time,
    entry.firm_name || 'JAMMU TRADING CO.',
    entry.mandi_name || 'Dana Mandi',
    entry.purchasing_agency,
    entry.seller_sheller_name || entry.destination_godown || 'Agency Godown',
    entry.crop_type,
    entry.truck_number,
    entry.driver_name ? `${entry.driver_name} (${entry.driver_mobile || ''})` : (entry.driver_mobile || 'N/A'),
    entry.bags_lifted,
    entry.pending_yard_bags,
    entry.challan_no,
    entry.delivery_status || entry.lifting_status,
  ];

  return appendRowToTab(token, cleanId, MANDI_SHEET_TABS.LIFTING, row);
}

// Helper to append a single row to a given tab
async function appendRowToTab(token: string, cleanId: string, tabName: string, rowValues: any[]) {
  const url = `${SHEETS_API_BASE}/${cleanId}/values/${encodeURIComponent(tabName)}!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [rowValues],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.warn(`Could not append to tab ${tabName}:`, errorText);
  }

  return {
    success: true,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Appends a parsed Mandi transaction across all designated tabs + master feed.
 */
export async function appendMandiTransaction(
  token: string,
  spreadsheetId: string,
  item: MandiTransaction
): Promise<{ rowCount: number; timestamp: string }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  const dateTimeStr = item.created_at ? new Date(item.created_at).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');

  const masterRow = [
    item.id,
    dateTimeStr,
    item.master_record.main_farmer_name,
    item.master_record.billed_to_name || item.master_record.main_farmer_name,
    item.master_record.village,
    item.master_record.mobile_number,
    item.crop_inward.crop_type,
    item.crop_inward.total_bags,
    item.crop_inward.weight_quintals,
    item.crop_inward.rate_per_quintal,
    item.crop_inward.total_amount,
    item.procurement_agency.purchasing_agency,
    item.bardana_tracking.bardana_received_from_agency,
    item.bardana_tracking.bardana_issued_to_farmer,
    item.lifting_dispatch.lifted_bags,
    item.lifting_dispatch.pending_lifting_bags,
    item.financial_ledger.net_payable_balance,
  ];

  await appendRowToTab(token, cleanId, MANDI_SHEET_TABS.MASTER, masterRow);

  return {
    rowCount: 1,
    timestamp: new Date().toISOString(),
  };
}

export function extractSpreadsheetId(urlOrId: string): string {
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}
