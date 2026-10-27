import React, { useState, useRef } from 'react';
import { 
  Printer, 
  Download, 
  FileText, 
  Save, 
  RotateCcw, 
  UserCheck, 
  Building, 
  CheckCircle, 
  Copy, 
  Sparkles, 
  BookOpen,
  Trash2,
  Calendar,
  Hash,
  Eye,
  Edit3
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { FarmerMaster, ARHTIA_FIRMS, LetterPadDocument } from '../types/mandi';

interface LetterPadModuleProps {
  registeredFarmers: FarmerMaster[];
  currentMandi?: string;
  onToast?: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const LetterPadModule: React.FC<LetterPadModuleProps> = ({
  registeredFarmers,
  currentMandi = 'Mandi Kamalpur / Mehrajwala / Kang Khurd',
  onToast,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'history'>('editor');

  // Firm 1 and Firm 2 defaults from constants
  const firm1 = ARHTIA_FIRMS[0] || {
    name: 'JAMMU TRADING CO.',
    lic_number: 'JAL/LKH/133',
    mobile: '98147-74651',
    pan_number: 'AROPS7910C',
    proprietor: 'PRO. HIMMAT SINGH',
    address: 'All Mandi (Kamalpur / Mehrajwala / Kang Khurd)',
  };

  const firm2 = ARHTIA_FIRMS[1] || {
    name: 'NEW JAMMU TRADING CO.',
    lic_number: 'JAL/LKH/239',
    mobile: '76966-74561',
    pan_number: 'SBUPS8808D',
    proprietor: 'PRO. PARTNER',
    address: 'All Mandi (Kamalpur / Mehrajwala / Kang Khurd)',
  };

  // Form State
  const [refNo, setRefNo] = useState(() => `JTC/${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}/${Math.floor(100 + Math.random() * 900)}`);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [firmMode, setFirmMode] = useState<'dual' | 'firm1' | 'firm2'>('dual');
  
  // Custom Firm Overrides
  const [firm1Name, setFirm1Name] = useState(firm1.name);
  const [firm1Lic, setFirm1Lic] = useState(firm1.lic_number);
  const [firm1Pan, setFirm1Pan] = useState(firm1.pan_number);
  const [firm1Mobile, setFirm1Mobile] = useState(firm1.mobile);
  const [firm1Proprietor, setFirm1Proprietor] = useState(firm1.proprietor || 'PRO. HIMMAT SINGH');

  const [firm2Name, setFirm2Name] = useState(firm2.name);
  const [firm2Lic, setFirm2Lic] = useState(firm2.lic_number);
  const [firm2Pan, setFirm2Pan] = useState(firm2.pan_number);
  const [firm2Mobile, setFirm2Mobile] = useState(firm2.mobile);
  const [firm2Proprietor, setFirm2Proprietor] = useState(firm2.proprietor || 'PROPRIETOR / PARTNER');

  const [mandiAddress, setMandiAddress] = useState(
    'New Grain Market, Kamalpur / Mehrajwala / Kang Khurd (Pb.)'
  );

  // Recipient
  const [recipientTitle, setRecipientTitle] = useState('ਸੇਵਾ ਵਿਖੇ / To,');
  const [recipientName, setRecipientName] = useState('ਸ਼ਾਖਾ ਪ੍ਰਬੰਧਕ ਸਾਹਿਬ (The Branch Manager),');
  const [recipientAddress, setRecipientAddress] = useState('ਸਟੇਟ ਬੈਂਕ ਆਫ ਇੰਡੀਆ (State Bank of India), ਮੁੱਖ ਬ੍ਰਾਂਚ।');

  // Letter Content
  const [subject, setSubject] = useState('ਵਿਸ਼ਾ: ਕਿਸਾਨ ਦੇ ਖੇਤੀਬਾੜੀ ਖਾਤੇ ਅਤੇ ਫਸਲ ਵਿਕਰੀ ਸਬੰਧੀ ਤਸਦੀਕ ਪੱਤਰ।');
  const [salutation, setSalutation] = useState('ਸ਼੍ਰੀ ਮਾਨ ਜੀ (Respected Sir),');
  const [bodyText, setBodyText] = useState(
    `ਉਪਰੋਕਤ ਵਿਸ਼ੇ ਦੇ ਸਬੰਧ ਵਿੱਚ ਬੇਨਤੀ ਹੈ ਕਿ ਸ. ਮਲਕੀਤ ਸਿੰਘ ਪੁੱਤਰ ਸ. ਹਰਨੇਕ ਸਿੰਘ, ਵਾਸੀ ਪਿੰਡ ਭਦੌੜ ਪਿਛਲੇ ਲੰਬੇ ਸਮੇਂ ਤੋਂ ਸਾਡੀ ਆੜ੍ਹਤ ਦੀ ਦੁਕਾਨ 'ਤੇ ਆਪਣੀ ਹਾੜ੍ਹੀ-ਸਾਉਣੀ ਦੀ ਫਸਲ (ਕਣਕ/ਝੋਨਾ) ਨਿਯਮਿਤ ਰੂਪ ਵਿੱਚ ਵੇਚਦੇ ਆ ਰਹੇ ਹਨ।

ਉਹਨਾਂ ਦਾ ਸਾਡੀ ਫਰਮ ਨਾਲ ਲੈਣ-ਦੇਣ ਅਤੇ ਆਮਦਨ ਰਿਕਾਰਡ ਬਿਲਕੁਲ ਸਾਫ਼-ਸੁਥਰਾ ਅਤੇ ਤਸੱਲੀਬਖ਼ਸ਼ ਹੈ। ਇਹ ਪੱਤਰ ਕਿਸਾਨ ਵੱਲੋਂ ਬੈਂਕ ਲਿਮਿਟ / KCC ਨਵਿਆਉਣ ਹਿੱਤ ਉਹਨਾਂ ਦੀ ਪੁਰਜ਼ੋਰ ਬੇਨਤੀ 'ਤੇ ਜਾਰੀ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ।`
  );
  const [closing, setClosing] = useState('ਆਪ ਜੀ ਦੇ ਵਿਸ਼ਵਾਸਪਾਤਰ (Yours Faithfully),');
  const [signatory1Title, setSignatory1Title] = useState('ਵਾਸਤੇ: ਜੰਮੂ ਟਰੇਡਿੰਗ ਕੰਪਨੀ (For Jammu Trading Co.)');
  const [signatory2Title, setSignatory2Title] = useState('ਵਾਸਤੇ: ਨਿਊ ਜੰਮੂ ਟਰੇਡਿੰਗ ਕੰਪਨੀ (For New Jammu Trading Co.)');
  const [showWatermark, setShowWatermark] = useState(true);
  const [notesFooter, setNotesFooter] = useState(
    'ਨੋਟ: ਇਹ ਪੱਤਰ ਸਿਰਫ ਸਰਕਾਰੀ/ਬੈਂਕ ਕੰਮਾਂ ਲਈ ਹੀ ਵੈਧ ਹੈ। ਸਮੂਹ ਝਗੜੇ ਮੰਡੀ ਕਮੇਟੀ ਦੇ ਅਧਿਕਾਰ ਖੇਤਰ ਅਧੀਨ ਹਨ।'
  );

  // Selected Farmer for Autofill
  const [selectedFarmerId, setSelectedFarmerId] = useState('');

  // Saved Letters History
  const [savedLetters, setSavedLetters] = useState<LetterPadDocument[]>(() => {
    try {
      const saved = localStorage.getItem('kisanmitra_saved_letters');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return [];
  });

  // Handle Farmer Autofill
  const handleFarmerSelect = (farmerId: string) => {
    setSelectedFarmerId(farmerId);
    if (!farmerId) return;

    const farmer = registeredFarmers.find((f) => f.id === farmerId);
    if (!farmer) return;

    const fName = farmer.name_pa || farmer.name_en;
    const fFather = farmer.father_husband_name_pa || farmer.father_husband_name_en || 'ਸ. ...';
    const fVillage = farmer.village_pa || farmer.village_en || '...';
    const fMobile = farmer.mobile_number || '';
    const fBank = farmer.bank_name ? `${farmer.bank_name} (A/c: ${farmer.bank_account})` : '';

    setSubject(`ਵਿਸ਼ਾ: ਕਿਸਾਨ ${fName} ਪੁੱਤਰ ${fFather}, ਪਿੰਡ ${fVillage} ਦੇ ਖਾਤੇ ਸੰਬੰਧੀ ਤਸਦੀਕ ਪੱਤਰ।`);
    setBodyText(
      `ਉਪਰੋਕਤ ਵਿਸ਼ੇ ਦੇ ਸਬੰਧ ਵਿੱਚ ਤਸਦੀਕ ਕੀਤਾ ਜਾਂਦਾ ਹੈ ਕਿ ਕਿਸਾਨ ${fName} ਸਪੁੱਤਰ ${fFather}, ਵਾਸੀ ਪਿੰਡ ${fVillage} (ਮੋਬਾਈਲ: ${fMobile}) ਸਾਡੀ ਆੜ੍ਹਤ ਦੀ ਦੁਕਾਨ 'ਤੇ ਪਿਛਲੇ ਕਈ ਸਾਲਾਂ ਤੋਂ ਨਿਯਮਿਤ ਰੂਪ ਵਿੱਚ ਆਪਣੀ ਫਸਲ (ਕਣਕ/ਝੋਨਾ) ਵੇਚਦੇ ਹਨ।

ਉਹਨਾਂ ਦਾ ਸਾਡੀ ਫਰਮ 'ਤੇ ਖਾਤਾ ਬਿਲਕੁਲ ਸਾਫ਼ ਹੈ ਅਤੇ ਉਹਨਾਂ ਵੱਲ ਸਾਡੀ ਕੋਈ ਵੀ ਦੇਣਦਾਰੀ ਬਕਾਇਆ ਨਹੀਂ ਹੈ। ਇਹ ਸਰਟੀਫਿਕੇਟ ਉਹਨਾਂ ਦੀ ਮੰਗ ਅਨੁਸਾਰ ਸਰਕਾਰੀ/ਬੈਂਕ ਵਰਤੋਂ ਲਈ ਜਾਰੀ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ।`
    );

    if (onToast) {
      onToast('success', `ਕਿਸਾਨ ${fName} ਦਾ ਵੇਰਵਾ ਲੈਟਰ ਪੈਡ ਵਿੱਚ ਭਰਿਆ ਗਿਆ!`);
    }
  };

  // Pre-designed Punjabi Letter Templates
  const handleApplyTemplate = (templateKey: string) => {
    if (templateKey === 'bank_kcc') {
      setSubject('ਵਿਸ਼ਾ: ਕਿਸਾਨ ਦੇ ਖੇਤੀਬਾੜੀ ਖਾਤੇ ਅਤੇ ਫਸਲ ਵਿਕਰੀ ਸੰਬੰਧੀ ਤਸਦੀਕ ਪੱਤਰ (KCC ਲਿਮਿਟ)।');
      setRecipientTitle('ਸੇਵਾ ਵਿਖੇ / To,');
      setRecipientName('ਸ਼ਾਖਾ ਪ੍ਰਬੰਧਕ ਸਾਹਿਬ (The Branch Manager),');
      setRecipientAddress('ਸਟੇਟ ਬੈਂਕ ਆਫ ਇੰਡੀਆ / ਪੰਜਾਬ ਨੈਸ਼ਨਲ ਬੈਂਕ, ਸਥਾਨਕ ਬ੍ਰਾਂਚ।');
      setBodyText(
        `ਉਪਰੋਕਤ ਵਿਸ਼ੇ ਦੇ ਸੰਬੰਧ ਵਿੱਚ ਬੇਨਤੀ ਹੈ ਕਿ ਕਿਸਾਨ ਸ੍ਰੀ ............................ ਪੁੱਤਰ ਸ੍ਰੀ ............................, ਵਾਸੀ ਪਿੰਡ ............................ ਸਾਡੀ ਆੜ੍ਹਤ ਦੀ ਫਰਮ ਰਾਹੀਂ ਪਿਛਲੇ ਲੰਬੇ ਸਮੇਂ ਤੋਂ ਆਪਣੀ ਫਸਲ (ਕਣਕ/ਝੋਨਾ) ਦੀ ਵਿਕਰੀ ਕਰ ਰਹੇ ਹਨ।

ਉਹਨਾਂ ਦਾ ਸਾਡੀ ਫਰਮ ਨਾਲ ਲੈਣ-ਦੇਣ ਬਿਲਕੁਲ ਦਰੁਸਤ ਤੇ ਤਸੱਲੀਬਖ਼ਸ਼ ਹੈ। ਉਹਨਾਂ ਦੀ ਸਾਲਾਨਾ ਫਸਲੀ ਆਮਦਨ ਚੰਗੀ ਹੈ ਅਤੇ ਉਹ ਸਮੇਂ ਦੇ ਪਾਬੰਦ ਹਨ। ਇਹ ਤਸਦੀਕ ਪੱਤਰ ਕਿਸਾਨ ਵੱਲੋਂ ਆਪਣੀ ਬੈਂਕ KCC ਲਿਮਿਟ ਬਣਾਉਣ / ਨਵਿਆਉਣ ਹਿੱਤ ਬੇਨਤੀ 'ਤੇ ਜਾਰੀ ਕੀਤਾ ਗਿਆ ਹੈ।`
      );
    } else if (templateKey === 'noc_clearance') {
      setSubject('ਵਿਸ਼ਾ: ਹਿਸਾਬ-ਕਿਤਾਬ ਕਲੀਅਰੈਂਸ ਅਤੇ ਬੇ-ਬਾਕੀ ਸਰਟੀਫਿਕੇਟ (No Dues / Clearance Certificate)।');
      setRecipientTitle('ਜਿਸ ਦੇ ਵੀ ਸਬੰਧਿਤ ਹੋਵੇ / To Whom It May Concern,');
      setRecipientName('ਸਮੂਹ ਸਬੰਧਿਤ ਅਦਾਰੇ / ਬੈਂਕ / ਮਾਰਕੀਟ ਕਮੇਟੀ,');
      setRecipientAddress('ਮੰਡੀ ਕਮਾਲਪੁਰ / ਮਹਿਰਾਜਵਾਲਾ / ਕੰਗ ਖੁਰਦ।');
      setBodyText(
        `ਇਹ ਤਸਦੀਕ ਕੀਤਾ ਜਾਂਦਾ ਹੈ ਕਿ ਕਿਸਾਨ ............................ ਪੁੱਤਰ ............................, ਵਾਸੀ ਪਿੰਡ ............................ ਦਾ ਸਾਡੀ ਫਰਮ ਨਾਲ ਚੱਲਦਾ ਸਮੁੱਚਾ ਹਿਸਾਬ-ਕਿਤਾਬ ਅਤੇ ਖਾਤਾ ਮਿਤੀ .................... ਤੱਕ ਪੂਰੀ ਤਰ੍ਹਾਂ ਨਿਪਟ ਚੁੱਕਾ ਹੈ।

ਕਿਸਾਨ ਵੱਲ ਸਾਡੀ ਕਿਸੇ ਵੀ ਫਰਮ ਦੀ ਕੋਈ ਵੀ ਰਕਮ ਜਾਂ ਬਕਾਇਆ ਦੇਣਦਾਰੀ ਬਾਕੀ ਨਹੀਂ ਹੈ। ਸਾਡੀ ਫਰਮ ਨੂੰ ਇਹਨਾਂ ਦੇ ਕਿਸੇ ਵੀ ਬੈਂਕ ਕਰਜ਼ੇ ਜਾਂ ਹੋਰ ਵਿੱਤੀ ਕੰਮ ਸੰਬੰਧੀ ਕੋਈ ਇਤਰਾਜ਼ ਨਹੀਂ ਹੈ (NOC)।`
      );
    } else if (templateKey === 'sheller_guarantee') {
      setSubject('ਵਿਸ਼ਾ: ਝੋਨਾ (Paddy) ਦੀ ਲਿਫਟਿੰਗ, ਸ਼ੈਲਰ ਡਿਲਿਵਰੀ ਅਤੇ ਬਾਰਦਾਨਾ ਵਾਪਸੀ ਗਾਰੰਟੀ ਪੱਤਰ।');
      setRecipientTitle('ਸੇਵਾ ਵਿਖੇ / To,');
      setRecipientName('ਮੈਨੇਜਰ / ਖਰੀਦ ਅਧਿਕਾਰੀ ਸਾਹਿਬ,');
      setRecipientAddress('ਪਨਗਰੇਨ / ਮਾਰਕਫੈੱਡ / ਪਨਸਪ / ਐਫ.ਸੀ.ਆਈ. / ਰਾਈਸ ਮਿੱਲ ਸ਼ੈਲਰ।');
      setBodyText(
        `ਸਨਿਮਰ ਬੇਨਤੀ ਹੈ ਕਿ ਸਾਡੀ ਫਰਮ ਵੱਲੋਂ ਖਰੀਦ ਸੀਜ਼ਨ ਦੌਰਾਨ ਅਲਾਟ ਕੀਤੇ ਗਏ ਝੋਨੇ ਦੀ ਲਿਫਟਿੰਗ ਨਿਰਧਾਰਿਤ ਸ਼ੈਲਰ ਵਿਖੇ ਨਿਯਮਾਂ ਅਨੁਸਾਰ ਕਰਵਾਈ ਜਾ ਰਹੀ ਹੈ। 

ਅਸੀਂ ਇਹ ਭਰੋਸਾ ਦਿਵਾਉਂਦੇ ਹਾਂ ਕਿ ਨਿਰਧਾਰਿਤ ਮਾਤਰਾ ਵਿੱਚ ਗੱਟੇ ਅਤੇ ਵਜ਼ਨ ਪੂਰਾ ਪਹੁੰਚਾਇਆ ਜਾਵੇਗਾ ਅਤੇ ਬਾਰਦਾਨੇ ਦਾ ਹਿਸਾਬ ਵੀ ਸਰਕਾਰੀ ਨਿਯਮਾਂ ਮੁਤਾਬਕ ਪੂਰਾ ਕੀਤਾ ਜਾਵੇਗਾ। ਕਿਸੇ ਵੀ ਘਾਟ-ਵਾਧ ਦੀ ਜ਼ਿੰਮੇਵਾਰੀ ਸਾਡੀ ਦੋਵੇਂ ਫਰਮਾਂ ਦੀ ਹੋਵੇਗੀ।`
      );
    } else if (templateKey === 'mandi_gatepass') {
      setSubject('ਵਿਸ਼ਾ: ਮੰਡੀ ਗੇਟ ਪਾਸ ਅਤੇ ਫਸਲ ਲਿਜਾਣ ਦੀ ਮਨਜ਼ੂਰੀ ਪੱਤਰ (Mandi Movement Pass)।');
      setRecipientTitle('ਸੇਵਾ ਵਿਖੇ / To,');
      setRecipientName('ਮੰਡੀ ਸੁਪਰਵਾਈਜ਼ਰ / ਇੰਸਪੈਕਟਰ ਸਾਹਿਬ,');
      setRecipientAddress('ਮਾਰਕੀਟ ਕਮੇਟੀ ਗੇਟ ਬੈਰੀਅਰ।');
      setBodyText(
        `ਬੇਨਤੀ ਹੈ ਕਿ ਟਰੱਕ ਨੰਬਰ .................... ਰਾਹੀਂ ਸਾਡੀ ਫਰਮ ਦਾ ਅਨਾਜ (ਕੁੱਲ ............ ਗੱਟੇ / ............ ਕੁਇੰਟਲ) ਨਿਰਧਾਰਿਤ ਗੁਦਾਮ / ਸ਼ੈਲਰ ਵੱਲ ਭੇਜਿਆ ਜਾ ਰਿਹਾ ਹੈ। 

ਇਸ ਮਾਲ ਦਾ ਨਿਰੀਖਣ ਕਰਕੇ ਗੇਟ ਪਾਸ ਜਾਰੀ ਕਰਨ ਦੀ ਕ੍ਰਿਪਾਲਤਾ ਕੀਤੀ ਜਾਵੇ ਤਾਂ ਜੋ ਗੱਡੀ ਸਮੇਂ ਸਿਰ ਰਵਾਨਾ ਹੋ ਸਕੇ।`
      );
    } else if (templateKey === 'blank') {
      setSubject('ਵਿਸ਼ਾ: ................................................................');
      setRecipientTitle('ਸੇਵਾ ਵਿਖੇ / To,');
      setRecipientName('................................................................');
      setRecipientAddress('................................................................');
      setBodyText('');
    }

    if (onToast) {
      onToast('info', 'ਫਾਰਮੈਟ ਸਫਲਤਾਪੂਰਵਕ ਲਾਗੂ ਕੀਤਾ ਗਿਆ!');
    }
  };

  // Window Print
  const handlePrint = () => {
    window.print();
  };

  // High-Resolution PDF Download using html2canvas + jsPDF
  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const element = printRef.current;
      
      // Render canvas with high scale for vector-like print sharpness
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      const sanitizedRef = refNo.replace(/[/\\?%*:|"<>]/g, '_');
      pdf.save(`Letter_${sanitizedRef}.pdf`);

      if (onToast) {
        onToast('success', `PDF ਸਫਲਤਾਪੂਰਵਕ ਡਾਊਨਲੋਡ ਹੋਈ: Letter_${sanitizedRef}.pdf`);
      }
    } catch (error) {
      console.error('PDF Generation Error:', error);
      if (onToast) {
        onToast('error', 'PDF ਤਿਆਰ ਕਰਨ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ ਪ੍ਰਿੰਟ ਬਟਨ ਵਰਤੋ।');
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Save Letter to Local Storage History
  const handleSaveLetter = () => {
    const newDoc: LetterPadDocument = {
      id: `DOC-${Date.now()}`,
      ref_no: refNo,
      date,
      firm_mode: firmMode,
      firm1_name: firm1Name,
      firm1_lic: firm1Lic,
      firm1_pan: firm1Pan,
      firm1_mobile: firm1Mobile,
      firm1_proprietor: firm1Proprietor,
      firm2_name: firm2Name,
      firm2_lic: firm2Lic,
      firm2_pan: firm2Pan,
      firm2_mobile: firm2Mobile,
      firm2_proprietor: firm2Proprietor,
      mandi_address: mandiAddress,
      recipient_title: recipientTitle,
      recipient_name: recipientName,
      recipient_address: recipientAddress,
      subject,
      salutation,
      body_paragraphs: bodyText.split('\n\n').filter((p) => p.trim().length > 0),
      closing,
      signatory1_title: signatory1Title,
      signatory2_title: signatory2Title,
      show_watermark: showWatermark,
      notes_footer: notesFooter,
      created_at: new Date().toISOString(),
    };

    const updated = [newDoc, ...savedLetters.filter((item) => item.ref_no !== refNo)];
    setSavedLetters(updated);
    try {
      localStorage.setItem('kisanmitra_saved_letters', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }

    if (onToast) {
      onToast('success', `ਲੈਟਰ ${refNo} ਸਫਲਤਾਪੂਰਵਕ ਸੇਵ ਹੋਇਆ!`);
    }
  };

  // Load a Saved Letter
  const handleLoadLetter = (doc: LetterPadDocument) => {
    setRefNo(doc.ref_no);
    setDate(doc.date);
    setFirmMode(doc.firm_mode);
    setFirm1Name(doc.firm1_name);
    setFirm1Lic(doc.firm1_lic);
    setFirm1Pan(doc.firm1_pan);
    setFirm1Mobile(doc.firm1_mobile);
    setFirm1Proprietor(doc.firm1_proprietor);
    setFirm2Name(doc.firm2_name);
    setFirm2Lic(doc.firm2_lic);
    setFirm2Pan(doc.firm2_pan);
    setFirm2Mobile(doc.firm2_mobile);
    setFirm2Proprietor(doc.firm2_proprietor);
    setMandiAddress(doc.mandi_address);
    setRecipientTitle(doc.recipient_title);
    setRecipientName(doc.recipient_name);
    setRecipientAddress(doc.recipient_address);
    setSubject(doc.subject);
    setSalutation(doc.salutation);
    setBodyText(Array.isArray(doc.body_paragraphs) ? doc.body_paragraphs.join('\n\n') : '');
    setClosing(doc.closing);
    setSignatory1Title(doc.signatory1_title);
    setSignatory2Title(doc.signatory2_title);
    setShowWatermark(doc.show_watermark);
    setNotesFooter(doc.notes_footer || '');
    setActiveTab('editor');

    if (onToast) {
      onToast('info', `ਲੈਟਰ ${doc.ref_no} ਲੋਡ ਕੀਤਾ ਗਿਆ।`);
    }
  };

  const handleDeleteSavedLetter = (id: string) => {
    const updated = savedLetters.filter((d) => d.id !== id);
    setSavedLetters(updated);
    try {
      localStorage.setItem('kisanmitra_saved_letters', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
    if (onToast) {
      onToast('info', 'ਸਾਂਭਿਆ ਲੈਟਰ ਹਟਾਇਆ ਗਿਆ।');
    }
  };

  const generateNewRefNo = () => {
    setRefNo(`JTC/${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}/${Math.floor(100 + Math.random() * 900)}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Navigation - Hidden in Print */}
      <div className="print:hidden bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-emerald-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-emerald-950">
                ਦੋਵੇਂ ਫਰਮਾਂ ਦਾ ਸਾਂਝਾ ਲੈਟਰ ਪੈਡ (Dual-Firm Letterhead)
              </span>
              <span className="text-xs text-emerald-300 font-mono">Official Mandi Stationary</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-amber-400" />
              <span>ਮੰਡੀ ਲੈਟਰ ਪੈਡ & ਸਰਟੀਫਿਕੇਟ ਮੇਕਰ</span>
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200">
              ਦੋਵੇਂ ਫਰਮਾਂ: <strong>{firm1.name}</strong> ਅਤੇ <strong>{firm2.name}</strong> ਲਈ ਸਰਕਾਰੀ ਪੱਤਰ, ਕਿਸਾਨ ਤਸਦੀਕ, ਬੈਂਕ ਲਿਮਿਟ ਤੇ ਸ਼ੈਲਰ ਪੱਤਰ ਤਿਆਰ ਕਰੋ।
            </p>
          </div>

          {/* Action Buttons: Print & Download PDF */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-emerald-950 font-bold text-sm shadow-lg transition cursor-pointer"
              title="ਵਿੰਡੋ ਪ੍ਰਿੰਟਰ ਰਾਹੀਂ ਪ੍ਰਿੰਟ ਕਰੋ"
            >
              <Printer className="w-4 h-4" />
              <span>ਪ੍ਰਿੰਟ ਕਰੋ (Print)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-emerald-50 active:scale-95 text-emerald-950 font-bold text-sm shadow-lg transition cursor-pointer disabled:opacity-50"
              title="ਪੀ.ਡੀ.ਐਫ. ਫਾਈਲ ਡਾਊਨਲੋਡ ਕਰੋ"
            >
              {isGeneratingPdf ? (
                <>
                  <div className="w-4 h-4 border-2 border-emerald-950 border-t-transparent rounded-full animate-spin" />
                  <span>PDF ਬਣ ਰਹੀ ਹੈ...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-emerald-700" />
                  <span>PDF ਡਾਊਨਲੋਡ ਕਰੋ</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSaveLetter}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm transition cursor-pointer"
              title="ਇਸ ਲੈਟਰ ਨੂੰ ਡਰਾਫਟ/ਇਤਿਹਾਸ ਵਿੱਚ ਸਾਂਭੋ"
            >
              <Save className="w-4 h-4 text-emerald-300" />
              <span>ਸੇਵ ਡਰਾਫਟ</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mt-5 pt-4 border-t border-emerald-800/80 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'editor'
                  ? 'bg-amber-400 text-emerald-950 shadow'
                  : 'bg-emerald-900/60 text-emerald-200 hover:bg-emerald-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>ਐਡੀਟਰ (Editor Controls)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-amber-400 text-emerald-950 shadow'
                  : 'bg-emerald-900/60 text-emerald-200 hover:bg-emerald-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>ਪ੍ਰੀਵਿਊ ਸ਼ੀਟ (A4 Full View)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-amber-400 text-emerald-950 shadow'
                  : 'bg-emerald-900/60 text-emerald-200 hover:bg-emerald-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>ਸਾਂਭੇ ਹੋਏ ਲੈਟਰ ({savedLetters.length})</span>
            </button>
          </div>

          {/* Quick Info */}
          <div className="text-xs text-emerald-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>A4 ਸਾਈਜ਼, ਉੱਚ ਕੁਆਲਿਟੀ ਪ੍ਰਿੰਟ ਅਤੇ ਵਾਟਰਮਾਰਕ ਸਮੇਤ</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Controls (if in editor mode) & Right Letter Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Controls & Templates (Hidden in Print & Hidden when in preview-only or history tab) */}
        {activeTab === 'editor' && (
          <div className="print:hidden lg:col-span-5 space-y-5">
            {/* Template Selector Card */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>ਤਿਆਰ ਕੀਤੇ ਫਾਰਮੈਟ (Ready Templates)</span>
                </h3>
                <span className="text-[11px] text-gray-500 font-medium">ਇੱਕ ਕਲਿੱਕ ਵਿੱਚ ਭਰੋ</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('bank_kcc')}
                  className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition cursor-pointer"
                >
                  <div className="font-bold text-xs text-gray-900">🏦 ਬੈਂਕ KCC ਲਿਮਿਟ</div>
                  <div className="text-[10px] text-gray-500">ਲਿਮਿਟ ਨਵਿਆਉਣ ਤਸਦੀਕ</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyTemplate('noc_clearance')}
                  className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition cursor-pointer"
                >
                  <div className="font-bold text-xs text-gray-900">✅ ਬੇ-ਬਾਕੀ / NOC</div>
                  <div className="text-[10px] text-gray-500">ਸਾਫ ਹਿਸਾਬ ਕਲੀਅਰੈਂਸ</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyTemplate('sheller_guarantee')}
                  className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition cursor-pointer"
                >
                  <div className="font-bold text-xs text-gray-900">🏭 ਸ਼ੈਲਰ ਡਿਲਿਵਰੀ ਗਾਰੰਟੀ</div>
                  <div className="text-[10px] text-gray-500">ਪੈਡੀ ਤੇ ਬਾਰਦਾਨਾ ਵਾਪਸੀ</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyTemplate('mandi_gatepass')}
                  className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition cursor-pointer"
                >
                  <div className="font-bold text-xs text-gray-900">🚚 ਗੇਟ ਪਾਸ ਸੂਚਨਾ</div>
                  <div className="text-[10px] text-gray-500">ਮੰਡੀ ਬੈਰੀਅਰ ਰਵਾਨਗੀ</div>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleApplyTemplate('blank')}
                className="w-full py-1.5 px-3 rounded-xl border border-dashed border-gray-300 hover:bg-gray-50 text-gray-600 text-xs font-medium text-center transition cursor-pointer"
              >
                ਖਾਲੀ ਲੈਟਰ ਪੈਡ (Blank Sheet - ਨਵੇਂ ਸਿਰੇ ਤੋਂ ਲਿਖੋ)
              </button>
            </div>

            {/* Quick Farmer Autofill */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-200 space-y-3">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>ਕਿਸਾਨ ਦਾ ਵੇਰਵਾ ਭਰੋ (Farmer Autofill)</span>
              </h3>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ਰਜਿਸਟਰਡ ਕਿਸਾਨ ਚੁਣੋ:
                </label>
                <select
                  value={selectedFarmerId}
                  onChange={(e) => handleFarmerSelect(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="">-- ਕਿਸਾਨ ਚੁਣੋ (Select Farmer) --</option>
                  {registeredFarmers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name_pa || f.name_en} {f.father_husband_name_pa ? `(ਪੁੱਤਰ ${f.father_husband_name_pa})` : ''} - ਪਿੰਡ {f.village_pa || f.village_en} [{f.mobile_number}]
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 mt-1">
                  * ਕਿਸਾਨ ਚੁਣਦੇ ਹੀ ਲੈਟਰ ਵਿੱਚ ਨਾਮ, ਪਿਤਾ ਦਾ ਨਾਮ ਤੇ ਪਿੰਡ ਆਟੋਮੈਟਿਕ ਭਰ ਜਾਵੇਗਾ।
                </p>
              </div>
            </div>

            {/* Header Layout Mode & Reference Details */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-200 space-y-4">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600" />
                <span>ਫਰਮ ਸੈਟਿੰਗ (Header & Firm Config)</span>
              </h3>

              {/* Firm Mode Toggle */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  ਲੈਟਰ ਪੈਡ ਉੱਪਰ ਫਰਮਾਂ ਦੀ ਚੋਣ:
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFirmMode('dual')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                      firmMode === 'dual'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ਦੋਵੇਂ ਫਰਮਾਂ (ਸਾਂਝਾ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFirmMode('firm1')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                      firmMode === 'firm1'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ਸਿਰਫ ਫਰਮ 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setFirmMode('firm2')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                      firmMode === 'firm2'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ਸਿਰਫ ਫਰਮ 2
                  </button>
                </div>
              </div>

              {/* Ref No & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700">ਰੈਫਰੈਂਸ ਨੰ. (Ref No):</label>
                    <button
                      type="button"
                      onClick={generateNewRefNo}
                      className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>ਨਵਾਂ</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-2.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">ਮਿਤੀ (Date):</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showWatermark}
                    onChange={(e) => setShowWatermark(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>ਵਾਟਰਮਾਰਕ ਚਿੰਨ੍ਹ ਦਿਖਾਓ (Show Background Watermark)</span>
                </label>
              </div>
            </div>

            {/* Recipient and Content Details */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-200 space-y-4">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                <span>ਪੱਤਰ ਸਮੱਗਰੀ (Letter Body & Recipient)</span>
              </h3>

              {/* Recipient */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700">ਪੱਤਰ ਪ੍ਰਾਪਤਕਰਤਾ (To / Recipient):</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="ਸੇਵਾ ਵਿਖੇ / To"
                    value={recipientTitle}
                    onChange={(e) => setRecipientTitle(e.target.value)}
                    className="rounded-xl border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="ਅਹੁਦਾ / ਸ਼ਾਖਾ ਪ੍ਰਬੰਧਕ ਸਾਹਿਬ"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="rounded-xl border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <input
                  type="text"
                  placeholder="ਸੰਸਥਾ / ਬੈਂਕ ਦਾ ਨਾਮ ਤੇ ਪਤਾ"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ਵਿਸ਼ਾ (Subject):</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-2.5 py-1.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Salutation */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ਸੰਬੋਧਨ (Salutation):</label>
                <input
                  type="text"
                  value={salutation}
                  onChange={(e) => setSalutation(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ਮੁੱਖ ਵਿਸ਼ਾ-ਵਸਤੂ (Main Letter Body):
                </label>
                <textarea
                  rows={6}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="ਲੈਟਰ ਵਿੱਚ ਜੋ ਲਿਖਣਾ ਚਾਹੁੰਦੇ ਹੋ ਇੱਥੇ ਲਿਖੋ..."
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-serif leading-relaxed focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  * ਪੈਰਾ ਬਦਲਣ ਲਈ ਦੋ ਵਾਰ Enter ਦਬਾਓ।
                </p>
              </div>

              {/* Footer Note */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ਹੇਠਲੀ ਨੋਟ ਲਾਈਨ (Footer Note):</label>
                <input
                  type="text"
                  value={notesFooter}
                  onChange={(e) => setNotesFooter(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: Printable Letterhead Preview Sheet (Full width in preview mode or print) */}
        <div className={`w-full ${activeTab === 'editor' ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          
          {/* Printable Letterhead Paper Canvas */}
          <div className="bg-gray-200 print:bg-white p-2 sm:p-4 md:p-6 rounded-2xl print:p-0 print:m-0 flex justify-center">
            
            {/* The Actual A4 Sheet */}
            <div
              id="letterhead-printable"
              ref={printRef}
              className="bg-white text-gray-900 w-full max-w-[210mm] min-h-[297mm] shadow-2xl print:shadow-none p-6 sm:p-10 md:p-12 relative flex flex-col justify-between border border-gray-300 print:border-none print:w-full print:max-w-none print:min-h-0 print:p-8"
              style={{
                fontFamily: "'Noto Sans Gurmukhi', 'Gurmukhi MN', Georgia, serif",
              }}
            >
              {/* Optional Subtle Background Watermark */}
              {showWatermark && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.035] overflow-hidden">
                  <div className="text-center transform -rotate-12">
                    <span className="text-9xl font-black block tracking-widest text-emerald-950">
                      ੴ
                    </span>
                    <span className="text-5xl font-black block tracking-widest text-emerald-950 uppercase mt-4">
                      JAMMU TRADING CO.
                    </span>
                    <span className="text-2xl font-bold block text-emerald-950 mt-1">
                      COMMISSION AGENTS
                    </span>
                  </div>
                </div>
              )}

              {/* ===================== LETTERHEAD TOP SECTION ===================== */}
              <div className="relative z-10 space-y-4">
                
                {/* 1. Religious Inscription Top Center */}
                <div className="text-center border-b border-emerald-900/20 pb-2">
                  <span className="text-xs sm:text-sm font-bold tracking-widest text-emerald-900">
                    ॥ ੴ ਸ੍ਰੀ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫ਼ਤਹਿ ॥
                  </span>
                </div>

                {/* 2. Dual Firm Header Layout */}
                {firmMode === 'dual' && (
                  <div className="grid grid-cols-12 gap-2 sm:gap-4 items-center pb-3 border-b-2 border-emerald-900">
                    {/* Left: Firm 1 (JAMMU TRADING CO.) */}
                    <div className="col-span-5 text-left space-y-0.5">
                      <div className="text-[10px] sm:text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Commission Agent (ਕਮਿਸ਼ਨ ਏਜੰਟ)
                      </div>
                      <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-emerald-950 leading-tight">
                        {firm1Name}
                      </h1>
                      <div className="text-xs font-bold text-emerald-900">
                        ਜੰਮੂ ਟਰੇਡਿੰਗ ਕੰਪਨੀ
                      </div>
                      <div className="text-[10px] text-gray-700 font-medium pt-1 space-y-0.5">
                        <div>
                          ਲਾਈਸੰਸ ਨੰ: <strong className="font-mono">{firm1Lic}</strong>
                        </div>
                        <div>
                          PAN: <strong className="font-mono">{firm1Pan}</strong>
                        </div>
                        <div>
                          ਮੋਬਾਈਲ: <strong className="font-mono">{firm1Mobile}</strong>
                        </div>
                        <div className="text-[9px] text-gray-600 italic">
                          {firm1Proprietor}
                        </div>
                      </div>
                    </div>

                    {/* Center: Mandi Emblem / Logo */}
                    <div className="col-span-2 flex flex-col items-center justify-center text-center px-1">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-amber-600 bg-amber-50 flex items-center justify-center shadow-xs">
                        <span className="text-2xl sm:text-3xl text-emerald-900 font-bold">ੴ</span>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-950 mt-1 uppercase tracking-tighter">
                        ਆੜ੍ਹਤੀਆ
                      </span>
                    </div>

                    {/* Right: Firm 2 (NEW JAMMU TRADING CO.) */}
                    <div className="col-span-5 text-right space-y-0.5">
                      <div className="text-[10px] sm:text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Commission Agent (ਕਮਿਸ਼ਨ ਏਜੰਟ)
                      </div>
                      <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-emerald-950 leading-tight">
                        {firm2Name}
                      </h1>
                      <div className="text-xs font-bold text-emerald-900">
                        ਨਿਊ ਜੰਮੂ ਟਰੇਡਿੰਗ ਕੰਪਨੀ
                      </div>
                      <div className="text-[10px] text-gray-700 font-medium pt-1 space-y-0.5">
                        <div>
                          ਲਾਈਸੰਸ ਨੰ: <strong className="font-mono">{firm2Lic}</strong>
                        </div>
                        <div>
                          PAN: <strong className="font-mono">{firm2Pan}</strong>
                        </div>
                        <div>
                          ਮੋਬਾਈਲ: <strong className="font-mono">{firm2Mobile}</strong>
                        </div>
                        <div className="text-[9px] text-gray-600 italic">
                          {firm2Proprietor}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Single Firm 1 Layout */}
                {firmMode === 'firm1' && (
                  <div className="text-center pb-3 border-b-2 border-emerald-900 space-y-1">
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
                      Mandi Commission Agent & Grain Dealers
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-950">
                      {firm1Name}
                    </h1>
                    <div className="text-sm font-bold text-emerald-900">ਜੰਮੂ ਟਰੇਡਿੰਗ ਕੰਪਨੀ</div>
                    <div className="flex items-center justify-center gap-4 text-xs text-gray-700 pt-1 font-medium">
                      <span>ਲਾਈਸੰਸ ਨੰ: <strong>{firm1Lic}</strong></span>
                      <span>•</span>
                      <span>PAN: <strong>{firm1Pan}</strong></span>
                      <span>•</span>
                      <span>ਮੋਬਾਈਲ: <strong>{firm1Mobile}</strong></span>
                    </div>
                  </div>
                )}

                {/* Single Firm 2 Layout */}
                {firmMode === 'firm2' && (
                  <div className="text-center pb-3 border-b-2 border-emerald-900 space-y-1">
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
                      Mandi Commission Agent & Grain Dealers
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-950">
                      {firm2Name}
                    </h1>
                    <div className="text-sm font-bold text-emerald-900">ਨਿਊ ਜੰਮੂ ਟਰੇਡਿੰਗ ਕੰਪਨੀ</div>
                    <div className="flex items-center justify-center gap-4 text-xs text-gray-700 pt-1 font-medium">
                      <span>ਲਾਈਸੰਸ ਨੰ: <strong>{firm2Lic}</strong></span>
                      <span>•</span>
                      <span>PAN: <strong>{firm2Pan}</strong></span>
                      <span>•</span>
                      <span>ਮੋਬਾਈਲ: <strong>{firm2Mobile}</strong></span>
                    </div>
                  </div>
                )}

                {/* Mandi Address Banner */}
                <div className="text-center bg-emerald-50/80 py-1 px-2 border border-emerald-200 rounded-lg">
                  <p className="text-[11px] sm:text-xs font-bold text-emerald-950">
                    📍 {mandiAddress}
                  </p>
                </div>

                {/* Reference Number & Date Line */}
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-gray-800 pt-2 border-b border-gray-200 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-600">ਰੈਫ਼ਰੈਂਸ ਨੰ. / Ref No:</span>
                    <span className="font-mono font-bold text-emerald-950 underline decoration-dotted">
                      {refNo}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-600">ਮਿਤੀ / Date:</span>
                    <span className="font-bold text-gray-950 font-mono">
                      {date.split('-').reverse().join('/')}
                    </span>
                  </div>
                </div>

                {/* ===================== LETTER CONTENT SECTION ===================== */}
                <div className="pt-4 space-y-4">
                  {/* Recipient Details */}
                  <div className="text-xs sm:text-sm leading-relaxed space-y-0.5">
                    <div className="font-bold text-gray-900">{recipientTitle}</div>
                    <div className="font-bold text-gray-950 pl-3">{recipientName}</div>
                    <div className="text-gray-800 pl-3">{recipientAddress}</div>
                  </div>

                  {/* Subject Line */}
                  <div className="text-xs sm:text-sm font-bold text-gray-950 py-1.5 px-3 bg-gray-50 border-l-4 border-emerald-800 rounded-r-md">
                    {subject}
                  </div>

                  {/* Salutation */}
                  <div className="text-xs sm:text-sm font-semibold text-gray-900">
                    {salutation}
                  </div>

                  {/* Main Paragraphs */}
                  <div className="text-xs sm:text-sm leading-relaxed text-gray-900 space-y-3 whitespace-pre-line text-justify font-serif">
                    {bodyText}
                  </div>

                  {/* Closing */}
                  <div className="pt-3 text-xs sm:text-sm font-semibold text-gray-800">
                    {closing}
                  </div>
                </div>
              </div>

              {/* ===================== SIGNATORY & FOOTER SECTION ===================== */}
              <div className="relative z-10 pt-16 sm:pt-20 space-y-6">
                
                {/* Signatures: Dual Firm Signatures Side by Side */}
                {firmMode === 'dual' ? (
                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                    {/* Jammu Trading Co Signature */}
                    <div className="text-left space-y-1">
                      <div className="text-[11px] sm:text-xs font-bold text-emerald-950">
                        {signatory1Title}
                      </div>
                      <div className="h-16 flex items-end">
                        <div className="border-b border-dashed border-gray-400 w-44 pb-1 text-[10px] text-gray-400 italic">
                          (ਅਧਿਕਾਰਤ ਦਸਤਖ਼ਤ / ਮੋਹਰ)
                        </div>
                      </div>
                      <div className="text-xs font-bold text-gray-900">
                        {firm1Proprietor}
                      </div>
                      <div className="text-[10px] text-gray-600 font-mono">
                        ਲਾਈਸੰਸ: {firm1Lic}
                      </div>
                    </div>

                    {/* New Jammu Trading Co Signature */}
                    <div className="text-right space-y-1 flex flex-col items-end">
                      <div className="text-[11px] sm:text-xs font-bold text-emerald-950">
                        {signatory2Title}
                      </div>
                      <div className="h-16 flex items-end justify-end">
                        <div className="border-b border-dashed border-gray-400 w-44 pb-1 text-[10px] text-gray-400 italic text-right">
                          (ਅਧਿਕਾਰਤ ਦਸਤਖ਼ਤ / ਮੋਹਰ)
                        </div>
                      </div>
                      <div className="text-xs font-bold text-gray-900">
                        {firm2Proprietor}
                      </div>
                      <div className="text-[10px] text-gray-600 font-mono">
                        ਲਾਈਸੰਸ: {firm2Lic}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Single Firm Signature */
                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <div className="text-right space-y-1">
                      <div className="text-xs sm:text-sm font-bold text-emerald-950">
                        {firmMode === 'firm1' ? signatory1Title : signatory2Title}
                      </div>
                      <div className="h-16 flex items-end justify-end">
                        <div className="border-b border-dashed border-gray-400 w-48 pb-1 text-[10px] text-gray-400 italic">
                          (ਅਧਿਕਾਰਤ ਦਸਤਖ਼ਤ / ਮੋਹਰ)
                        </div>
                      </div>
                      <div className="text-xs font-bold text-gray-900">
                        {firmMode === 'firm1' ? firm1Proprietor : firm2Proprietor}
                      </div>
                      <div className="text-[10px] text-gray-600 font-mono">
                        ਲਾਈਸੰਸ: {firmMode === 'firm1' ? firm1Lic : firm2Lic}
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Disclaimer & Mandi Notes */}
                <div className="pt-4 border-t-2 border-emerald-900 text-center space-y-1">
                  <div className="text-[10px] sm:text-[11px] text-gray-700 font-medium">
                    {notesFooter}
                  </div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-widest">
                    JAMMU TRADING CO. &bull; NEW JAMMU TRADING CO. &bull; ALL MANDI KAMALPUR / MEHRAJWALA / KANG KHURD
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>

      {/* SAVED LETTERS / DRAFTS MODAL OR SECTION */}
      {activeTab === 'history' && (
        <div className="print:hidden bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-700" />
                <span>ਸਾਂਭੇ ਹੋਏ ਲੈਟਰਾਂ ਦਾ ਰਿਕਾਰਡ (Saved Letters History)</span>
              </h3>
              <p className="text-xs text-gray-500">
                ਪਹਿਲਾਂ ਤਿਆਰ ਕੀਤੇ ਗਏ ਪੱਤਰਾਂ ਨੂੰ ਦੁਬਾਰਾ ਦੇਖੋ, ਐਡਿਟ ਕਰੋ ਜਾਂ ਪ੍ਰਿੰਟ/PDF ਕਰੋ।
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-700 transition"
            >
              + ਨਵਾਂ ਲੈਟਰ ਲਿਖੋ
            </button>
          </div>

          {savedLetters.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl space-y-3">
              <FileText className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-600">ਅਜੇ ਕੋਈ ਲੈਟਰ ਸੇਵ ਨਹੀਂ ਕੀਤਾ ਗਿਆ।</p>
              <p className="text-xs text-gray-400">
                ਲੈਟਰ ਤਿਆਰ ਕਰਨ ਤੋਂ ਬਾਅਦ "ਸੇਵ ਡਰਾਫਟ" ਬਟਨ ਦਬਾਓ।
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-3">ਰੈਫਰੈਂਸ ਨੰਬਰ</th>
                    <th className="p-3">ਮਿਤੀ</th>
                    <th className="p-3">ਪ੍ਰਾਪਤਕਰਤਾ</th>
                    <th className="p-3">ਵਿਸ਼ਾ</th>
                    <th className="p-3">ਫਰਮ ਮੋਡ</th>
                    <th className="p-3 text-right">ਕਾਰਵਾਈ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {savedLetters.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition">
                      <td className="p-3 font-mono font-bold text-emerald-900">
                        {doc.ref_no}
                      </td>
                      <td className="p-3 font-mono">{doc.date}</td>
                      <td className="p-3 font-medium text-gray-900 max-w-[150px] truncate">
                        {doc.recipient_name}
                      </td>
                      <td className="p-3 text-gray-700 max-w-[250px] truncate">
                        {doc.subject}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {doc.firm_mode === 'dual' ? 'ਦੋਵੇਂ ਫਰਮਾਂ' : doc.firm_mode}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleLoadLetter(doc)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-600 transition cursor-pointer"
                          >
                            ਓਪਨ ਕਰੋ
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSavedLetter(doc.id)}
                            className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="ਹਟਾਓ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
