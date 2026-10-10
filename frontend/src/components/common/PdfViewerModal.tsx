import React, { useEffect, useState } from 'react';
import { 
  X, 
  Download, 
  ExternalLink, 
  ShieldCheck, 
  AlertTriangle, 
  Loader2, 
  FileText,
  Maximize2
} from 'lucide-react';
import { api, certsApi } from '../../lib/api';
import type { Certificate } from '../../types';

interface PdfViewerModalProps {
  certificate: Certificate | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  certificate,
  isOpen,
  onClose,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !certificate) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    setLoadError(null);

    // Fetch the PDF binary with authentication
    api.get(`/certificates/${certificate.id}/download?inline=true`, {
      responseType: 'blob',
    })
      .then((response) => {
        if (!active) return;
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        const detail = err.response?.data?.detail || err.message || 'Failed to load certificate document.';
        setLoadError(detail);
        setIsLoading(false);
      });

    return () => {
      active = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, certificate?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !certificate) return null;

  const handleDownload = () => {
    certsApi.downloadPdf(
      certificate.id, 
      `certificate_${certificate.recipient_name?.replace(/\s+/g, '_') || certificate.public_id.slice(0, 8)}.pdf`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl h-[92vh] flex flex-col bg-[#FFFFFF] border border-[#ECECEC] rounded-[24px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Toolbar - Steep Warm Paper Header */}
        <div className="h-16 px-6 border-b border-[#ECECEC] bg-[#FAFAFB] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#F2F2F3] flex items-center justify-center text-[#5D2A1A] shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h3 className="font-serif text-lg font-normal text-[#17191C] truncate">
                  {certificate.recipient_name || 'Certificate Preview'}
                </h3>
                {certificate.is_valid ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2E7D32] bg-[#2E7D32]/10 border border-[#2E7D32]/20 px-3 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" /> Valid
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D32F2F] bg-[#D32F2F]/10 border border-[#D32F2F]/20 px-3 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" /> Revoked
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#777B86] truncate font-mono">
                ID: {certificate.public_id} • {certificate.event_name || 'Certificate'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href={`/verify/${certificate.public_id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#17191C] hover:bg-[#F2F2F3] border border-[#ECECEC] rounded-full transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Public Verifier</span>
            </a>

            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-medium bg-[#17191C] hover:bg-[#2C2F35] text-[#FFFFFF] rounded-full shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            {blobUrl && (
              <a
                href={blobUrl}
                target="_blank"
                rel="noreferrer"
                title="Open in new window"
                className="p-2 text-[#777B86] hover:text-[#17191C] hover:bg-[#F2F2F3] rounded-full transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={onClose}
              className="p-2 text-[#777B86] hover:text-[#17191C] hover:bg-[#F2F2F3] rounded-full transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewer Content Area - Steep Warm Neutral Frame */}
        <div className="flex-1 bg-[#F2F2F3] p-4 sm:p-6 flex items-center justify-center overflow-hidden relative">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 text-[#777B86] text-xs">
              <Loader2 className="w-8 h-8 animate-spin text-[#5D2A1A]" />
              <span>Loading certificate document...</span>
            </div>
          )}

          {loadError && (
            <div className="max-w-md p-8 bg-[#FFFFFF] border border-[#ECECEC] rounded-[24px] text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#D32F2F]/10 text-[#D32F2F] mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="font-serif text-lg font-normal text-[#17191C]">Document Preview Error</h4>
              <p className="text-xs text-[#777B86]">{loadError}</p>
              <button
                onClick={() => {
                  setLoadError(null);
                  setIsLoading(true);
                  api.get(`/certificates/${certificate.id}/download?inline=true`, { responseType: 'blob' })
                    .then((res) => {
                      const blob = new Blob([res.data], { type: 'application/pdf' });
                      setBlobUrl(URL.createObjectURL(blob));
                      setIsLoading(false);
                    })
                    .catch((err) => {
                      setLoadError(err.message || 'Retry failed');
                      setIsLoading(false);
                    });
                }}
                className="px-5 py-2 bg-[#17191C] hover:bg-[#2C2F35] text-white text-xs font-medium rounded-full transition-all"
              >
                Try Again
              </button>
            </div>
          )}

          {!isLoading && !loadError && blobUrl && (
            <object
              data={blobUrl}
              type="application/pdf"
              className="w-full h-full rounded-[16px] border border-[#ECECEC] shadow-md bg-white"
            >
              <iframe
                src={blobUrl}
                title="Certificate PDF Viewer"
                className="w-full h-full rounded-[16px] border-0"
              >
                <div className="p-8 text-center text-xs text-[#777B86]">
                  PDF viewing is not supported in your browser directly.{' '}
                  <button onClick={handleDownload} className="text-[#17191C] underline font-medium ml-1">
                    Download the file
                  </button>
                </div>
              </iframe>
            </object>
          )}
        </div>
      </div>
    </div>
  );
};

