import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { certsApi } from '../lib/api';
import { 
  AlertTriangle, 
  XCircle, 
  Search, 
  CheckCircle2, 
  Calendar, 
  Building, 
  Award, 
  Loader2,
  Lock,
  ArrowRight
} from 'lucide-react';
import type { PublicVerification } from '../types';

export const VerifyPage: React.FC = () => {
  const { id: paramId } = useParams<{ id: string }>();
  const [searchId, setSearchId] = useState<string>(paramId || '');
  const [data, setData] = useState<PublicVerification | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notFound, setNotFound] = useState<boolean>(false);

  const fetchVerification = async (certId: string) => {
    if (!certId.trim()) return;
    setIsLoading(true);
    setNotFound(false);

    try {
      const res = await certsApi.verifyPublic(certId.trim());
      setData(res);
    } catch (err: any) {
      setData(null);
      if (err.response?.status === 404) {
        setNotFound(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (paramId) {
      setSearchId(paramId);
      fetchVerification(paramId);
    }
  }, [paramId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVerification(searchId);
  };

  return (
    <div className="min-h-screen bg-white text-[#17191C] flex flex-col font-sans selection:bg-[#FBE1D1] selection:text-[#5D2A1A]">
      {/* Public Header */}
      <header className="border-b border-[#ECECEC] bg-white sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#17191C] text-white rounded-full flex items-center justify-center font-serif text-sm">
              C
            </div>
            <span className="font-serif text-lg text-[#17191C] tracking-tight">CertiFlow</span>
            <span className="text-xs text-[#979799] font-sans ml-1">/ Verifier</span>
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#17191C] hover:bg-[#F2F2F3] text-[#17191C] rounded-full text-xs font-medium transition-colors"
          >
            <span>Console Access</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-3xl w-full mx-auto px-6 py-16 flex-1 space-y-10 animate-in fade-in duration-200">
        <div className="text-center space-y-3">
          <span className="text-xs uppercase tracking-wider font-sans font-medium text-[#979799]">
            Cryptographic Integrity Check
          </span>
          <h1 className="text-4xl md:text-5xl font-serif font-normal text-[#17191C] tracking-tight">
            Official Credential Verification
          </h1>
          <p className="text-sm text-[#777B86] max-w-lg mx-auto font-sans">
            Validate the authentic signature, issuer authority, and real-time revocation status of credentials minted on CertiFlow.
          </p>
        </div>

        {/* Verification Lookup Input (Composer Style) */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5 max-w-xl mx-auto">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-3.5 text-[#A3A6AF]" />
            <input
              type="text"
              placeholder="Enter public certificate ID or UUID..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full pl-11 pr-4 py-3 text-xs font-mono bg-white border border-[#ECECEC] rounded-[16px] focus:outline-none focus:border-[#17191C] text-[#17191C] placeholder-[#A3A6AF] shadow-xs transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !searchId.trim()}
            className="px-6 py-3 bg-[#17191C] hover:bg-black text-white text-xs font-medium rounded-full transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify Record</span>}
          </button>
        </form>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16 text-xs text-[#777B86] flex items-center justify-center gap-2.5">
            <Loader2 className="w-4 h-4 animate-spin text-[#17191C]" />
            <span>Consulting cryptographic registry ledger...</span>
          </div>
        )}

        {/* Not Found Result */}
        {!isLoading && notFound && (
          <div className="border border-[#ECECEC] bg-[#FAFAFB] rounded-[24px] p-8 text-center space-y-3 max-w-xl mx-auto">
            <div className="w-10 h-10 rounded-full bg-[#FBE1D1] text-[#5D2A1A] flex items-center justify-center mx-auto">
              <XCircle className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-serif font-normal text-[#17191C]">Certificate Not Recognized</h2>
            <p className="text-xs text-[#777B86] max-w-sm mx-auto font-mono">
              No issued credential matches public identifier <code className="text-[#17191C] font-semibold">{searchId}</code>. Please double-check the QR link or code on your document.
            </p>
          </div>
        )}

        {/* Successful Verification Result */}
        {!isLoading && data && (
          <div className="bg-white border border-[#ECECEC] rounded-[24px] overflow-hidden shadow-[0_0_0_1px_rgba(4,23,43,0.05),0_20px_25px_-5px_rgba(0,0,0,0.08)] max-w-2xl mx-auto transition-all">
            {/* Validity Banner */}
            {data.is_revoked ? (
              <div className="p-6 bg-[#FBE1D1] text-[#5D2A1A] border-b border-[#5D2A1A]/10 flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5 text-[#5D2A1A]" />
                <div className="space-y-1">
                  <div className="font-serif text-lg">Credential Revoked</div>
                  <div className="text-xs text-[#5D2A1A]/90">
                    This certificate has been revoked by the issuing authority and is no longer recognized as valid.
                  </div>
                  {data.revocation_reason && (
                    <div className="text-xs font-medium pt-1">
                      Reason: <span className="font-normal">{data.revocation_reason}</span>
                    </div>
                  )}
                  {data.revoked_at && (
                    <div className="text-[11px] font-mono opacity-80">
                      Revocation recorded: {new Date(data.revoked_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 bg-[#FAFAFB] border-b border-[#ECECEC] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#17191C] text-white flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-serif text-base block text-[#17191C]">Authentic & Active Credential</span>
                    <span className="text-xs text-[#777B86]">Cryptographically signed and registered on CertiFlow ledger.</span>
                  </div>
                </div>
                <span className="font-mono text-xs text-[#17191C] px-3 py-1 bg-white rounded-full border border-[#ECECEC]">
                  {data.public_id}
                </span>
              </div>
            )}

            {/* Credential Details Panel */}
            <div className="p-8 space-y-8">
              <div>
                <span className="text-xs uppercase font-mono tracking-wider font-medium text-[#979799]">
                  Awarded To
                </span>
                <h2 className="text-3xl font-serif font-normal text-[#17191C] mt-1">
                  {data.recipient_name}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[#ECECEC]">
                <div className="space-y-1">
                  <span className="text-xs text-[#777B86] flex items-center gap-1.5 font-sans">
                    <Award className="w-3.5 h-3.5 text-[#17191C]" /> Event / Achievement
                  </span>
                  <div className="text-sm font-medium text-[#17191C]">{data.event_name}</div>
                  {data.achievement_description && (
                    <div className="text-xs text-[#777B86]">{data.achievement_description}</div>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-[#777B86] flex items-center gap-1.5 font-sans">
                    <Building className="w-3.5 h-3.5 text-[#17191C]" /> Issuing Organization
                  </span>
                  <div className="text-sm font-medium text-[#17191C]">{data.issuer_name}</div>
                  {data.signatory_name && (
                    <div className="text-xs text-[#777B86]">Signatory: {data.signatory_name}</div>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-[#777B86] flex items-center gap-1.5 font-sans">
                    <Calendar className="w-3.5 h-3.5 text-[#17191C]" /> Date of Issuance
                  </span>
                  <div className="text-sm font-mono text-[#17191C]">{data.issue_date}</div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-[#777B86] font-sans">Ledger Timestamp</span>
                  <div className="text-xs text-[#17191C] font-mono">
                    {new Date(data.issued_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Privacy protection notice */}
              <div className="pt-6 border-t border-[#ECECEC] flex items-center gap-2 text-xs text-[#777B86]">
                <Lock className="w-3.5 h-3.5 text-[#17191C] shrink-0" />
                <span>Privacy Assured: Recipient personal emails and phone contacts are never exposed on public ledger checkpoints.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
