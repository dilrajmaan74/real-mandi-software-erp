import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Trash2, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('KisanMitra ERP Uncaught Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCache = () => {
    try {
      localStorage.removeItem('kisanmitra_saved_letters');
      localStorage.removeItem('kisanmitra_farmers_master');
      localStorage.removeItem('kisanmitra_crop_arrivals');
      localStorage.removeItem('kisanmitra_bardana_entries');
      localStorage.removeItem('kisanmitra_agency_purchases');
      localStorage.removeItem('kisanmitra_lifting_dispatches');
      localStorage.removeItem('kisanmitra_shellers');
    } catch (e) {
      console.warn('Could not clear local storage', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4 font-sans text-gray-800">
          <div className="max-w-xl w-full bg-white rounded-2xl shadow-2xl border border-red-200 overflow-hidden">
            {/* Header */}
            <div className="bg-red-600 px-6 py-5 text-white flex items-center gap-4">
              <div className="p-3 bg-red-700/60 rounded-xl">
                <AlertOctagon className="w-8 h-8 text-white animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  ਐਪਲੀਕੇਸ਼ਨ ਵਿੱਚ ਅਸਥਾਈ ਰੁਕਾਵਟ (System Alert)
                </h1>
                <p className="text-xs text-red-100 font-medium">
                  KisanMitra ERP Mandi Management - Error Shield
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
                <p className="font-semibold mb-1">
                  ਸੌਫਟਵੇਅਰ ਨੂੰ ਲੋਡ ਕਰਦੇ ਸਮੇਂ ਇੱਕ ਗਲਤੀ ਆਈ ਹੈ:
                </p>
                <p className="text-xs font-mono bg-white p-2.5 rounded border border-red-200 text-red-900 break-all select-all">
                  {this.state.error?.message || 'Unknown runtime error occurred.'}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1">
                <p className="font-semibold text-amber-950">ਚਿੰਤਾ ਨਾ ਕਰੋ! ਤੁਹਾਡਾ ਡਾਟਾ ਸੁਰੱਖਿਅਤ ਹੈ:</p>
                <p>• ਬ੍ਰਾਊਜ਼ਰ ਨੂੰ ਤਾਜ਼ਾ (Reload) ਕਰਨ ਲਈ ਹੇਠਾਂ ਦਿੱਤਾ ਬਟਨ ਦਬਾਓ।</p>
                <p>• ਜੇਕਰ ਸਮੱਸਿਆ ਬਣੀ ਰਹੇ, ਤਾਂ "ਕੈਸ਼ੇ ਸਾਫ਼ ਕਰੋ (Clear Cache)" ਦਬਾਓ।</p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={this.handleReload}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
                >
                  <RotateCcw className="w-4 h-4" />
                  ਐਪ ਦੁਬਾਰਾ ਚਲਾਓ (Reload App)
                </button>
                <button
                  onClick={this.handleClearCache}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-700 border border-gray-300 hover:border-red-300 font-semibold rounded-xl transition-all active:scale-[0.98] text-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  ਕੈਸ਼ੇ ਸਾਫ਼ ਕਰੋ (Clear Cache)
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 text-center text-xs text-gray-500">
              ਕਿਸਾਨਮਿੱਤਰ ਈ.ਆਰ.ਪੀ (KisanMitra Mandi System) • ਪੰਜਾਬ ਮੰਡੀਆਂ ਲਈ ਸਮਰਪਿਤ
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
