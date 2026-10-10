import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../lib/api';
import { Loader2 } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const { data: auditEvents, isLoading } = useQuery({
    queryKey: ['audit-trail'],
    queryFn: () => statsApi.getAuditEvents(100, 0),
  });

  const getActionBadge = (action: string) => {
    if (action.includes('revoke')) {
      return (
        <span className="font-mono text-[11px] font-medium text-[#5D2A1A] bg-[#FBE1D1] px-2.5 py-0.5 rounded-full">
          {action}
        </span>
      );
    }
    if (action.includes('job') || action.includes('cert')) {
      return (
        <span className="font-mono text-[11px] font-medium text-[#17191C] bg-[#F2F2F3] px-2.5 py-0.5 rounded-full border border-[#ECECEC]">
          {action}
        </span>
      );
    }
    return (
      <span className="font-mono text-[11px] font-medium text-[#777B86] bg-[#FAFAFB] px-2.5 py-0.5 rounded-full border border-[#ECECEC]">
        {action}
      </span>
    );
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="border-b border-[#ECECEC] pb-6">
        <span className="text-xs uppercase tracking-wider font-sans font-medium text-[#979799]">
          Compliance & Traceability
        </span>
        <h1 className="text-3xl md:text-4xl font-serif font-normal text-[#17191C] tracking-tight mt-1">
          Security & Audit Trail
        </h1>
        <p className="text-sm text-[#777B86] mt-1.5 font-sans">
          Immutable cryptographic ledger of issuance batches, certificate revocations, and administrative operator actions.
        </p>
      </div>

      {/* Events Table Card */}
      <div className="bg-white border border-[#ECECEC] rounded-[24px] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-20 text-center text-xs text-[#777B86] flex items-center justify-center gap-2.5">
            <Loader2 className="w-4 h-4 animate-spin text-[#17191C]" />
            <span>Retrieving audit event ledger...</span>
          </div>
        ) : !auditEvents || !Array.isArray(auditEvents) || auditEvents.length === 0 ? (
          <div className="p-20 text-center text-xs text-[#777B86]">
            No audit events recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#FAFAFB] border-b border-[#ECECEC] text-[#777B86] uppercase font-mono text-[10px] tracking-wider select-none">
                <tr>
                  <th className="px-6 py-3.5 font-medium">Timestamp</th>
                  <th className="px-6 py-3.5 font-medium">Action</th>
                  <th className="px-6 py-3.5 font-medium">Operator</th>
                  <th className="px-6 py-3.5 font-medium">Target Resource</th>
                  <th className="px-6 py-3.5 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECECEC]">
                {auditEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-[#FAFAFB] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-[#777B86]">
                      {new Date(event.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {getActionBadge(event.action)}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[#17191C]">
                      {event.actor_email || 'System Daemon'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#17191C] font-medium">{event.resource_type}</span>
                      {event.resource_id && (
                        <div className="text-[11px] font-mono text-[#979799] truncate max-w-xs mt-0.5">
                          {event.resource_id}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-medium px-2.5 py-0.5 rounded-full ${
                        event.outcome === 'success' 
                          ? 'text-[#17191C] bg-[#F2F2F3] border border-[#ECECEC]' 
                          : 'text-[#5D2A1A] bg-[#FBE1D1]'
                      }`}>
                        {event.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
