import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  RotateCcw, 
  Volume2, 
  Languages, 
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface VoiceTextInputStudioProps {
  onProcess: (text: string) => Promise<void>;
  isLoading: boolean;
}

const PRESET_MANDI_EXAMPLES = [
  {
    title: '🌾 ਝੋਨਾ (Paddy PR-126) - ਪਨਗਰੇਨ ਖਰੀਦ',
    lang: 'ਪੰਜਾਬੀ (ਗੁਰਮੁਖੀ)',
    text: 'ਮਲਕੀਤ ਸਿੰਘ ਪੁੱਤਰ ਹਰਨੇਕ ਸਿੰਘ ਪਿੰਡ ਭਦੌੜ, ਮੋਬਾਈਲ 9876543210. ਝੋਨਾ (PR-126) 450 ਗੱਟੇ ਆਏ, ਕੁੱਲ ਵਜ਼ਨ 168.75 ਕੁਇੰਟਲ, ਸਰਕਾਰੀ ਭਾਅ 2320 ਰੁਪਏ। ਖਰੀਦਦਾਰ ਏਜੰਸੀ ਪਨਗਰੇਨ (Pungrain)। ਬਾਰਦਾਨਾ 450 ਸਰਕਾਰ ਤੋਂ ਮਿਲਿਆ ਤੇ 450 ਕਿਸਾਨ ਨੂੰ ਜਾਰੀ ਕੀਤਾ। ਲਿਫਟਿੰਗ 200 ਗੱਟੇ ਟਰੱਕ ਰਾਹੀਂ ਹੋ ਗਈ, 250 ਗੱਟੇ ਫੜ੍ਹ ਵਿੱਚ ਬਾਕੀ ਹਨ। ਪੱਲੇਦਾਰੀ 14 ਰੁਪਏ ਪ੍ਰਤੀ ਗੱਟਾ, 6 ਮਜ਼ਦੂਰ ਲੱਗੇ ਹੋਏ ਹਨ। ਪੁਰਾਣਾ ਬਕਾਇਆ ਖਾਤੇ ਚ 25,000 ਰੁਪਏ ਸੀ, ਪੇਸ਼ਗੀ 50,000 ਰੁਪਏ ਨਕਦ ਦਿੱਤੀ। ਬਿੱਲ ਜਸਪ੍ਰੀਤ ਕੌਰ ਦੇ ਨਾਮ ਕੱਟਣਾ।',
  },
  {
    title: '🌽 ਮੱਕੀ (Maize) - ਮਾਰਕਫੈੱਡ ਖਰੀਦ',
    lang: 'Roman / Hinglish',
    text: 'Baldev Singh s/o Gurmel Singh pind Barnala phone 9814012345. Makki 320 bags weight 128 quintal, rate 2150. Agency Markfed. Bardana issued 320 bags from warehouse stock. Lifting 320 bags done today in truck PB-19-M-4421. Palledari 12 rs per bag with 4 laborers. Purana udhar 15000 rs, advance cash paid 20000. J-form billed to Harpreet Singh.',
  },
  {
    title: '🌾 ਕਣਕ (Wheat) - FCI ਖਰੀਦ ਤੇ ਪੁਰਾਣਾ ਖਾਤਾ',
    lang: 'ਪੰਜਾਬੀ (ਗੁਰਮੁਖੀ)',
    text: 'ਕਿਸਾਨ ਗੁਰਮੀਤ ਸਿੰਘ ਪੁੱਤਰ ਜਗਤਾਰ ਸਿੰਘ ਪਿੰਡ ਮਹਿਰਾਜ, ਮੋਬਾਈਲ 9888123456. ਕਣਕ 600 ਬੋਰੀਆਂ, ਵਜ਼ਨ 300 ਕੁਇੰਟਲ, ਐਮ.ਐਸ.ਪੀ ਭਾਅ 2425 ਰੁਪਏ। ਖਰੀਦਦਾਰ FCI (ਭਾਰਤੀ ਖੁਰਾਕ ਨਿਗਮ)। ਬਾਰਦਾਨਾ 600 ਬੋਰੀਆਂ ਮਿਲੀਆਂ ਤੇ ਸਾਰੀਆਂ ਵਰਤੀਆਂ। ਲਿਫਟਿੰਗ 600 ਬੋਰੀਆਂ ਮੁਕੰਮਲ ਹੋ ਗਈਆਂ ਹਨ। ਪੱਲੇਦਾਰੀ 15 ਰੁਪਏ ਪ੍ਰਤੀ ਬੋਰੀ, 8 ਮਜ਼ਦੂਰ। ਪੁਰਾਣਾ ਲੈਣਾ-ਦੇਣਾ 40,000 ਰੁਪਏ ਸੀ ਅਤੇ ਕਿਸਾਨ ਨੂੰ ਨਵਾਂ ਐਡਵਾਂਸ 1,00,000 ਰੁਪਏ ਦਿੱਤਾ। ਜੇ-ਫਾਰਮ ਗੁਰਮੀਤ ਸਿੰਘ ਦੇ ਆਪਣੇ ਨਾਮ ਹੀ ਬਣੇਗਾ।',
  },
  {
    title: '🍚 ਬਾਸਮਤੀ 1121 - ਪ੍ਰਾਈਵੇਟ ਰਾਈਸ ਮਿੱਲਰ ਬੋਲੀ',
    lang: 'Mixed Punjabi/English',
    text: 'Sardar Jagjit Singh pind Kotkapura, mob 9417088990. Basmati 1121 inward 280 bags, weight 112 quintal, open auction rate 3850 rs per quintal. Purchaser Guru Nanak Rice Mills (Private Miller). Bardana 280 issued from arhtia stock. Lifting pending 280 bags in yard. Palledari 16 rs per bag. No old balance (0 rs), advance paid 1,50,000 rs through RTGS. J form billed to son Amanpreet Singh.',
  },
];

export const VoiceTextInputStudio: React.FC<VoiceTextInputStudioProps> = ({
  onProcess,
  isLoading,
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState<'pa-IN' | 'hi-IN' | 'en-IN'>('pa-IN');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [liveTranscriptStatus, setLiveTranscriptStatus] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = speechLanguage;

    recognition.onresult = (event: any) => {
      let currentInterim = '';
      let finalSpeech = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalSpeech += event.results[i][0].transcript + ' ';
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }

      if (finalSpeech) {
        setInputText((prev) => (prev ? `${prev.trim()} ${finalSpeech.trim()}` : finalSpeech.trim()));
      }
      setLiveTranscriptStatus(currentInterim || 'Listening...');
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition status:', event.error);
      setIsRecording(false);
      setLiveTranscriptStatus('');
    };

    recognition.onend = () => {
      setIsRecording(false);
      setLiveTranscriptStatus('');
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [speechLanguage]);

  const toggleRecording = () => {
    if (!speechSupported) {
      alert('Speech recognition is not supported in this browser. Please type or paste your Mandi note.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      setLiveTranscriptStatus('');
    } else {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.lang = speechLanguage;
          recognitionRef.current.start();
          setIsRecording(true);
          setLiveTranscriptStatus('Listening in ' + (speechLanguage === 'pa-IN' ? 'ਪੰਜਾਬੀ' : speechLanguage === 'hi-IN' ? 'हिंदी' : 'English') + '...');
        }
      } catch (err) {
        console.error('Error starting speech:', err);
      }
    }
  };

  const handlePresetSelect = (example: (typeof PRESET_MANDI_EXAMPLES)[0]) => {
    setInputText(example.text);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onProcess(inputText.trim());
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-900/10 overflow-hidden">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 px-6 py-4 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <h2 className="text-lg font-bold">Mandi Voice & Text Intake Studio</h2>
          </div>
          <p className="text-xs text-emerald-200">
            ਬੋਲ ਕੇ ਜਾਂ ਲਿਖ ਕੇ ਦਾਖਲਾ ਕਰੋ (Punjabi, Hindi, or English) — Gemini 3.8 AI will extract J-Form, Bardana, Lifting & Ledger fields
          </p>
        </div>

        {/* Speech Language selector & Mic control */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 bg-emerald-950/70 border border-emerald-700/60 rounded-lg px-2.5 py-1 text-xs">
            <Languages className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={speechLanguage}
              onChange={(e) => setSpeechLanguage(e.target.value as any)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs"
              title="Speech Recognition Language"
            >
              <option value="pa-IN" className="bg-emerald-950 text-white">ਪੰਜਾਬੀ (Punjabi)</option>
              <option value="hi-IN" className="bg-emerald-950 text-white">हिंदी (Hindi)</option>
              <option value="en-IN" className="bg-emerald-950 text-white">English (India)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={toggleRecording}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-400'
                : 'bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold'
            }`}
            title={isRecording ? 'Click to Stop Recording' : 'Speak Mandi Entry'}
          >
            {isRecording ? (
              <>
                <MicOff className="w-3.5 h-3.5" />
                <span>Stop Voice</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span>Voice Record</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Live Audio Waves Banner when recording */}
        {isRecording && (
          <div className="mb-4 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between text-rose-800 text-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <span className="font-semibold">{liveTranscriptStatus}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1 h-3 bg-rose-500 animate-bounce"></span>
              <span className="w-1 h-5 bg-rose-500 animate-bounce delay-75"></span>
              <span className="w-1 h-4 bg-rose-500 animate-bounce delay-150"></span>
              <span className="w-1 h-6 bg-rose-500 animate-bounce delay-100"></span>
              <span className="w-1 h-2 bg-rose-500 animate-bounce"></span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="ਇੱਥੇ ਮੰਡੀ ਦਾਖਲਾ ਬੋਲੋ ਜਾਂ ਲਿਖੋ... ਉਦਾਹਰਨ ਲਈ:&#10;ਮਲਕੀਤ ਸਿੰਘ ਪਿੰਡ ਭਦੌੜ, ਝੋਨਾ 450 ਗੱਟੇ, ਵਜ਼ਨ 168.75 ਕੁਇੰਟਲ, ਭਾਅ 2320 ਰੁਪਏ। ਖਰੀਦਦਾਰ ਪਨਗਰੇਨ। ਬਾਰਦਾਨਾ 450 ਮਿਲਿਆ। ਲਿਫਟਿੰਗ 200 ਹੋ ਗਈ। ਪੱਲੇਦਾਰੀ 14 ਰੁਪਏ। ਪੁਰਾਣਾ ਬਕਾਇਆ 25000, ਪੇਸ਼ਗੀ 50000 ਰੁਪਏ..."
              rows={4}
              className="w-full rounded-xl border border-gray-300 p-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none transition-all shadow-inner font-sans leading-relaxed"
            />
            {inputText && (
              <button
                type="button"
                onClick={() => setInputText('')}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
                title="Clear input"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick preset chips */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-700" />
                Quick Punjab Mandi Presets (ਇੱਕ ਕਲਿੱਕ ਨਾਲ ਟੈਸਟ ਕਰੋ):
              </span>
              <span className="text-[11px] text-gray-400">Click any scenario to auto-fill</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {PRESET_MANDI_EXAMPLES.map((example, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePresetSelect(example)}
                  className="text-left p-2.5 rounded-lg border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/50 bg-gray-50/70 transition-all text-xs group cursor-pointer"
                >
                  <div className="font-semibold text-gray-800 group-hover:text-emerald-900 truncate">
                    {example.title}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                    {example.lang}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Auto-computes Total Amount, Pending Lifting, Palledari & Net Ledger</span>
            </div>

            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-2.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white font-semibold rounded-xl shadow-md shadow-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 transition-all cursor-pointer text-sm"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>AI Parsing Mandi Data...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Parse & Calculate (ਐਨਾਲਾਈਜ਼ ਕਰੋ)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
