import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FarmerMaster, LinkedFarmer } from '../types/mandi';
import { transliterateToPunjabi } from '../lib/transliterate';
import { 
  UserPlus, 
  Users, 
  Trash2, 
  Plus, 
  ShieldAlert, 
  CheckCircle2, 
  X, 
  Sparkles,
  Lock,
  Camera,
  Upload,
  RotateCcw,
  User as UserIcon
} from 'lucide-react';

interface FarmerRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveFarmer: (farmer: FarmerMaster) => void;
  existingFarmers: FarmerMaster[];
  editingFarmer?: FarmerMaster | null;
}

export const FarmerRegisterModal: React.FC<FarmerRegisterModalProps> = ({
  isOpen,
  onClose,
  onSaveFarmer,
  existingFarmers,
  editingFarmer,
}) => {
  const [nameEn, setNameEn] = useState('');
  const [namePa, setNamePa] = useState('');
  const [fatherEn, setFatherEn] = useState('');
  const [fatherPa, setFatherPa] = useState('');
  const [villageEn, setVillageEn] = useState('');
  const [villagePa, setVillagePa] = useState('');
  const [mobile, setMobile] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [linkedFarmers, setLinkedFarmers] = useState<LinkedFarmer[]>([]);

  // Camera capture states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Duplicate error state
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      alert('ਕੈਮਰਾ ਚਾਲੂ ਕਰਨ ਵਿੱਚ ਦਿੱਕਤ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ ਕੈਮਰਾ ਪਰਮਿਸ਼ਨ ਚੈੱਕ ਕਰੋ ਜਾਂ ਫਾਈਲ ਅੱਪਲੋਡ ਵਰਤੋ।');
      setIsCameraActive(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoUrl(dataUrl);
    }
    stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    if (editingFarmer) {
      setNameEn(editingFarmer.name_en || '');
      setNamePa(editingFarmer.name_pa || '');
      setFatherEn(editingFarmer.father_husband_name_en || '');
      setFatherPa(editingFarmer.father_husband_name_pa || '');
      setVillageEn(editingFarmer.village_en || '');
      setVillagePa(editingFarmer.village_pa || '');
      setMobile(editingFarmer.mobile_number || '');
      setAadhaar(editingFarmer.aadhaar_number || '');
      setPhotoUrl(editingFarmer.photo_url || '');
      setBankAccount(editingFarmer.bank_account || '');
      setIfscCode(editingFarmer.ifsc_code || '');
      setBankName(editingFarmer.bank_name || '');
      setLinkedFarmers(editingFarmer.linked_farmers || []);
    } else {
      setNameEn('');
      setNamePa('');
      setFatherEn('');
      setFatherPa('');
      setVillageEn('');
      setVillagePa('');
      setMobile('');
      setAadhaar('');
      setPhotoUrl('');
      setBankAccount('');
      setIfscCode('');
      setBankName('');
      setLinkedFarmers([]);
    }
    setDuplicateError(null);
    stopCamera();
  }, [editingFarmer, isOpen, stopCamera]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Auto-transliterate Name En -> Pa
  const handleNameEnChange = async (val: string) => {
    setNameEn(val);
    if (val.trim()) {
      const pa = await transliterateToPunjabi(val);
      setNamePa(pa);
    } else {
      setNamePa('');
    }
  };

  // Auto-transliterate Father En -> Pa
  const handleFatherEnChange = async (val: string) => {
    setFatherEn(val);
    if (val.trim()) {
      const pa = await transliterateToPunjabi(val);
      setFatherPa(pa);
    } else {
      setFatherPa('');
    }
  };

  // Auto-transliterate Village En -> Pa
  const handleVillageEnChange = async (val: string) => {
    setVillageEn(val);
    if (val.trim()) {
      const pa = await transliterateToPunjabi(val);
      setVillagePa(pa);
    } else {
      setVillagePa('');
    }
  };

  // Aadhaar normalization & Duplicate check
  const cleanAadhaar = (val: string) => val.replace(/[^0-9]/g, '').slice(0, 12);

  const checkAadhaarDuplicates = (newAadhaar: string, currentFarmerId?: string) => {
    const target = cleanAadhaar(newAadhaar);
    if (target.length !== 12) return null;

    for (const f of existingFarmers) {
      if (currentFarmerId && f.id === currentFarmerId) continue;

      if (cleanAadhaar(f.aadhaar_number) === target) {
        return `Aadhaar Card duplicate: Already registered to Main Farmer "${f.name_en} (${f.name_pa})" from Pind ${f.village_en}!`;
      }

      for (const lf of f.linked_farmers || []) {
        if (cleanAadhaar(lf.aadhaar_number) === target) {
          return `Aadhaar Card duplicate: Already registered to Linked Farmer "${lf.name_en} (${lf.name_pa})" under ${f.name_en}!`;
        }
      }
    }
    return null;
  };

  const handleAadhaarChange = (val: string) => {
    const cleaned = cleanAadhaar(val);
    setAadhaar(cleaned);

    if (cleaned.length === 12) {
      const err = checkAadhaarDuplicates(cleaned, editingFarmer?.id);
      setDuplicateError(err);
    } else {
      setDuplicateError(null);
    }
  };

  // Linked Farmer Handlers
  const handleAddLinkedFarmer = () => {
    const newLinked: LinkedFarmer = {
      id: `LF-${Date.now().toString().slice(-5)}`,
      name_en: '',
      name_pa: '',
      father_husband_name_en: '',
      father_husband_name_pa: '',
      village_en: villageEn.trim() || '',
      village_pa: villagePa.trim() || '',
      relation: 'Joint Partner (ਹਿੱਸੇਦਾਰ)',
      mobile_number: '',
      aadhaar_number: '',
    };
    setLinkedFarmers((prev) => [...prev, newLinked]);
  };

  const handleCopyVillageToLinked = (id: string) => {
    setLinkedFarmers((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            village_en: villageEn.trim(),
            village_pa: villagePa.trim(),
          };
        }
        return item;
      })
    );
  };

  const handleRemoveLinkedFarmer = (id: string) => {
    setLinkedFarmers((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateLinkedFarmer = async (
    id: string,
    field: keyof LinkedFarmer,
    value: string
  ) => {
    setLinkedFarmers((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );

    if (field === 'name_en') {
      const pa = await transliterateToPunjabi(value);
      setLinkedFarmers((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            return { ...item, name_pa: pa };
          }
          return item;
        })
      );
    }

    if (field === 'father_husband_name_en') {
      const pa = await transliterateToPunjabi(value);
      setLinkedFarmers((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            return { ...item, father_husband_name_pa: pa };
          }
          return item;
        })
      );
    }

    if (field === 'village_en') {
      const pa = await transliterateToPunjabi(value);
      setLinkedFarmers((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            return { ...item, village_pa: pa };
          }
          return item;
        })
      );
    }

    if (field === 'aadhaar_number') {
      const cleaned = cleanAadhaar(value);
      if (cleaned.length === 12) {
        if (cleaned === cleanAadhaar(aadhaar)) {
          setDuplicateError(`Linked farmer Aadhaar cannot be same as Main Farmer's Aadhaar!`);
          return;
        }
        const err = checkAadhaarDuplicates(cleaned, editingFarmer?.id);
        setDuplicateError(err);
      } else {
        setDuplicateError(null);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameEn.trim() && !namePa.trim()) {
      alert('Please enter Farmer Name in English or Punjabi.');
      return;
    }

    if (!villageEn.trim() && !villagePa.trim()) {
      alert('Please enter Village (ਪਿੰਡ).');
      return;
    }

    if (aadhaar.trim().length === 12) {
      const err = checkAadhaarDuplicates(aadhaar, editingFarmer?.id);
      if (err) {
        setDuplicateError(err);
        return;
      }
    }

    for (const lf of linkedFarmers) {
      if (lf.aadhaar_number.trim().length === 12) {
        const err = checkAadhaarDuplicates(lf.aadhaar_number, editingFarmer?.id);
        if (err) {
          setDuplicateError(err);
          return;
        }
      }
    }

    const farmerToSave: FarmerMaster = {
      id: editingFarmer ? editingFarmer.id : `FR-${Date.now().toString().slice(-6)}`,
      name_en: nameEn.trim(),
      name_pa: namePa.trim() || nameEn.trim(),
      father_husband_name_en: fatherEn.trim(),
      father_husband_name_pa: fatherPa.trim() || fatherEn.trim(),
      village_en: villageEn.trim(),
      village_pa: villagePa.trim() || villageEn.trim(),
      mobile_number: mobile.trim(),
      aadhaar_number: aadhaar.trim(),
      photo_url: photoUrl || undefined,
      bank_account: bankAccount.trim(),
      ifsc_code: ifscCode.trim(),
      bank_name: bankName.trim(),
      linked_farmers: linkedFarmers,
      created_at: editingFarmer ? editingFarmer.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSaveFarmer(farmerToSave);
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-gray-200 overflow-hidden text-gray-900 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white px-6 py-4 flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-800/80 rounded-xl text-amber-300">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {editingFarmer ? 'ਸੋਧੋ: ਕਿਸਾਨ ਖਾਤਾ (Edit Farmer Register)' : 'ਨਵਾਂ ਕਿਸਾਨ ਰਜਿਸਟਰ ਕਰੋ (Register New Farmer)'}
              </h3>
              <p className="text-xs text-emerald-200">
                ਫੋਟੋ ਕੈਮਰਾ/ਅੱਪਲੋਡ • English ਤੋਂ Punjabi ਆਪੇ • ਆਧਾਰ ਡੁਪਲੀਕੇਟ ਰੋਕਥਾਮ • Multi ਲਿੰਕਡ ਮੈਂਬਰ
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-emerald-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          
          {/* Duplicate Aadhaar Alert Banner */}
          {duplicateError && (
            <div className="bg-rose-50 border-2 border-rose-400 rounded-xl p-4 flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-rose-900">
                  Duplicate Aadhaar Card Blocked! (ਡੁਪਲੀਕੇਟ ਆਧਾਰ ਕਾਰਡ ਰੋਕਿਆ ਗਿਆ)
                </h4>
                <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                  {duplicateError}
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Farmer Photo (Camera + Upload) */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
            {/* Avatar Preview */}
            <div className="relative w-24 h-24 rounded-2xl border-2 border-emerald-300 overflow-hidden bg-white flex items-center justify-center shadow-xs flex-shrink-0">
              {photoUrl ? (
                <img src={photoUrl} alt="Farmer" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-12 h-12 text-emerald-300" />
              )}
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <span className="text-xs font-bold text-emerald-950 block">
                ਕਿਸਾਨ ਦੀ ਫੋਟੋ (Farmer Photo - Camera or Upload):
              </span>
              <p className="text-[11px] text-gray-500">
                ਕੈਮਰੇ ਨਾਲ ਲਾਈਵ ਫੋਟੋ ਖਿੱਚੋ ਜਾਂ ਫੋਨ/ਕੰਪਿਊਟਰ ਵਿੱਚੋਂ ਅੱਪਲੋਡ ਕਰੋ
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                {!isCameraActive ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Live Camera (ਕੈਮਰਾ ਚਾਲੂ ਕਰੋ)</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold animate-pulse cursor-pointer shadow-xs"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Take Photo (ਫੋਟੋ ਖਿੱਚੋ)</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Upload File (ਗੈਲਰੀ ਵਿੱਚੋਂ ਚੁਣੋ)</span>
                </button>

                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 cursor-pointer"
                  >
                    Remove Photo
                  </button>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Camera Video Viewfinder when camera active */}
              {isCameraActive && (
                <div className="mt-3 relative rounded-xl overflow-hidden border-2 border-emerald-500 bg-black max-w-xs">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-44 object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Main Farmer Details */}
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-emerald-200">
              <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-700 text-white text-xs flex items-center justify-center">1</span>
                Main Farmer Details (ਮੁੱਖ ਕਿਸਾਨ ਦਾ ਵੇਰਵਾ)
              </h4>
              <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-emerald-200">
                <Sparkles className="w-3 h-3 text-amber-500" /> Auto-Transliteration Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Farmer Name in English *
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => handleNameEnChange(e.target.value)}
                  placeholder="e.g. Malkit Singh"
                  required
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-medium focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-emerald-900 font-semibold mb-1 flex items-center justify-between">
                  <span>ਕਿਸਾਨ ਦਾ ਨਾਮ (ਪੰਜਾਬੀ)</span>
                  <span className="text-[10px] text-emerald-600 font-normal">ਆਪੇ ਬਣੇਗਾ</span>
                </label>
                <input
                  type="text"
                  value={namePa}
                  onChange={(e) => setNamePa(e.target.value)}
                  placeholder="ਉਦਾਹਰਨ: ਮਲਕੀਤ ਸਿੰਘ"
                  className="w-full bg-emerald-50/60 border border-emerald-300 rounded-lg px-3 py-2 text-emerald-950 font-bold focus:border-emerald-600 focus:outline-none font-sans"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Mobile Number (ਮੋਬਾਈਲ ਨੰਬਰ)
                </label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                  placeholder="10 Digits"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-mono focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Father / Husband Name (English)
                </label>
                <input
                  type="text"
                  value={fatherEn}
                  onChange={(e) => handleFatherEnChange(e.target.value)}
                  placeholder="e.g. Harnek Singh"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-emerald-900 font-semibold mb-1 flex items-center justify-between">
                  <span>ਪਿਤਾ / ਪਤੀ ਦਾ ਨਾਮ (ਪੰਜਾਬੀ)</span>
                  <span className="text-[10px] text-emerald-600 font-normal">ਆਪੇ ਬਣੇਗਾ</span>
                </label>
                <input
                  type="text"
                  value={fatherPa}
                  onChange={(e) => setFatherPa(e.target.value)}
                  placeholder="ਉਦਾਹਰਨ: ਹਰਨੇਕ ਸਿੰਘ"
                  className="w-full bg-emerald-50/60 border border-emerald-300 rounded-lg px-3 py-2 text-emerald-950 font-medium focus:border-emerald-600 focus:outline-none font-sans"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1 flex items-center justify-between">
                  <span>Aadhaar Card No. (ਆਧਾਰ ਕਾਰਡ) *</span>
                  <span className="text-[10px] text-rose-600 font-bold flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" /> Duplicate Stop
                  </span>
                </label>
                <input
                  type="text"
                  value={aadhaar}
                  onChange={(e) => handleAadhaarChange(e.target.value)}
                  placeholder="12 Digit Aadhaar"
                  maxLength={12}
                  className={`w-full bg-white border rounded-lg px-3 py-2 font-mono font-bold focus:outline-none ${
                    duplicateError && duplicateError.includes('Main Farmer')
                      ? 'border-rose-500 bg-rose-50 text-rose-900'
                      : aadhaar.length === 12
                      ? 'border-emerald-500 text-emerald-900'
                      : 'border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Village / Pind in English *
                </label>
                <input
                  type="text"
                  value={villageEn}
                  onChange={(e) => handleVillageEnChange(e.target.value)}
                  placeholder="e.g. Bhadaur"
                  required
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-medium focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-emerald-900 font-semibold mb-1 flex items-center justify-between">
                  <span>ਪਿੰਡ (ਪੰਜਾਬੀ)</span>
                  <span className="text-[10px] text-emerald-600 font-normal">ਆਪੇ ਬਣੇਗਾ</span>
                </label>
                <input
                  type="text"
                  value={villagePa}
                  onChange={(e) => setVillagePa(e.target.value)}
                  placeholder="ਉਦਾਹਰਨ: ਭਦੌੜ"
                  className="w-full bg-emerald-50/60 border border-emerald-300 rounded-lg px-3 py-2 text-emerald-950 font-bold focus:border-emerald-600 focus:outline-none font-sans"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Bank Account No. (ਖਾਤਾ ਨੰਬਰ)
                </label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="Account Number"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-mono focus:border-emerald-600 focus:outline-none"
                />
              </div>

            </div>
          </div>

          {/* Section 3: Multi Linked Farmers */}
          <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-2 border-b border-amber-200">
              <div>
                <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center">2</span>
                  Linked Family & Joint Farmers (ਜੁੜੇ ਹੋਏ ਹਿੱਸੇਦਾਰ ਤੇ ਪਰਿਵਾਰਕ ਕਿਸਾਨ)
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  ਜਿੰਨੇ ਮਰਜ਼ੀ ਕਿਸਾਨ ਲਿੰਕ ਕਰੋ — ਖਰੀਦ ਤੇ ਜੇ-ਫਾਰਮ ਕੱਟਣ ਵੇਲੇ ਇਹਨਾਂ ਦੇ ਨਾਮ ਚੁਣੇ ਜਾ ਸਕਣਗੇ
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddLinkedFarmer}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Linked Farmer (ਹੋਰ ਕਿਸਾਨ ਜੋੜੋ)</span>
              </button>
            </div>

            {linkedFarmers.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-amber-200 rounded-xl text-xs text-amber-700">
                <Users className="w-8 h-8 mx-auto mb-1 text-amber-400" />
                <p className="font-semibold">ਕੋਈ ਲਿੰਕਡ ਕਿਸਾਨ ਨਹੀਂ ਜੋੜਿਆ ਗਿਆ।</p>
              </div>
            ) : (
              <div className="space-y-4">
                {linkedFarmers.map((lf, idx) => (
                  <div
                    key={lf.id}
                    className="bg-white border-2 border-amber-300 rounded-xl p-4 sm:p-5 shadow-xs relative space-y-3.5"
                  >
                    {/* Header bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-amber-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-amber-950 bg-amber-200/80 px-2.5 py-1 rounded-md">
                          #{idx + 1} Linked Member / ਹਿੱਸੇਦਾਰ
                        </span>
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {lf.relation}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyVillageToLinked(lf.id)}
                          className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-300 transition-colors cursor-pointer"
                          title="Copy village from main farmer"
                        >
                          📍 ਮੁੱਖ ਕਿਸਾਨ ਵਾਲਾ ਪਿੰਡ ਭਰੋ (Copy Village)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveLinkedFarmer(lf.id)}
                          className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove Linked Farmer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Row 1: Name & Relation */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-gray-700 font-bold mb-1">
                          Member Name (English) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={lf.name_en}
                          onChange={(e) => handleUpdateLinkedFarmer(lf.id, 'name_en', e.target.value)}
                          placeholder="e.g. Jaspreet Kaur"
                          className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-semibold focus:border-amber-600 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-amber-950 font-bold mb-1">
                          ਮੈਂਬਰ ਦਾ ਨਾਮ (ਪੰਜਾਬੀ ਆਪੇ ਬਣੇਗਾ)
                        </label>
                        <input
                          type="text"
                          value={lf.name_pa}
                          onChange={(e) => handleUpdateLinkedFarmer(lf.id, 'name_pa', e.target.value)}
                          placeholder="ਜਸਪ੍ਰੀਤ ਕੌਰ"
                          className="w-full bg-amber-50/50 border border-amber-300 rounded-lg px-2.5 py-1.5 text-amber-950 font-bold focus:border-amber-600 focus:outline-none font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold mb-1">
                          ਰਿਸ਼ਤਾ / ਹਿੱਸੇਦਾਰੀ (Relation)
                        </label>
                        <select
                          value={lf.relation}
                          onChange={(e) => handleUpdateLinkedFarmer(lf.id, 'relation', e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-semibold focus:border-amber-600 focus:outline-none cursor-pointer"
                        >
                          <option value="Joint Partner (ਹਿੱਸੇਦਾਰ)">Joint Partner (ਹਿੱਸੇਦਾਰ)</option>
                          <option value="Son (ਪੁੱਤਰ)">Son (ਪੁੱਤਰ)</option>
                          <option value="Brother (ਭਰਾ)">Brother (ਭਰਾ)</option>
                          <option value="Wife (ਪਤਨੀ)">Wife (ਪਤਨੀ)</option>
                          <option value="Father (ਪਿਤਾ)">Father (ਪਿਤਾ)</option>
                          <option value="Mother (ਮਾਤਾ)">Mother (ਮਾਤਾ)</option>
                          <option value="Daughter (ਧੀ)">Daughter (ਧੀ)</option>
                          <option value="Family Member (ਪਰਿਵਾਰਕ ਮੈਂਬਰ)">Family Member (ਪਰਿਵਾਰਕ ਮੈਂਬਰ)</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    {/* Row 2: Father / Husband Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-amber-50/40 p-2.5 rounded-lg border border-amber-200">
                      <div>
                        <label className="block text-gray-700 font-bold mb-1">
                          Father / Husband Name (English)
                        </label>
                        <input
                          type="text"
                          value={lf.father_husband_name_en || ''}
                          onChange={(e) => handleUpdateLinkedFarmer(lf.id, 'father_husband_name_en', e.target.value)}
                          placeholder="e.g. Malkit Singh / Harnek Singh"
                          className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 focus:border-amber-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-amber-950 font-bold mb-1">
                          ਪਿਤਾ / ਪਤੀ ਦਾ ਨਾਮ (ਪੰਜਾਬੀ ਆਪੇ ਬਣੇਗਾ)
                        </label>
                        <input
                          type="text"
                          value={lf.father_husband_name_pa || ''}
                          onChange={(e) => handleUpdateLinkedFarmer(lf.id, 'father_husband_name_pa', e.target.value)}
                          placeholder="ਮਲਕੀਤ ਸਿੰਘ"
                          className="w-full bg-amber-50/50 border border-amber-300 rounded-lg px-2.5 py-1.5 text-amber-950 font-bold focus:border-amber-600 focus:outline-none font-sans"
                        />
                      </div>
                    </div>

                    {/* Row 3: Village / Pind */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-emerald-50/30 p-2.5 rounded-lg border border-emerald-200">
                      <div>
                        <label className="block text-gray-700 font-bold mb-1">
                          Village / Address (English)
                        </label>
                        <input
                          type="text"
                          value={lf.village_en || ''}
                          onChange={(e) => handleUpdateLinkedFarmer(lf.id, 'village_en', e.target.value)}
                          placeholder="e.g. Bhadaur / Barnala"
                          className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 focus:border-emerald-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-emerald-950 font-bold mb-1">
                          ਪਿੰਡ / ਪਤਾ (ਪੰਜਾਬੀ ਆਪੇ ਬਣੇਗਾ)
                        </label>
                        <input
                          type="text"
                          value={lf.village_pa || ''}
                          onChange={(e) => handleUpdateLinkedFarmer(lf.id, 'village_pa', e.target.value)}
                          placeholder="ਭਦੌੜ"
                          className="w-full bg-emerald-50/50 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-emerald-950 font-bold focus:border-emerald-600 focus:outline-none font-sans"
                        />
                      </div>
                    </div>

                    {/* Row 4: Mobile, Aadhaar & Bank */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-gray-700 font-bold mb-1">
                          Mobile Number (ਮੋਬਾਈਲ)
                        </label>
                        <input
                          type="tel"
                          value={lf.mobile_number}
                          onChange={(e) => handleUpdateLinkedFarmer(lf.id, 'mobile_number', e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                          placeholder="10 ਅੰਕ ਮੋਬਾਈਲ ਨੰਬਰ"
                          maxLength={10}
                          className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-mono font-bold focus:border-amber-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                          <span>Aadhaar Card (ਆਧਾਰ ਨੰਬਰ)</span>
                          <span className="text-[10px] text-rose-600 font-bold">12 Digits</span>
                        </label>
                        <input
                          type="text"
                          value={lf.aadhaar_number}
                          onChange={(e) => handleUpdateLinkedFarmer(lf.id, 'aadhaar_number', e.target.value)}
                          placeholder="12 Digit Aadhaar Card"
                          maxLength={12}
                          className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-mono font-bold focus:border-amber-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold mb-1">
                          Bank Account / IFSC (ਖਾਤਾ ਨੰਬਰ)
                        </label>
                        <input
                          type="text"
                          value={lf.bank_account || ''}
                          onChange={(e) => handleUpdateLinkedFarmer(lf.id, 'bank_account', e.target.value)}
                          placeholder="Account No. / IFSC"
                          className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-mono focus:border-amber-600 focus:outline-none"
                        />
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-gray-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Registered farmers with photo appear across all modules</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="w-full sm:w-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={Boolean(duplicateError)}
                className="w-full sm:w-auto px-6 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                {editingFarmer ? 'ਸੋਧਿਆ ਖਾਤਾ ਸੇਵ ਕਰੋ (Update Farmer)' : 'ਕਿਸਾਨ ਦਰਜ ਕਰੋ (Save Farmer)'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
