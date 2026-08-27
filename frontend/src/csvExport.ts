import { type FarmRecord, type Diagnosis, type FarmerProfile } from './db';

/**
 * Escapes a cell value strictly according to RFC 4180 CSV standard.
 * Ensures quotes, commas, and newlines are safely encapsulated.
 */
export function escapeCSVCell(value: any): string {
  if (value === null || value === undefined) {
    return '""';
  }
  
  let str = String(value);
  // Replace internal carriage returns
  str = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // If string contains quotes, commas, semicolons, or newlines, quote it and escape internal quotes
  if (str.includes('"') || str.includes(',') || str.includes(';') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return `"${str}"`;
}

/**
 * Triggers an immediate browser file download of CSV content with UTF-8 BOM.
 * UTF-8 BOM (\uFEFF) ensures Excel and mobile spreadsheet apps parse UTF-8 characters without corruption.
 */
export function triggerCSVDownload(csvContent: string, filename: string): void {
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formats a timestamp or date string into a clean YYYY-MM-DD HH:mm format
 */
function formatDate(dateInput?: number | string): string {
  if (!dateInput) return 'N/A';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toISOString().replace('T', ' ').substring(0, 16);
  } catch {
    return String(dateInput);
  }
}

/**
 * Exports all Farm Planting & Harvest records to CSV
 */
export function exportFarmRecordsToCSV(records: FarmRecord[], profile?: FarmerProfile | null): void {
  const exportDate = new Date().toISOString().substring(0, 10);
  const rows: string[] = [];

  // Header / Metadata Block for Extension Officers
  rows.push(['# AGRISMART AI - FARM RECORDS EXPORT'].map(escapeCSVCell).join(','));
  rows.push(['# Generated Date', formatDate(Date.now())].map(escapeCSVCell).join(','));
  rows.push(['# Farmer Name', profile?.name || 'Local Farmer'].map(escapeCSVCell).join(','));
  rows.push(['# Region / District', `${profile?.region || 'National'}, ${profile?.country || 'Zimbabwe'}`].map(escapeCSVCell).join(','));
  if (profile?.gpsLocation) {
    rows.push(['# GPS Coordinates', `Lat: ${profile.gpsLocation.lat}, Lng: ${profile.gpsLocation.lng}`].map(escapeCSVCell).join(','));
  }
  rows.push(['# Total Records', records.length.toString()].map(escapeCSVCell).join(','));
  rows.push(['# Purpose', 'Offline Field Records & Agritex / Extension Officer Audit'].map(escapeCSVCell).join(','));
  rows.push(''); // Blank row divider

  // Column Headers
  const headers = [
    'Record ID',
    'Crop Name',
    'Variety / Cultivar',
    'Field / Plot Name',
    'Field Size',
    'Field Size Unit',
    'Planting Date',
    'Expected Harvest Date',
    'Actual Harvest Date',
    'Planting Method',
    'Current Status',
    'Input Costs ($)',
    'Yield Quantity',
    'Yield Unit',
    'Revenue ($)',
    'Net Profit / Loss ($)',
    'Total Treatments Logged',
    'Treatments & Inputs History',
    'Field Notes & Observations',
    'Sync Status',
    'Created At'
  ];
  rows.push(headers.map(escapeCSVCell).join(','));

  // Data Rows
  records.forEach((r, idx) => {
    const recordId = r.id ? String(r.id) : `REC-${idx + 1}`;
    const treatmentCostTotal = r.treatments?.reduce((acc, t) => acc + (t.cost || 0), 0) || 0;
    const totalInputCosts = (r.inputCosts || 0) + treatmentCostTotal;
    const netProfit = (r.revenue || 0) - totalInputCosts;

    // Format treatments as readable single cell
    const treatmentsStr = r.treatments && r.treatments.length > 0
      ? r.treatments.map((t, tIdx) => 
          `[${tIdx + 1}] Date: ${t.date} | Type: ${t.type || 'Treatment'} | Details: ${t.description}${t.cost ? ` | Cost: $${t.cost}` : ''}`
        ).join('\n')
      : 'None logged';

    const rowData = [
      recordId,
      r.cropName || '',
      r.variety || 'Standard / Local',
      r.fieldOrPlotName || 'Main Field',
      r.fieldSize !== undefined ? r.fieldSize.toString() : 'N/A',
      r.fieldSizeUnit || 'Hectares',
      r.plantingDate || '',
      r.expectedHarvestDate || 'N/A',
      r.actualHarvestDate || (r.status === 'Harvested' ? 'Harvested' : 'Pending'),
      r.plantingMethod || 'Standard',
      r.status || 'Growing',
      totalInputCosts.toFixed(2),
      r.yield !== undefined ? r.yield.toString() : 'N/A',
      r.yieldUnit || 'Tons/Ha',
      (r.revenue || 0).toFixed(2),
      netProfit.toFixed(2),
      (r.treatments?.length || 0).toString(),
      treatmentsStr,
      r.notes || '',
      r.synced ? 'Synced to Cloud' : 'Local / Offline',
      formatDate(r.createdAt || Date.now())
    ];

    rows.push(rowData.map(escapeCSVCell).join(','));
  });

  const csvString = rows.join('\r\n');
  const safeFarmerName = (profile?.name || 'Farmer').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `agrismart_farm_records_${safeFarmerName}_${exportDate}.csv`;
  triggerCSVDownload(csvString, filename);
}

/**
 * Exports all Crop Health & Pest/Disease Diagnosis Reports to CSV
 */
export function exportDiagnosesToCSV(diagnoses: Diagnosis[], profile?: FarmerProfile | null): void {
  const exportDate = new Date().toISOString().substring(0, 10);
  const rows: string[] = [];

  // Header / Metadata Block
  rows.push(['# AGRISMART AI - CROP HEALTH & DIAGNOSIS AUDIT REPORT'].map(escapeCSVCell).join(','));
  rows.push(['# Generated Date', formatDate(Date.now())].map(escapeCSVCell).join(','));
  rows.push(['# Farmer Name', profile?.name || 'Local Farmer'].map(escapeCSVCell).join(','));
  rows.push(['# Region / District', `${profile?.region || 'National'}, ${profile?.country || 'Zimbabwe'}`].map(escapeCSVCell).join(','));
  if (profile?.gpsLocation) {
    rows.push(['# GPS Coordinates', `Lat: ${profile.gpsLocation.lat}, Lng: ${profile.gpsLocation.lng}`].map(escapeCSVCell).join(','));
  }
  rows.push(['# Total Diagnoses Logged', diagnoses.length.toString()].map(escapeCSVCell).join(','));
  rows.push(['# Purpose', 'Pest Surveillance, Extension Consultation & Agronomic Record-keeping'].map(escapeCSVCell).join(','));
  rows.push(''); // Blank row divider

  // Column Headers
  const headers = [
    'Diagnosis ID',
    'Inspection Date',
    'Crop / Plant Common Name',
    'Botanical / Scientific Name',
    'Crop Category',
    'Growth Stage',
    'Plant Health Status',
    'Diagnosed Issue / Pest / Disease',
    'Issue Description',
    'AI Confidence',
    'Severity Level',
    'Is Beneficial Organism',
    'Identified Symptoms',
    'Primary Causes / Vectors',
    'Life Cycle & Timing',
    'Regional Impact / Agritex Alert',
    'Organic Control Options',
    'Chemical Treatment Options',
    'Preventative Recommendations',
    'Advice Verification / Scam Alert',
    'Soil Health Advice',
    'Issue Resolved',
    'Resolution Date',
    'Farmer Treatment Applied',
    'Sync Status',
    'Image Reference'
  ];
  rows.push(headers.map(escapeCSVCell).join(','));

  // Data Rows
  diagnoses.forEach((d, idx) => {
    const data = d.data || ({} as any);
    const diag = data.diagnosis || {};
    const adv = data.advisory || {};
    const plantName = data.plantName || {};

    const symptomsStr = Array.isArray(diag.symptoms) ? diag.symptoms.join('; ') : (diag.symptoms || 'N/A');
    const causesStr = Array.isArray(diag.causes) ? diag.causes.join('; ') : (diag.causes || 'N/A');
    const organicStr = Array.isArray(adv.organicOptions) ? adv.organicOptions.join('; ') : (adv.organicOptions || 'N/A');
    const chemicalStr = Array.isArray(adv.chemicalOptions) ? adv.chemicalOptions.join('; ') : (adv.chemicalOptions || 'N/A');
    const preventionStr = Array.isArray(adv.prevention) ? adv.prevention.join('; ') : (adv.prevention || 'N/A');

    const rowData = [
      d.id ? String(d.id) : `DIAG-${idx + 1}`,
      formatDate(d.timestamp),
      plantName.common || 'Unknown Plant',
      plantName.scientific || 'N/A',
      data.cropType || 'Field Crop',
      data.growthStage || 'N/A',
      data.healthStatus || 'N/A',
      diag.name || 'General Health Issue',
      diag.description || '',
      diag.confidence || 'N/A',
      diag.severity || 'Medium',
      diag.isBeneficial ? 'YES (Beneficial Organism)' : 'NO (Pest / Pathogen)',
      symptomsStr,
      causesStr,
      diag.lifeCycle || 'N/A',
      diag.regionalImpact || 'N/A',
      organicStr,
      chemicalStr,
      preventionStr,
      adv.scamAlert || 'Standard Verified Practice',
      data.soilAdvice || 'N/A',
      d.resolved ? 'RESOLVED' : 'ACTIVE ISSUE',
      d.resolvedAt ? formatDate(d.resolvedAt) : 'N/A',
      d.treatmentApplied || 'None recorded',
      d.synced ? 'Synced to Cloud' : 'Local / Offline',
      d.imageUrl ? (d.imageUrl.startsWith('data:') ? '[Offline Stored Image Data]' : d.imageUrl) : 'No image'
    ];

    rows.push(rowData.map(escapeCSVCell).join(','));
  });

  const csvString = rows.join('\r\n');
  const safeFarmerName = (profile?.name || 'Farmer').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `agrismart_crop_diagnoses_${safeFarmerName}_${exportDate}.csv`;
  triggerCSVDownload(csvString, filename);
}

/**
 * Exports a master comprehensive farm dossier for Extension Officers / Agritex
 * containing Summary Metrics, Farm Records, and Crop Health History in one structured CSV file.
 */
export function exportExtensionMasterAuditCSV(
  records: FarmRecord[], 
  diagnoses: Diagnosis[], 
  profile?: FarmerProfile | null
): void {
  const exportDate = new Date().toISOString().substring(0, 10);
  const rows: string[] = [];

  // Title Header
  rows.push(['# ========================================================================='].map(escapeCSVCell).join(','));
  rows.push(['# AGRISMART AI - COMPREHENSIVE EXTENSION OFFICER & AGRONOMY AUDIT DOSSIER'].map(escapeCSVCell).join(','));
  rows.push(['# ========================================================================='].map(escapeCSVCell).join(','));
  rows.push(['# Report Export Date', formatDate(Date.now())].map(escapeCSVCell).join(','));
  rows.push(['# Farmer Full Name', profile?.name || 'Registered Smallholder Farmer'].map(escapeCSVCell).join(','));
  rows.push(['# Preferred Language', profile?.language || 'English'].map(escapeCSVCell).join(','));
  rows.push(['# Country & Region', `${profile?.country || 'Zimbabwe'} - ${profile?.region || 'National District'}`].map(escapeCSVCell).join(','));
  if (profile?.gpsLocation) {
    rows.push(['# Field GPS Coordinates', `Latitude ${profile.gpsLocation.lat}, Longitude ${profile.gpsLocation.lng}`].map(escapeCSVCell).join(','));
  }
  rows.push(['# Registered Main Crops', profile?.mainCrops?.join(', ') || 'Maize, Groundnuts, Vegetables'].map(escapeCSVCell).join(','));
  rows.push('');

  // Section 1: Executive KPI Metrics
  rows.push(['# --- SECTION 1: FARM OPERATIONS & FINANCIAL SUMMARY ---'].map(escapeCSVCell).join(','));
  const totalArea = records.reduce((sum, r) => sum + (r.fieldSize || 0), 0);
  const activeCount = records.filter(r => r.status !== 'Harvested' && r.status !== 'Failed').length;
  const harvestedCount = records.filter(r => r.status === 'Harvested').length;
  const totalInputs = records.reduce((acc, r) => acc + (r.inputCosts || 0) + (r.treatments?.reduce((tAcc, tr) => tAcc + (tr.cost || 0), 0) || 0), 0);
  const totalRevenue = records.reduce((acc, r) => acc + (r.revenue || 0), 0);
  const netIncome = totalRevenue - totalInputs;
  const resolvedDiags = diagnoses.filter(d => d.resolved).length;
  const activePestThreats = diagnoses.filter(d => !d.resolved && d.data?.healthStatus !== 'Healthy').length;

  rows.push(['Metric Description', 'Value'].map(escapeCSVCell).join(','));
  rows.push(['Total Farm Planting Records', records.length.toString()].map(escapeCSVCell).join(','));
  rows.push(['Active Crops in Field', activeCount.toString()].map(escapeCSVCell).join(','));
  rows.push(['Completed Harvest Cycles', harvestedCount.toString()].map(escapeCSVCell).join(','));
  rows.push(['Total Recorded Area (Aggregate)', `${totalArea.toFixed(2)} Units`].map(escapeCSVCell).join(','));
  rows.push(['Total Input & Chemical Expenditure ($)', `$${totalInputs.toFixed(2)}`].map(escapeCSVCell).join(','));
  rows.push(['Total Gross Revenue from Yields ($)', `$${totalRevenue.toFixed(2)}`].map(escapeCSVCell).join(','));
  rows.push(['Net Farm Operating Balance ($)', `$${netIncome.toFixed(2)}`].map(escapeCSVCell).join(','));
  rows.push(['Total Disease/Pest Diagnoses Conducted', diagnoses.length.toString()].map(escapeCSVCell).join(','));
  rows.push(['Active Unresolved Pest Threats', activePestThreats.toString()].map(escapeCSVCell).join(','));
  rows.push(['Successfully Resolved Crop Issues', resolvedDiags.toString()].map(escapeCSVCell).join(','));
  rows.push('');

  // Section 2: Detailed Farm Planting & Harvest Table
  rows.push(['# --- SECTION 2: DETAILED CROP PRODUCTION & HARVEST LEDGER ---'].map(escapeCSVCell).join(','));
  const recordHeaders = [
    'Record ID',
    'Crop Name',
    'Variety',
    'Field Name',
    'Size',
    'Unit',
    'Planting Date',
    'Harvest Date',
    'Planting Method',
    'Status',
    'Total Input Cost ($)',
    'Yield Recorded',
    'Yield Unit',
    'Gross Revenue ($)',
    'Net Margin ($)',
    'Treatments Logged',
    'Field Notes'
  ];
  rows.push(recordHeaders.map(escapeCSVCell).join(','));

  records.forEach((r, idx) => {
    const tCost = r.treatments?.reduce((acc, t) => acc + (t.cost || 0), 0) || 0;
    const inputs = (r.inputCosts || 0) + tCost;
    const rev = r.revenue || 0;
    const net = rev - inputs;
    const treats = r.treatments?.map(t => `${t.date}: ${t.description} ($${t.cost || 0})`).join('; ') || 'None';

    rows.push([
      r.id ? String(r.id) : `REC-${idx + 1}`,
      r.cropName,
      r.variety || 'Local',
      r.fieldOrPlotName || 'Main Plot',
      r.fieldSize !== undefined ? r.fieldSize.toString() : 'N/A',
      r.fieldSizeUnit || 'Hectares',
      r.plantingDate,
      r.actualHarvestDate || r.expectedHarvestDate || 'N/A',
      r.plantingMethod || 'Standard',
      r.status,
      inputs.toFixed(2),
      r.yield !== undefined ? r.yield.toString() : 'N/A',
      r.yieldUnit || 'Tons/Ha',
      rev.toFixed(2),
      net.toFixed(2),
      treats,
      r.notes || ''
    ].map(escapeCSVCell).join(','));
  });
  rows.push('');

  // Section 3: Detailed Crop Health & Pest Surveillance Table
  rows.push(['# --- SECTION 3: CROP HEALTH SURVEILLANCE & PEST DIAGNOSIS LOG ---'].map(escapeCSVCell).join(','));
  const diagHeaders = [
    'Diagnosis ID',
    'Date & Time',
    'Crop Name',
    'Botanical Name',
    'Health Status',
    'Identified Pest / Disease',
    'Severity',
    'Confidence',
    'Primary Symptoms',
    'Organic Recommendations',
    'Chemical Recommendations',
    'Preventative Measures',
    'Resolution Status',
    'Farmer Treatment Applied'
  ];
  rows.push(diagHeaders.map(escapeCSVCell).join(','));

  diagnoses.forEach((d, idx) => {
    const data = d.data || ({} as any);
    const diag = data.diagnosis || {};
    const adv = data.advisory || {};
    const plantName = data.plantName || {};

    const symptomsStr = Array.isArray(diag.symptoms) ? diag.symptoms.join('; ') : (diag.symptoms || 'N/A');
    const organicStr = Array.isArray(adv.organicOptions) ? adv.organicOptions.join('; ') : (adv.organicOptions || 'N/A');
    const chemicalStr = Array.isArray(adv.chemicalOptions) ? adv.chemicalOptions.join('; ') : (adv.chemicalOptions || 'N/A');
    const prevStr = Array.isArray(adv.prevention) ? adv.prevention.join('; ') : (adv.prevention || 'N/A');

    rows.push([
      d.id ? String(d.id) : `DIAG-${idx + 1}`,
      formatDate(d.timestamp),
      plantName.common || 'Unknown',
      plantName.scientific || 'N/A',
      data.healthStatus || 'N/A',
      diag.name || 'General Issue',
      diag.severity || 'Medium',
      diag.confidence || 'N/A',
      symptomsStr,
      organicStr,
      chemicalStr,
      prevStr,
      d.resolved ? 'RESOLVED' : 'ACTIVE',
      d.treatmentApplied || 'None'
    ].map(escapeCSVCell).join(','));
  });

  const csvString = rows.join('\r\n');
  const safeFarmerName = (profile?.name || 'Farmer').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `agrismart_extension_master_audit_${safeFarmerName}_${exportDate}.csv`;
  triggerCSVDownload(csvString, filename);
}

/**
 * Exports a single farm record to CSV
 */
export function exportSingleRecordCSV(record: FarmRecord, profile?: FarmerProfile | null): void {
  const exportDate = new Date().toISOString().substring(0, 10);
  const rows: string[] = [];

  rows.push(['# AGRISMART AI - SINGLE CROP FIELD PRODUCTION SLIP'].map(escapeCSVCell).join(','));
  rows.push(['# Crop Name', record.cropName].map(escapeCSVCell).join(','));
  rows.push(['# Variety', record.variety || 'Standard'].map(escapeCSVCell).join(','));
  rows.push(['# Field / Plot', record.fieldOrPlotName || 'Main Field'].map(escapeCSVCell).join(','));
  rows.push(['# Farmer', profile?.name || 'Local Farmer'].map(escapeCSVCell).join(','));
  rows.push(['# Location', `${profile?.region || 'District'}, ${profile?.country || 'Zimbabwe'}`].map(escapeCSVCell).join(','));
  rows.push(['# Planting Date', record.plantingDate].map(escapeCSVCell).join(','));
  rows.push(['# Status', record.status].map(escapeCSVCell).join(','));
  rows.push('');

  rows.push(['# TREATMENTS & INPUT LOGGED'].map(escapeCSVCell).join(','));
  rows.push(['Treatment #', 'Date', 'Type', 'Description', 'Cost ($)'].map(escapeCSVCell).join(','));
  if (record.treatments && record.treatments.length > 0) {
    record.treatments.forEach((t, i) => {
      rows.push([
        (i + 1).toString(),
        t.date,
        t.type || 'Treatment',
        t.description,
        t.cost !== undefined ? `$${t.cost.toFixed(2)}` : '$0.00'
      ].map(escapeCSVCell).join(','));
    });
  } else {
    rows.push(['No treatments logged yet.'].map(escapeCSVCell).join(','));
  }
  rows.push('');

  const treatmentCostTotal = record.treatments?.reduce((acc, t) => acc + (t.cost || 0), 0) || 0;
  const totalInputCosts = (record.inputCosts || 0) + treatmentCostTotal;
  const netProfit = (record.revenue || 0) - totalInputCosts;

  rows.push(['# FINANCIAL & YIELD SUMMARY'].map(escapeCSVCell).join(','));
  rows.push(['Initial Input Cost ($)', `$${(record.inputCosts || 0).toFixed(2)}`].map(escapeCSVCell).join(','));
  rows.push(['Treatment & Chemical Costs ($)', `$${treatmentCostTotal.toFixed(2)}`].map(escapeCSVCell).join(','));
  rows.push(['Total Production Cost ($)', `$${totalInputCosts.toFixed(2)}`].map(escapeCSVCell).join(','));
  rows.push(['Harvest Yield', `${record.yield !== undefined ? record.yield : 'Pending'} ${record.yieldUnit || 'Tons/Ha'}`].map(escapeCSVCell).join(','));
  rows.push(['Gross Sales Revenue ($)', `$${(record.revenue || 0).toFixed(2)}`].map(escapeCSVCell).join(','));
  rows.push(['Net Margin ($)', `$${netProfit.toFixed(2)}`].map(escapeCSVCell).join(','));
  if (record.notes) {
    rows.push(['Field Notes', record.notes].map(escapeCSVCell).join(','));
  }

  const csvString = rows.join('\r\n');
  const safeCrop = record.cropName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `agrismart_crop_${safeCrop}_${exportDate}.csv`;
  triggerCSVDownload(csvString, filename);
}
