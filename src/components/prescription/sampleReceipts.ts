export interface SampleReceipt {
  id: string;
  name: string;
  hospital: string;
  date: string;
  rxNumber: string;
  totalAmount: string;
  imageThumbnail: string; // SVG data URL
  documentType: string;
  rawText: string;
}

// Crisp vector SVG receipts encoded as data URLs
const createReceiptSvg = (title: string, subtitle: string, items: string[], total: string, date: string, rx: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="100%" height="100%">
    <rect width="600" height="800" fill="#fdfdfb" stroke="#cbd5e1" stroke-width="2" rx="12"/>
    <rect x="20" y="20" width="560" height="100" fill="#065f46" rx="8"/>
    <text x="300" y="55" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">${title.toUpperCase()}</text>
    <text x="300" y="80" font-family="system-ui, sans-serif" font-size="12" fill="#a7f3d0" text-anchor="middle">${subtitle}</text>
    <text x="300" y="102" font-family="system-ui, sans-serif" font-size="10" fill="#ecfdf5" text-anchor="middle">LIC NO: 20B/KA-B1-49102 · TAX INVOICE &amp; Rx SLIP</text>
    
    <!-- Meta Header -->
    <rect x="20" y="130" width="560" height="65" fill="#f1f5f9" rx="6"/>
    <text x="35" y="152" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#1e293b">PATIENT: Ramesh Sharma (68 Y / M)</text>
    <text x="35" y="172" font-family="system-ui, sans-serif" font-size="11" fill="#475569">CONSULTANT: Dr. Rajesh Mehta (MS, MCh - CTVS)</text>
    <text x="400" y="152" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#0f172a">DATE: ${date}</text>
    <text x="400" y="172" font-family="system-ui, sans-serif" font-size="11" fill="#475569">Rx #: ${rx}</text>
    
    <!-- Table Header -->
    <rect x="20" y="205" width="560" height="30" fill="#e2e8f0"/>
    <text x="35" y="225" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#334155">#</text>
    <text x="60" y="225" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#334155">MEDICATION / FORMULATION</text>
    <text x="340" y="225" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#334155">DOSAGE &amp; TIMING</text>
    <text x="490" y="225" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#334155">QTY</text>
    
    <!-- Items -->
    ${items.map((item, idx) => {
      const parts = item.split('|');
      const y = 265 + (idx * 55);
      return `
        <line x1="20" y1="${y + 20}" x2="580" y2="${y + 20}" stroke="#e2e8f0" stroke-width="1"/>
        <text x="35" y="${y}" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#0f172a">${idx + 1}</text>
        <text x="60" y="${y - 4}" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#047857">${parts[0] || ''}</text>
        <text x="60" y="${y + 12}" font-family="system-ui, sans-serif" font-size="10" fill="#64748b">${parts[1] || ''}</text>
        <text x="340" y="${y - 4}" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#1e293b">${parts[2] || ''}</text>
        <text x="340" y="${y + 12}" font-family="system-ui, sans-serif" font-size="10" fill="#0284c7">${parts[3] || ''}</text>
        <text x="490" y="${y}" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#0f172a">${parts[4] || ''}</text>
      `;
    }).join('')}
    
    <!-- Footer / Instructions -->
    <rect x="20" y="580" width="560" height="90" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="4" rx="6"/>
    <text x="35" y="605" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#b45309">CLINICAL PRECAUTIONS &amp; DISCHARGE ADVICE:</text>
    <text x="35" y="625" font-family="system-ui, sans-serif" font-size="10" fill="#475569">• Sternal precaution strict x 6 wks. Do not lift heavy objects (>5kg).</text>
    <text x="35" y="642" font-family="system-ui, sans-serif" font-size="10" fill="#475569">• Incentive spirometry 10 breaths every 3 hours while awake.</text>
    <text x="35" y="659" font-family="system-ui, sans-serif" font-size="10" fill="#dc2626">• Report sternal instability, fever >38°C, or purulent drainage immediately.</text>
    
    <!-- Totals & Barcode -->
    <rect x="20" y="685" width="560" height="85" fill="#f1f5f9" rx="8"/>
    <text x="40" y="725" font-family="Courier, monospace" font-size="18" font-weight="bold" fill="#334155">||| | |||| ||| ||||||| ||| |||</text>
    <text x="40" y="745" font-family="system-ui, sans-serif" font-size="10" fill="#64748b">AUTH VERIFIED DIGITAL DISPENSARY Rx</text>
    <text x="440" y="718" font-family="system-ui, sans-serif" font-size="11" fill="#64748b">TOTAL BILLED AMOUNT</text>
    <text x="440" y="745" font-family="system-ui, sans-serif" font-size="22" font-weight="bold" fill="#065f46">${total}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const SAMPLE_PRESCRIPTION_RECEIPTS: SampleReceipt[] = [
  {
    id: 'sample-apollo',
    name: 'Apollo Pharmacy Discharge Rx (5 Cardiac Meds)',
    hospital: 'Apollo Hospitals & Pharmacy · Bangalore',
    date: '10/09/2026',
    rxNumber: 'AP-BLR-84920',
    totalAmount: '₹1,280.00',
    documentType: 'Prescription Receipt',
    rawText: `APOLLO HOSPITALS & PHARMACY ENTERPRISES LTD
BRANCH: Bannerghatta Main Rd, Bangalore - 560076
Rx / TAX INVOICE: AP-BLR-84920
DATE: 10/09/2026  TIME: 11:42 AM
PATIENT: RAMESH SHARMA | AGE: 68 Y / M | IP NO: 40912
PRESCRIBER: DR. RAJESH MEHTA (MS, MCh - CTVS)

SL  ITEM DESCRIPTION             QTY   DOSAGE      TIMING          PRICE
-------------------------------------------------------------------------
01  GLYCIPHAGE 500MG TAB (60'S)   60   500MG       1-0-1 PC        145.00
02  ECOSPRIN 75MG TAB (30'S)      30   75MG        1-0-0 PC         32.00
03  ATORVA 20MG TAB (30'S)        30   20MG        0-0-1 HS        290.00
04  BETALOC 25MG ER TAB (30'S)    30   25MG        1-0-0 PC        310.00
05  PAN 40MG TAB (15'S)           15   40MG        1-0-0 AC        210.00
-------------------------------------------------------------------------
TOTAL MEDS BILLED: 5 ITEMS        TOTAL AMOUNT DUE: ₹1,280.00
ADVICE: Sternal precaution strict x 6 wks. Incentive spirometry 10x TDS.`,
    imageThumbnail: createReceiptSvg(
      'Apollo Hospitals & Pharmacy',
      'Bannerghatta Road, Bengaluru · Tel: 080-2630-4050',
      [
        'GLYCIPHAGE 500MG TAB|Metformin Hydrochloride 500mg|1-0-1 After Meals|Morning & Night|60 Tabs',
        'ECOSPRIN 75MG TAB|Aspirin Gastro-resistant 75mg|1-0-0 After Breakfast|Morning|30 Tabs',
        'ATORVA 20MG TAB|Atorvastatin Calcium 20mg|0-0-1 At Bedtime|Night (08:00 PM)|30 Tabs',
        'BETALOC 25MG ER TAB|Metoprolol Succinate ER 25mg|1-0-0 After Breakfast|Morning (08:00 AM)|30 Tabs',
        'PAN 40MG TAB|Pantoprazole Sodium 40mg|1-0-0 Empty Stomach|30 min before food|15 Tabs',
      ],
      '₹1,280.00',
      '10/09/2026',
      'AP-BLR-84920'
    ),
  },
  {
    id: 'sample-max',
    name: 'Max Surgical Follow-up Rx (3 Antibiotic & Wound Meds)',
    hospital: 'Max Super Speciality Hospital · New Delhi',
    date: '11/09/2026',
    rxNumber: 'MAX-RX-72019',
    totalAmount: '₹640.00',
    documentType: 'Prescription Slip',
    rawText: `MAX HEALTHCARE INSTITUTE
CLINIC PRESCRIPTION MEMO
DATE: 11/09/2026  Rx #: MAX-RX-72019
PATIENT: Ramesh Sharma | AGE: 68
CONSULTANT: Dr. Rajesh Mehta

Rx MEDICATIONS:
1. Tab. Augmentin 625mg  ---- 1 tab BD x 5 days (After food)
2. Tab. Dolo 650mg       ---- 1 tab SOS for incision pain
3. Tab. Chymoral Forte   ---- 1 tab BD x 5 days (Before meals)

Special note: Strict compliance with complete antibiotic course.`,
    imageThumbnail: createReceiptSvg(
      'Max Super Speciality Hospital',
      '1, 2, Press Enclave Marg, Saket, New Delhi',
      [
        'AUGMENTIN 625 TAB|Amoxicillin 500mg + Clavulanate 125mg|1-0-1 After Food|Morning & Night|10 Tabs',
        'DOLO 650 TAB|Paracetamol 650mg Analgesic|1 tab SOS for pain|Max 3 tabs/day|10 Tabs',
        'CHYMORAL FORTE TAB|Trypsin-Chymotrypsin Anti-edema|1-0-1 Before Food|30 mins prior|10 Tabs',
      ],
      '₹640.00',
      '11/09/2026',
      'MAX-RX-72019'
    ),
  },
  {
    id: 'sample-fortis',
    name: 'Fortis Cardiology Regimen (4 BP & Heart Meds)',
    hospital: 'Fortis Escorts Heart Institute · Okhla',
    date: '08/09/2026',
    rxNumber: 'FEHI-CARD-3918',
    totalAmount: '₹1,450.00',
    documentType: 'Cardiology Prescription Order',
    rawText: `FORTIS ESCORTS HEART INSTITUTE
OUTPATIENT CARDIOLOGY DEPARTMENT
DATE: 08/09/2026  Rx: FEHI-CARD-3918
PATIENT: Ramesh Sharma | AGE: 68
CONSULTANT: Dr. Alok Verma, MD, DM (Cardiology)

Rx:
1. Tab. Telma 40 (Telmisartan 40mg) - 1 tab OD Morning
2. Tab. Clopilet 75 (Clopidogrel 75mg) - 1 tab OD with Lunch
3. Tab. Rosuvas 10 (Rosuvastatin 10mg) - 1 tab HS Bedtime
4. Tab. Concor 2.5 (Bisoprolol 2.5mg) - 1 tab OD Morning
Advice: Low sodium diet. Log resting BP thrice weekly.`,
    imageThumbnail: createReceiptSvg(
      'Fortis Escorts Heart Institute',
      'Okhla Road, Sukhdev Vihar, New Delhi',
      [
        'TELMA 40MG TAB|Telmisartan 40mg Antihypertensive|1-0-0 Morning|08:00 AM|30 Tabs',
        'CLOPILET 75MG TAB|Clopidogrel 75mg Antiplatelet|0-1-0 Afternoon|With Lunch|30 Tabs',
        'ROSUVAS 10MG TAB|Rosuvastatin 10mg Lipid Regulating|0-0-1 Night|Bedtime|30 Tabs',
        'CONCOR 2.5MG TAB|Bisoprolol Fumarate 2.5mg Beta-blocker|1-0-0 Morning|08:00 AM|30 Tabs',
      ],
      '₹1,450.00',
      '08/09/2026',
      'FEHI-CARD-3918'
    ),
  },
];
