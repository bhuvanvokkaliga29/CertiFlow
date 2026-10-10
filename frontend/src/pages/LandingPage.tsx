import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Layers, 
  QrCode, 
  ArrowRight, 
  CheckCircle2, 
  FileSpreadsheet, 
  Lock,
  DownloadCloud
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#17191C] selection:bg-[#FBE1D1] selection:text-[#5D2A1A]">
      {/* Navigation - Transparent whisper-quiet top bar */}
      <header className="border-b border-[#ECECEC] sticky top-0 bg-[#FFFFFF]/90 backdrop-blur-md z-50">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#17191C] text-[#FFFFFF] rounded-full flex items-center justify-center font-bold text-xs tracking-tight shadow-sm">
              CF
            </div>
            <span className="font-serif text-xl tracking-tight text-[#17191C]">CertiFlow</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-[14px] text-[#777B86]">
            <a href="#features" className="hover:text-[#17191C] transition-colors">Features</a>
            <a href="#editorial" className="hover:text-[#17191C] transition-colors">Architecture</a>
            <a href="#verification" className="hover:text-[#17191C] transition-colors">Verification</a>
            <Link to="/verify" className="hover:text-[#17191C] transition-colors">Public Verifier</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-[14px] px-4 py-2 text-[#777B86] hover:text-[#17191C] transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-[14px] px-5 py-2 bg-[#17191C] hover:bg-[#2C2F35] text-[#FFFFFF] rounded-full transition-all shadow-sm"
            >
              Start Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section - Magazine spread with Signifier serif display */}
      <section className="py-24 px-6 md:px-10 border-b border-[#ECECEC] bg-[#FFFFFF]">
        <div className="w-full max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#F2F2F3] rounded-full text-xs font-sans text-[#777B86] border border-[#ECECEC]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5D2A1A]" />
            Enterprise-Grade Bulk Certificate Engine
          </div>

          {/* Steep signature display serif */}
          <h1 className="font-serif text-5xl md:text-7xl font-normal tracking-[-0.025em] text-[#17191C] leading-[1.15]">
            Issue certificates at scale. <br />
            <span className="italic text-[#777B86]">Verify every credential.</span>
          </h1>

          <p className="text-lg md:text-xl text-[#777B86] max-w-2xl mx-auto leading-relaxed font-normal">
            Personalize, render, and distribute hundreds or thousands of tamper-evident PDF certificates in minutes. Built with independent failure isolation, verifiable QR codes, and auditable revocations.
          </p>

          {/* Matched pair pill buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 bg-[#17191C] hover:bg-[#2C2F35] text-[#FFFFFF] text-sm font-medium rounded-full transition-all shadow-sm"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3 bg-transparent hover:bg-[#F2F2F3] border border-[#17191C] text-[#17191C] text-sm font-medium rounded-full transition-all"
            >
              View Demo Dashboard
            </Link>
          </div>
        </div>

        {/* Floating Product Artifact Card (20px radius with soft shadow) */}
        <div className="w-full max-w-5xl mx-auto mt-16 rounded-[24px] border border-[#ECECEC] bg-[#FAFAFB] p-4 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.06),0_8px_10px_-6px_rgba(0,0,0,0.04)]">
          <div className="bg-[#FFFFFF] rounded-[20px] border border-[#ECECEC] p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#ECECEC] pb-4 mb-6">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#979799] font-mono">Batch #CF-84920</span>
                <h3 className="font-serif text-lg font-normal text-[#17191C] mt-0.5">National Innovation Hackathon 2026</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2E7D32]/10 text-[#2E7D32] text-xs font-medium rounded-full border border-[#2E7D32]/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed (100%)
                </span>
                <div className="text-xs font-mono text-[#777B86]">
                  500/500 Issued
                </div>
              </div>
            </div>

            {/* Certificate Editorial Preview Frame */}
            <div className="relative border border-[#ECECEC] rounded-[20px] p-8 bg-[#FAFAFB] flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-3 max-w-md">
                <div className="text-[11px] font-medium text-[#979799] uppercase tracking-widest font-sans">
                  CertiFlow Verified Authority
                </div>
                <h4 className="font-serif text-2xl md:text-3xl font-normal text-[#17191C]">
                  Certificate of Achievement
                </h4>
                <p className="text-sm text-[#777B86] leading-relaxed">
                  Conferred upon <span className="font-medium text-[#17191C]">Aarav Sharma</span> for distinguished performance as <span className="text-[#5D2A1A] font-medium">First Runner-Up</span> in the National Hackathon.
                </p>
                <div className="flex items-center gap-4 pt-2 text-xs text-[#979799] font-mono">
                  <span>ID: CF-78A4B-2026</span>
                  <span>•</span>
                  <span>SHA-256 Verified</span>
                </div>
              </div>

              <div className="flex flex-col items-center bg-[#FFFFFF] p-4 rounded-[16px] border border-[#ECECEC] shadow-sm shrink-0">
                <div className="w-24 h-24 bg-[#FAFAFB] rounded-xl flex items-center justify-center border border-[#ECECEC]">
                  <QrCode className="w-16 h-16 text-[#17191C]" />
                </div>
                <span className="text-[11px] font-mono text-[#777B86] mt-2">Scan to Verify</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Steep Accent Peach Card (Editorial Highlight) */}
      <section id="editorial" className="py-20 px-6 md:px-10 bg-[#FAFAFB] border-b border-[#ECECEC]">
        <div className="w-full max-w-5xl mx-auto">
          <div className="bg-[#FBE1D1] text-[#5D2A1A] rounded-[24px] p-10 md:p-14 border border-[#F5CBB2] space-y-5">
            <span className="text-xs uppercase font-sans font-semibold tracking-widest text-[#5D2A1A]/80">
              The Integrity Architecture
            </span>
            <h3 className="font-serif text-3xl md:text-4xl font-normal text-[#5D2A1A] leading-tight">
              “Credentials should be as permanent and verifiable as print, yet as agile and tamper-evident as modern cryptography.”
            </h3>
            <p className="text-sm md:text-base text-[#5D2A1A]/90 max-w-2xl leading-relaxed">
              Every certificate produced by CertiFlow contains a cryptographic hash, non-sequential collision-resistant public identifier, and a live QR ledger entry. When revocations occur, the public record updates instantly while retaining historical audit logs.
            </p>
            <div className="pt-2">
              <Link
                to="/verify"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#5D2A1A] hover:underline"
              >
                <span>Inspect public verification mechanics</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid - Neutral Flat Cards at 24px radius */}
      <section id="features" className="py-24 px-6 md:px-10 border-b border-[#ECECEC] bg-[#FFFFFF]">
        <div className="w-full max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="font-serif text-3xl md:text-4xl font-normal text-[#17191C]">
              Built for precision, volume, and verification
            </h2>
            <p className="text-base text-[#777B86]">
              Everything required to issue credentials confidently and govern their entire lifecycle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#F2F2F3] p-7 rounded-[24px] border border-transparent space-y-4">
              <div className="w-10 h-10 bg-[#FFFFFF] rounded-full flex items-center justify-center text-[#17191C] shadow-sm">
                <Layers className="w-5 h-5 text-[#5D2A1A]" />
              </div>
              <h3 className="text-base font-medium text-[#17191C]">Fault-Isolated Batch Processing</h3>
              <p className="text-sm text-[#777B86] leading-relaxed">
                Individual recipient failures never halt the batch. Valid recipients continue generating, with granular retry mechanisms for failed rows.
              </p>
            </div>

            <div className="bg-[#F2F2F3] p-7 rounded-[24px] border border-transparent space-y-4">
              <div className="w-10 h-10 bg-[#FFFFFF] rounded-full flex items-center justify-center text-[#17191C] shadow-sm">
                <QrCode className="w-5 h-5 text-[#5D2A1A]" />
              </div>
              <h3 className="text-base font-medium text-[#17191C]">Instant QR Verification</h3>
              <p className="text-sm text-[#777B86] leading-relaxed">
                Every certificate contains a high-resolution QR code linking to an unforgeable public verification URL with collision-resistant UUIDs.
              </p>
            </div>

            <div className="bg-[#F2F2F3] p-7 rounded-[24px] border border-transparent space-y-4">
              <div className="w-10 h-10 bg-[#FFFFFF] rounded-full flex items-center justify-center text-[#17191C] shadow-sm">
                <FileSpreadsheet className="w-5 h-5 text-[#5D2A1A]" />
              </div>
              <h3 className="text-base font-medium text-[#17191C]">CSV Pre-Flight Inspection</h3>
              <p className="text-sm text-[#777B86] leading-relaxed">
                Upload recipient CSV files with automatic column normalization, duplicate detection, formula injection prevention, and live previews.
              </p>
            </div>

            <div className="bg-[#F2F2F3] p-7 rounded-[24px] border border-transparent space-y-4">
              <div className="w-10 h-10 bg-[#FFFFFF] rounded-full flex items-center justify-center text-[#17191C] shadow-sm">
                <ShieldCheck className="w-5 h-5 text-[#5D2A1A]" />
              </div>
              <h3 className="text-base font-medium text-[#17191C]">Full Revocation Lifecycle</h3>
              <p className="text-sm text-[#777B86] leading-relaxed">
                Revoke credentials with recorded reasons, audit timestamps, and real-time public status updates without deleting historical records.
              </p>
            </div>

            <div className="bg-[#F2F2F3] p-7 rounded-[24px] border border-transparent space-y-4">
              <div className="w-10 h-10 bg-[#FFFFFF] rounded-full flex items-center justify-center text-[#17191C] shadow-sm">
                <DownloadCloud className="w-5 h-5 text-[#5D2A1A]" />
              </div>
              <h3 className="text-base font-medium text-[#17191C]">Safe Bulk ZIP & CSV Exports</h3>
              <p className="text-sm text-[#777B86] leading-relaxed">
                Stream sanitized ZIP archives containing high-res PDFs and export clean audit reports with path traversal and formula protection.
              </p>
            </div>

            <div className="bg-[#F2F2F3] p-7 rounded-[24px] border border-transparent space-y-4">
              <div className="w-10 h-10 bg-[#FFFFFF] rounded-full flex items-center justify-center text-[#17191C] shadow-sm">
                <Lock className="w-5 h-5 text-[#5D2A1A]" />
              </div>
              <h3 className="text-base font-medium text-[#17191C]">Organization Data Isolation</h3>
              <p className="text-sm text-[#777B86] leading-relaxed">
                Strict multi-tenant authorization boundaries ensure no organization or organizer can inspect or download unauthorized certificates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Quiet paper footer */}
      <footer className="py-12 px-6 md:px-10 border-t border-[#ECECEC] bg-[#FFFFFF] text-[#777B86] text-xs">
        <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-[#17191C] text-[#FFFFFF] rounded-full flex items-center justify-center font-bold text-[10px]">
              CF
            </div>
            <span className="font-serif text-sm text-[#17191C]">CertiFlow</span>
            <span className="text-[#979799]">© 2026. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-[#777B86]">
            <Link to="/verify" className="hover:text-[#17191C] transition-colors">Public Credential Check</Link>
            <Link to="/login" className="hover:text-[#17191C] transition-colors">Organizer Portal</Link>
            <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="hover:text-[#17191C] transition-colors">API Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
};


