import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { certsApi } from '../lib/api';
import { PdfViewerModal } from '../components/common/PdfViewerModal';
import { 
  Award, 
  Search, 
  ExternalLink, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Download, 
  Eye, 
  X 
} from 'lucide-react';
import type { Certificate } from '../types';

export const CertificatesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'revoked'>('all');
  const [selectedCertForPreview, setSelectedCertForPreview] = useState<Certificate | null>(null);
  const [selectedCertForRevoke, setSelectedCertForRevoke] = useState<Certificate | null>(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: certs, isLoading, isError, refetch } = useQuery({
    queryKey: ['all-certificates'],
    queryFn: () => certsApi.listAll(200, 0),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ certId, reason }: { certId: string; reason: string }) =>
      certsApi.revoke(certId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-certificates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setSelectedCertForRevoke(null);
      setRevocationReason('');
    },
  });

  const handleRevokeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCertForRevoke || !revocationReason.trim()) return;
    revokeMutation.mutate({
      certId: selectedCertForRevoke.id,
      reason: revocationReason.trim(),
    });
  };

  const handleDownload = async (cert: Certificate) => {
    try {
      setDownloadingId(cert.id);
      const filename = `certificate_${cert.recipient_name?.replace(/\s+/g, '_') || cert.public_id.slice(0, 8)}.pdf`;
      await certsApi.downloadPdf(cert.id, filename);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to download certificate PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredCerts = certs?.filter((c) => {
    // Status filter
    if (statusFilter === 'valid' && !c.is_valid) return false;
    if (statusFilter === 'revoked' && c.is_valid) return false;

    // Search filter
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.recipient_name?.toLowerCase().includes(term) ||
      c.event_name?.toLowerCase().includes(term) ||
      c.public_id.toLowerCase().includes(term) ||
      c.recipient_email?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-150">
      {/* Page Header - Steep Editorial Serif Headline */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#ECECEC]">
        <div>
          <span className="text-xs uppercase font-sans font-medium tracking-wider text-[#979799]">
            Archival & Issuance
          </span>
          <h2 className="font-serif text-3xl md:text-4xl font-normal text-[#17191C] mt-1 tracking-tight">
            Credential Registry
          </h2>
          <p className="text-sm text-[#777B86] mt-1">
            Permanent directory of all issued credentials, verifiable URLs, and cryptographic audit records.
          </p>
        </div>

        {/* Toolbar: Search and Filter Pills */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Segmented Pill Filter */}
          <div className="flex items-center bg-[#F2F2F3] p-1 rounded-full text-xs border border-[#ECECEC]">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-1.5 rounded-full transition-all ${
                statusFilter === 'all'
                  ? 'bg-[#17191C] text-[#FFFFFF] font-medium shadow-sm'
                  : 'text-[#777B86] hover:text-[#17191C]'
              }`}
            >
              All ({certs?.length ?? 0})
            </button>
            <button
              onClick={() => setStatusFilter('valid')}
              className={`px-4 py-1.5 rounded-full transition-all ${
                statusFilter === 'valid'
                  ? 'bg-[#17191C] text-[#FFFFFF] font-medium shadow-sm'
                  : 'text-[#777B86] hover:text-[#17191C]'
              }`}
            >
              Valid
            </button>
            <button
              onClick={() => setStatusFilter('revoked')}
              className={`px-4 py-1.5 rounded-full transition-all ${
                statusFilter === 'revoked'
                  ? 'bg-[#17191C] text-[#FFFFFF] font-medium shadow-sm'
                  : 'text-[#777B86] hover:text-[#17191C]'
              }`}
            >
              Revoked
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-[#A3A6AF]" />
            <input
              type="text"
              placeholder="Search recipient, event, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs bg-[#FFFFFF] border border-[#ECECEC] rounded-full focus:outline-none focus:border-[#17191C] text-[#17191C] w-64 placeholder-[#A3A6AF] shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Main Table Card (24px radius Steep Paper Artifact) */}
      <div className="bg-[#FFFFFF] border border-[#ECECEC] rounded-[24px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        {isLoading ? (
          <div className="p-20 text-center text-xs text-[#777B86] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#5D2A1A]" />
            <span>Loading credential records...</span>
          </div>
        ) : isError ? (
          <div className="p-20 text-center space-y-4">
            <AlertTriangle className="w-8 h-8 text-[#D32F2F] mx-auto" />
            <h4 className="font-serif text-lg text-[#17191C]">Failed to load registry</h4>
            <p className="text-xs text-[#777B86] max-w-sm mx-auto">
              There was an error connecting to the registry service. Please verify server connectivity.
            </p>
            <button
              onClick={() => refetch()}
              className="px-5 py-2 bg-[#17191C] hover:bg-[#2C2F35] text-[#FFFFFF] text-xs font-medium rounded-full shadow-sm transition-all"
            >
              Retry
            </button>
          </div>
        ) : !filteredCerts || filteredCerts.length === 0 ? (
          <div className="p-20 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#F2F2F3] flex items-center justify-center mx-auto text-[#777B86]">
              <Award className="w-6 h-6 text-[#5D2A1A]" />
            </div>
            <h4 className="font-serif text-lg text-[#17191C]">No certificates found</h4>
            <p className="text-xs text-[#777B86] max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all'
                ? 'No certificate records match your search criteria.'
                : 'Issued certificates from your completed batches will automatically appear here.'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link
                to="/jobs/new"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#17191C] hover:bg-[#2C2F35] text-[#FFFFFF] text-xs font-medium rounded-full shadow-sm transition-all mt-2"
              >
                Issue First Batch
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAFB] border-b border-[#ECECEC] text-[#777B86] uppercase font-sans text-[11px] tracking-wider select-none">
                <tr>
                  <th className="px-6 py-4 font-medium">Public ID</th>
                  <th className="px-6 py-4 font-medium">Recipient</th>
                  <th className="px-6 py-4 font-medium">Event / Program</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Issued Date</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECECEC]">
                {filteredCerts.map((cert) => (
                  <tr key={cert.id} className="hover:bg-[#FAFAFB] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-medium text-[#17191C]">
                      {cert.public_id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#17191C] text-sm">{cert.recipient_name || 'Recipient'}</div>
                      <div className="text-[11px] text-[#777B86] font-mono mt-0.5">
                        {cert.recipient_email || (cert.pdf_sha256 ? `SHA: ${cert.pdf_sha256.substring(0, 10)}...` : '—')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[#17191C] font-medium">{cert.event_name || 'Event'}</div>
                      {cert.issuer_name && (
                        <div className="text-[11px] text-[#777B86]">{cert.issuer_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {cert.is_valid ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2E7D32] bg-[#2E7D32]/10 border border-[#2E7D32]/20 px-3 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D32F2F] bg-[#D32F2F]/10 border border-[#D32F2F]/20 px-3 py-1 rounded-full">
                            <AlertTriangle className="w-3.5 h-3.5" /> Revoked
                          </span>
                          {cert.revocation_reason && (
                            <div className="text-[11px] text-[#777B86] max-w-xs truncate" title={cert.revocation_reason}>
                              {cert.revocation_reason}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[#777B86] font-mono text-[11px]">
                      {new Date(cert.issued_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {/* Preview Pill Action */}
                        <button
                          onClick={() => setSelectedCertForPreview(cert)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#17191C] hover:bg-[#17191C] hover:text-white bg-[#F2F2F3] px-3.5 py-1.5 rounded-full transition-all"
                          title="Preview PDF Certificate"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#5D2A1A]" />
                          <span>Preview</span>
                        </button>

                        {/* Download Pill Action */}
                        <button
                          onClick={() => handleDownload(cert)}
                          disabled={downloadingId === cert.id}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#17191C] hover:bg-[#17191C] hover:text-white bg-[#F2F2F3] px-3.5 py-1.5 rounded-full transition-all disabled:opacity-50"
                          title="Download PDF Certificate"
                        >
                          {downloadingId === cert.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>PDF</span>
                        </button>

                        {/* Verify Link */}
                        <Link
                          to={`/verify/${cert.public_id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#777B86] hover:text-[#17191C] p-2 hover:bg-[#F2F2F3] rounded-full transition-colors"
                          title="Verify Credential"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>

                        {/* Revoke Button */}
                        {cert.is_valid && (
                          <button
                            onClick={() => setSelectedCertForRevoke(cert)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#777B86] hover:text-[#D32F2F] p-2 hover:bg-[#F2F2F3] rounded-full transition-colors"
                            title="Revoke Certificate"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interactive PDF Viewer Modal */}
      <PdfViewerModal
        certificate={selectedCertForPreview}
        isOpen={Boolean(selectedCertForPreview)}
        onClose={() => setSelectedCertForPreview(null)}
      />

      {/* Revocation Confirmation Dialog (24px radius Steep Card) */}
      {selectedCertForRevoke && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-[#FFFFFF] border border-[#ECECEC] rounded-[24px] max-w-md w-full p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-[#ECECEC]">
              <div className="flex items-center gap-2.5 text-[#D32F2F]">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-serif text-lg font-normal text-[#17191C]">Revoke Credential</h3>
              </div>
              <button
                onClick={() => setSelectedCertForRevoke(null)}
                className="text-[#777B86] hover:text-[#17191C] p-1.5 rounded-full hover:bg-[#F2F2F3] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#777B86] leading-relaxed">
              Are you sure you want to revoke credential{' '}
              <strong className="text-[#17191C] font-mono">{selectedCertForRevoke.public_id}</strong> issued to{' '}
              <strong className="text-[#17191C]">{selectedCertForRevoke.recipient_name}</strong>?
              This action is permanent and verifiable on the public ledger.
            </p>

            <form onSubmit={handleRevokeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#17191C] mb-1.5">
                  Reason for Revocation *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Incomplete program requirements, issued in error..."
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                  className="w-full text-xs p-3.5 bg-[#FFFFFF] border border-[#ECECEC] rounded-[16px] focus:outline-none focus:border-[#17191C] text-[#17191C] placeholder-[#A3A6AF]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#ECECEC]">
                <button
                  type="button"
                  onClick={() => setSelectedCertForRevoke(null)}
                  className="px-5 py-2 bg-transparent hover:bg-[#F2F2F3] text-[#17191C] text-xs font-medium rounded-full border border-[#ECECEC] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={revokeMutation.isPending || !revocationReason.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-[#D32F2F] hover:bg-red-700 text-white text-xs font-medium rounded-full shadow-sm transition-all disabled:opacity-50"
                >
                  {revokeMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Revocation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
