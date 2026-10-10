import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Building, User, LogOut, Cpu } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, organization, logout } = useAuth();

  return (
    <div className="w-full max-w-4xl space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-[#ECECEC] pb-6">
        <span className="text-xs uppercase tracking-wider font-sans font-medium text-[#979799]">
          Configuration & Tenancy
        </span>
        <h1 className="text-3xl md:text-4xl font-serif font-normal text-[#17191C] tracking-tight mt-1">
          Settings & Workspace
        </h1>
        <p className="text-sm text-[#777B86] mt-1.5 font-sans">
          Manage your organization credentials, configuration parameters, and tenancy controls.
        </p>
      </div>

      <div className="space-y-6">
        {/* Organization Card */}
        <div className="bg-white border border-[#ECECEC] rounded-[24px] p-6 md:p-8 space-y-5 shadow-sm">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#ECECEC]">
            <Building className="w-4 h-4 text-[#17191C]" />
            <h2 className="text-lg font-serif font-normal text-[#17191C]">Organization Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="text-[#777B86] font-medium block">Organization Name</label>
              <div className="text-base font-serif text-[#17191C] mt-1">
                {organization?.name || 'Primary Workspace'}
              </div>
            </div>
            <div>
              <label className="text-[#777B86] font-medium block">Workspace ID</label>
              <div className="text-xs font-mono text-[#17191C] bg-[#F2F2F3] px-3 py-1.5 rounded-full inline-block mt-1">
                {organization?.id || '—'}
              </div>
            </div>
          </div>
        </div>

        {/* User Account Card */}
        <div className="bg-white border border-[#ECECEC] rounded-[24px] p-6 md:p-8 space-y-5 shadow-sm">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#ECECEC]">
            <User className="w-4 h-4 text-[#17191C]" />
            <h2 className="text-lg font-serif font-normal text-[#17191C]">Operator Account</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="text-[#777B86] font-medium block">Full Name</label>
              <div className="text-base font-serif text-[#17191C] mt-1">
                {user?.name || 'System Operator'}
              </div>
            </div>
            <div>
              <label className="text-[#777B86] font-medium block">Email Address</label>
              <div className="text-xs font-mono text-[#17191C] mt-1">
                {user?.email}
              </div>
            </div>
          </div>
        </div>

        {/* System Capabilities & Engine */}
        <div className="bg-white border border-[#ECECEC] rounded-[24px] p-6 md:p-8 space-y-5 shadow-sm">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#ECECEC]">
            <Cpu className="w-4 h-4 text-[#17191C]" />
            <h2 className="text-lg font-serif font-normal text-[#17191C]">Engine Architecture</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-[#F2F2F3] rounded-[16px]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#777B86]">PDF Engine</span>
              <div className="font-medium text-[#17191C] text-sm mt-1">ReportLab Standard</div>
              <span className="text-xs text-[#777B86] block mt-0.5">Predefined print template</span>
            </div>
            <div className="p-4 bg-[#F2F2F3] rounded-[16px]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#777B86]">Security Seal</span>
              <div className="font-medium text-[#17191C] text-sm mt-1">SHA-256 + QR Ledger</div>
              <span className="text-xs text-[#777B86] block mt-0.5">Tamper-evident verification</span>
            </div>
            <div className="p-4 bg-[#F2F2F3] rounded-[16px]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#777B86]">Background Queue</span>
              <div className="font-medium text-[#17191C] text-sm mt-1">Async Isolated Worker</div>
              <span className="text-xs text-[#777B86] block mt-0.5">Fault-tolerant per row</span>
            </div>
          </div>
        </div>

        {/* Sign Out Card */}
        <div className="p-6 md:p-8 border border-[#ECECEC] bg-white rounded-[24px] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-[#17191C]">Sign Out Session</h3>
            <p className="text-xs text-[#777B86] mt-0.5 font-sans">
              Revoke active authentication token and exit to login interface.
            </p>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-medium text-[#5D2A1A] hover:bg-[#FBE1D1] border border-[#5D2A1A]/30 rounded-full transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
