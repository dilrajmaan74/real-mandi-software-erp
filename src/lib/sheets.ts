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

// Row mapping converters for all 5 Mandi modules
export function farmerToRow(farmer: FarmerMaster): any[] {
  const dateStr = farmer.created_at
    ? new Date(farmer.created_at).toLocaleDateString('en-IN')
    : new Date().toLocaleDateString('en-IN');

  const linkedBreakdown = (farmer.linked_farmers || [])
    .map((lf) => `${lf.name_en} (${lf.name_pa}) [${lf.relation}] - Father: ${lf.father_husband_name_en || 'N/A'}, Village: ${lf.village_en || 'N/A'}, Aadhaar: ${lf.aadhaar_number || 'N/A'}, Mob: ${lf.mobile_number || 'N/A'}`)
    .join('; ');

  return [
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
}

export function arrivalToRow(entry: CropArrivalEntry): any[] {
  return [
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
}

export function bardanaToRow(entry: BardanaEntry): any[] {
  const sourceParty = entry.seller_sheller_name || entry.agency_name || (entry.farmer_name ? `Farmer: ${entry.farmer_name}` : 'Mandi Yard');
  return [
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
}

export function purchaseToRow(entry: AgencyPurchaseEntry): any[] {
  return [
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
}

export function liftingToRow(entry: LiftingDispatchEntry): any[] {
  return [
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
}

// 1. Append Farmer to Farmer_Register Sheet
export async function appendFarmerToSheets(
  token: string,
  spreadsheetId: string,
  farmer: FarmerMaster
): Promise<{ success: boolean; timestamp: string }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const row = farmerToRow(farmer);
  return appendRowToTab(token, cleanId, MANDI_SHEET_TABS.FARMER_REGISTER, row);
}

// 2. Append Crop Arrival to Crop_Arrival_Inward Sheet
export async function appendCropArrivalToSheets(
  token: string,
  spreadsheetId: string,
  entry: CropArrivalEntry
): Promise<{ success: boolean; timestamp: string }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const row = arrivalToRow(entry);
  return appendRowToTab(token, cleanId, MANDI_SHEET_TABS.CROP_ARRIVAL, row);
}

// 3. Append Bardana to Bardana_Inventory Sheet
export async function appendBardanaToSheets(
  token: string,
  spreadsheetId: string,
  entry: BardanaEntry
): Promise<{ success: boolean; timestamp: string }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const row = bardanaToRow(entry);
  return appendRowToTab(token, cleanId, MANDI_SHEET_TABS.BARDANA, row);
}

// 4. Append Agency Purchase / J-Form to Agency_Purchase_Auction Sheet
export async function appendAgencyPurchaseToSheets(
  token: string,
  spreadsheetId: string,
  entry: AgencyPurchaseEntry
): Promise<{ success: boolean; timestamp: string }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const row = purchaseToRow(entry);
  return appendRowToTab(token, cleanId, MANDI_SHEET_TABS.AGENCY_PURCHASE, row);
}

// 5. Append Lifting to Lifting_Dispatches Sheet
export async function appendLiftingDispatchToSheets(
  token: string,
  spreadsheetId: string,
  entry: LiftingDispatchEntry
): Promise<{ success: boolean; timestamp: string }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const row = liftingToRow(entry);
  return appendRowToTab(token, cleanId, MANDI_SHEET_TABS.LIFTING, row);
}

// Helper to append a single row to a given tab
async function appendRowToTab(token: string, cleanId: string, tabName: string, rowValues: any[]) {
  return appendRowsToTab(token, cleanId, tabName, [rowValues]);
}

// Helper to append multiple rows to a tab in a single HTTP batch request
export async function appendRowsToTab(token: string, cleanId: string, tabName: string, rows: any[][]) {
  if (!rows || rows.length === 0) return { success: true, timestamp: new Date().toISOString() };
  
  // Ensure the target tab exists first
  await ensureTabExists(token, cleanId, tabName);

  const url = `${SHEETS_API_BASE}/${cleanId}/values/${encodeURIComponent(tabName)}!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: rows,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    if (res.status === 401) {
      throw new Error('GOOGLE_AUTH_EXPIRED: ਗੂਗਲ ਸ਼ੀਟ ਅਕਸੈੱਸ ਟੋਕਨ ਦੀ ਮਿਆਦ ਖ਼ਤਮ ਹੋ ਗਈ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਗੂਗਲ ਨਾਲ ਮੁੜ-ਕਨੈਕਟ ਕਰੋ।');
    }
    console.warn(`Could not append to tab ${tabName}:`, errorText);
    throw new Error(`Google Sheets Sync Error (${res.status}): ${errorText}`);
  }

  return {
    success: true,
    timestamp: new Date().toISOString(),
  };
}

/**
 * High-performance bulk sync of all software records to the ONE fixed Google Sheet.
 * Reads existing entry IDs in each tab to avoid duplicating rows!
 */
export async function syncAllDataToFixedSheet(
  token: string,
  spreadsheetId: string,
  data: {
    farmers: FarmerMaster[];
    arrivals: CropArrivalEntry[];
    bardana: BardanaEntry[];
    purchases: AgencyPurchaseEntry[];
    lifting: LiftingDispatchEntry[];
  }
): Promise<{
  success: boolean;
  totalSynced: number;
  details: {
    farmers: number;
    arrivals: number;
    bardana: number;
    purchases: number;
    lifting: number;
  };
}> {
  const cleanId = extractSpreadsheetId(spreadsheetId);

  // 1. Ensure all tabs and standard headers exist
  await ensureMandiTabsExist(token, cleanId);

  // Helper to fetch existing Column A IDs in a tab
  const getExistingIds = async (tabName: string): Promise<Set<string>> => {
    try {
      const res = await fetch(
        `${SHEETS_API_BASE}/${cleanId}/values/${encodeURIComponent(tabName)}!A:A`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        if (res.status === 401) throw new Error('GOOGLE_AUTH_EXPIRED');
        return new Set();
      }
      const json = await res.json();
      const rows: any[][] = json.values || [];
      const idSet = new Set<string>();
      for (let i = 1; i < rows.length; i++) {
        const val = rows[i]?.[0];
        if (val) idSet.add(String(val).trim());
      }
      return idSet;
    } catch (e: any) {
      if (e?.message === 'GOOGLE_AUTH_EXPIRED') throw e;
      return new Set();
    }
  };

  const results = {
    farmers: 0,
    arrivals: 0,
    bardana: 0,
    purchases: 0,
    lifting: 0,
  };

  // 2. Sync Farmers
  if (data.farmers && data.farmers.length > 0) {
    const existing = await getExistingIds(MANDI_SHEET_TABS.FARMER_REGISTER);
    const toAppend = data.farmers
      .filter((f) => !existing.has(String(f.id).trim()))
      .map(farmerToRow);
    if (toAppend.length > 0) {
      await appendRowsToTab(token, cleanId, MANDI_SHEET_TABS.FARMER_REGISTER, toAppend);
      results.farmers = toAppend.length;
    }
  }

  // 3. Sync Crop Arrivals
  if (data.arrivals && data.arrivals.length > 0) {
    const existing = await getExistingIds(MANDI_SHEET_TABS.CROP_ARRIVAL);
    const toAppend = data.arrivals
      .filter((a) => !existing.has(String(a.id).trim()))
      .map(arrivalToRow);
    if (toAppend.length > 0) {
      await appendRowsToTab(token, cleanId, MANDI_SHEET_TABS.CROP_ARRIVAL, toAppend);
      results.arrivals = toAppend.length;
    }
  }

  // 4. Sync Bardana
  if (data.bardana && data.bardana.length > 0) {
    const existing = await getExistingIds(MANDI_SHEET_TABS.BARDANA);
    const toAppend = data.bardana
      .filter((b) => !existing.has(String(b.id).trim()))
      .map(bardanaToRow);
    if (toAppend.length > 0) {
      await appendRowsToTab(token, cleanId, MANDI_SHEET_TABS.BARDANA, toAppend);
      results.bardana = toAppend.length;
    }
  }

  // 5. Sync Purchases
  if (data.purchases && data.purchases.length > 0) {
    const existing = await getExistingIds(MANDI_SHEET_TABS.AGENCY_PURCHASE);
    const toAppend = data.purchases
      .filter((p) => !existing.has(String(p.id).trim()))
      .map(purchaseToRow);
    if (toAppend.length > 0) {
      await appendRowsToTab(token, cleanId, MANDI_SHEET_TABS.AGENCY_PURCHASE, toAppend);
      results.purchases = toAppend.length;
    }
  }

  // 6. Sync Lifting Dispatches
  if (data.lifting && data.lifting.length > 0) {
    const existing = await getExistingIds(MANDI_SHEET_TABS.LIFTING);
    const toAppend = data.lifting
      .filter((l) => !existing.has(String(l.id).trim()))
      .map(liftingToRow);
    if (toAppend.length > 0) {
      await appendRowsToTab(token, cleanId, MANDI_SHEET_TABS.LIFTING, toAppend);
      results.lifting = toAppend.length;
    }
  }

  const totalSynced = results.farmers + results.arrivals + results.bardana + results.purchases + results.lifting;
  return {
    success: true,
    totalSynced,
    details: results,
  };
}

/**
 * Ensures all standard Mandi tabs and headers exist in the connected spreadsheet.
 */
export async function ensureMandiTabsExist(token: string, spreadsheetId: string): Promise<void> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  try {
    const metaRes = await fetch(
      `${SHEETS_API_BASE}/${cleanId}?fields=sheets(properties(sheetId,title))`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!metaRes.ok) return;

    const meta = await metaRes.json();
    const existingTitles: string[] = (meta.sheets || []).map((s: any) => s.properties?.title || '');

    const requiredTabs = Object.values(MANDI_SHEET_TABS);
    const missingTabs = requiredTabs.filter((t) => !existingTitles.includes(t));

    if (missingTabs.length > 0) {
      // Add missing sheets
      const requests = missingTabs.map((title) => ({
        addSheet: {
          properties: {
            title,
            gridProperties: { frozenRowCount: 1 },
          },
        },
      }));

      await fetch(`${SHEETS_API_BASE}/${cleanId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });

      // Write headers for newly added tabs
      const data = missingTabs
        .filter((t) => TAB_HEADERS[t])
        .map((t) => ({
          range: `${t}!A1`,
          values: [TAB_HEADERS[t]],
        }));

      if (data.length > 0) {
        await fetch(`${SHEETS_API_BASE}/${cleanId}/values:batchUpdate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            valueInputOption: 'USER_ENTERED',
            data,
          }),
        });
      }
    }
  } catch (e) {
    console.warn('ensureMandiTabsExist notice:', e);
  }
}

async function ensureTabExists(token: string, cleanId: string, tabName: string): Promise<void> {
  try {
    const metaRes = await fetch(
      `${SHEETS_API_BASE}/${cleanId}?fields=sheets(properties(sheetId,title))`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!metaRes.ok) return;

    const meta = await metaRes.json();
    const existingTitles: string[] = (meta.sheets || []).map((s: any) => s.properties?.title || '');

    if (!existingTitles.includes(tabName)) {
      // Create tab
      await fetch(`${SHEETS_API_BASE}/${cleanId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: tabName,
                  gridProperties: { frozenRowCount: 1 },
                },
              },
            },
          ],
        }),
      });

      // Add headers
      if (TAB_HEADERS[tabName]) {
        await fetch(`${SHEETS_API_BASE}/${cleanId}/values/${encodeURIComponent(tabName)}!A1?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [TAB_HEADERS[tabName]],
          }),
        });
      }
    }
  } catch (e) {
    console.warn(`ensureTabExists for ${tabName}:`, e);
  }
}

/**
 * Deletes a row from a Google Sheet tab by finding its Entry ID in Column A.
 */
export async function deleteRowFromTab(
  token: string,
  spreadsheetId: string,
  tabName: string,
  targetId: string
): Promise<{ success: boolean; deletedCount: number }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);

  try {
    // 1. Fetch metadata to get numeric sheetId for the tab
    const metaRes = await fetch(
      `${SHEETS_API_BASE}/${cleanId}?fields=sheets(properties(sheetId,title))`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!metaRes.ok) {
      if (metaRes.status === 401) {
        throw new Error('GOOGLE_AUTH_EXPIRED: ਗੂਗਲ ਸ਼ੀਟ ਅਕਸੈੱਸ ਟੋਕਨ ਦੀ ਮਿਆਦ ਖ਼ਤਮ ਹੋ ਗਈ ਹੈ।');
      }
      return { success: false, deletedCount: 0 };
    }

    const meta = await metaRes.json();
    const matchSheet = (meta.sheets || []).find((s: any) => s.properties?.title === tabName);
    if (!matchSheet || matchSheet.properties?.sheetId === undefined) {
      return { success: false, deletedCount: 0 };
    }
    const numericSheetId: number = matchSheet.properties.sheetId;

    // 2. Fetch column A values to find which row has the targetId
    const valuesRes = await fetch(
      `${SHEETS_API_BASE}/${cleanId}/values/${encodeURIComponent(tabName)}!A:A`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!valuesRes.ok) {
      return { success: false, deletedCount: 0 };
    }

    const valuesData = await valuesRes.json();
    const rows: any[][] = valuesData.values || [];

    // Find all 0-based row indices matching targetId (skip header at index 0)
    const matchingIndices: number[] = [];
    for (let i = 1; i < rows.length; i++) {
      const cellValue = rows[i]?.[0];
      if (cellValue && String(cellValue).trim() === String(targetId).trim()) {
        matchingIndices.push(i);
      }
    }

    if (matchingIndices.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    // 3. Build deleteDimension requests in DESCENDING order so index shifts don't affect previous rows
    matchingIndices.sort((a, b) => b - a);

    const requests = matchingIndices.map((idx) => ({
      deleteDimension: {
        range: {
          sheetId: numericSheetId,
          dimension: 'ROWS',
          startIndex: idx,
          endIndex: idx + 1,
        },
      },
    }));

    const deleteRes = await fetch(`${SHEETS_API_BASE}/${cleanId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });

    if (!deleteRes.ok) {
      const err = await deleteRes.text();
      console.warn(`Error deleting row from tab ${tabName}:`, err);
      return { success: false, deletedCount: 0 };
    }

    return {
      success: true,
      deletedCount: matchingIndices.length,
    };
  } catch (err) {
    console.warn(`deleteRowFromTab error for tab ${tabName}:`, err);
    return { success: false, deletedCount: 0 };
  }
}

// Module-specific row deletion helpers for Google Sheets:
export async function deleteFarmerFromSheets(token: string, spreadsheetId: string, farmerId: string) {
  return deleteRowFromTab(token, spreadsheetId, MANDI_SHEET_TABS.FARMER_REGISTER, farmerId);
}

export async function deleteCropArrivalFromSheets(token: string, spreadsheetId: string, arrivalId: string) {
  return deleteRowFromTab(token, spreadsheetId, MANDI_SHEET_TABS.CROP_ARRIVAL, arrivalId);
}

export async function deleteBardanaFromSheets(token: string, spreadsheetId: string, entryId: string) {
  return deleteRowFromTab(token, spreadsheetId, MANDI_SHEET_TABS.BARDANA, entryId);
}

export async function deleteAgencyPurchaseFromSheets(token: string, spreadsheetId: string, purchaseId: string) {
  return deleteRowFromTab(token, spreadsheetId, MANDI_SHEET_TABS.AGENCY_PURCHASE, purchaseId);
}

export async function deleteLiftingDispatchFromSheets(token: string, spreadsheetId: string, dispatchId: string) {
  return deleteRowFromTab(token, spreadsheetId, MANDI_SHEET_TABS.LIFTING, dispatchId);
}

/**
 * Appends a parsed Mandi transaction across designated tabs + master feed.
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
