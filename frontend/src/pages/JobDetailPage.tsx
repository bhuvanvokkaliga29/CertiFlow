import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi, certsApi } from '../lib/api';
import { PdfViewerModal } from '../components/common/PdfViewerModal';
import { 
  ArrowLeft, 
  RotateCw, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  AlertCircle,
  Search,
  ExternalLink,
  Loader2,
  Eye
} from 'lucide-react';
import type { Recipient, Certificate } from '../types';

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page] = useState<number>(1);
  const [selectedCertForPreview, setSelectedCertForPreview] = useState<Certificate | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);

  const isValidId = Boolean(id && id !== 'undefined');

  // Poll job status every 2 seconds if still running
  const { data: job, isLoading: jobLoading, isError: jobError, error: jobErrorData } = useQuery({
    queryKey: ['job-detail', id],
    queryFn: () => jobsApi.get(id!),
    enabled: isValidId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'queued' || status === 'processing') {
        return 2000;
      }
      return false;
    },
  });

  // Query recipients list
  const { data: recipientsData, isLoading: recipientsLoading } = useQuery({
    queryKey: ['job-recipients', id, statusFilter, searchTerm, page],
    queryFn: () =>
      jobsApi.getRecipients(id!, {
        status: statusFilter || undefined,
        search: searchTerm || undefined,
        page,
        per_page: 50,
      }),
    enabled: isValidId,
    refetchInterval: () => {
      if (job?.status === 'queued' || job?.status === 'processing') {
        return 3000;
      }
      return false;
    },
  });

  // Query certificates list for direct download and preview links
  const { data: certs } = useQuery({
    queryKey: ['job-certificates', id],
    queryFn: () => jobsApi.getCertificates(id!),
    enabled: isValidId && (job?.success_count ?? 0) > 0,
  });

  // Retry failed mutation
  const retryMutation = useMutation({
    mutationFn: () => jobsApi.retryFailed(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['job-recipients', id] });
    },
  });

  const handleDownloadZip = async () => {
    if (!job) return;
    try {
      setDownloadingZip(true);
      await jobsApi.downloadZip(job.id);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to download ZIP archive');
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleDownloadCsv = async () => {
    if (!job) return;
    try {
      setDownloadingCsv(true);
      await jobsApi.downloadCsvReport(job.id);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to export CSV report');
    } finally {
      setDownloadingCsv(false);
    }
  };

  const handleDownloadCert = async (cert: Certificate) => {
    try {
      setDownloadingCertId(cert.id);
      await certsApi.downloadPdf(
        cert.id,
        `certificate_${cert.recipient_name?.replace(/\s+/g, '_') || cert.public_id.slice(0, 8)}.pdf`
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to download certificate PDF');
    } finally {
      setDownloadingCertId(null);
    }
  };

  if (!isValidId) {
    return (
      <div className="w-full max-w-lg mx-auto my-16 p-10 bg-[#FFFFFF] border border-[#ECECEC] rounded-[24px] text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-[#D32F2F]/10 text-[#D32F2F] mx-auto flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="font-serif text-xl font-normal text-[#17191C]">Invalid Batch Identifier</h3>
        <p className="text-xs text-[#777B86]">
          No valid batch ID was provided in the URL navigation.
        </p>
        <div className="pt-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#17191C] hover:bg-[#2C2F35] text-[#FFFFFF] text-xs font-medium rounded-full transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  if (jobLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-[#777B86] text-xs gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#5D2A1A]" />
        <span>Loading batch details...</span>
      </div>
    );
  }

  if (jobError || !job) {
    return (
      <div className="w-full max-w-lg mx-auto my-16 p-10 bg-[#FFFFFF] border border-[#ECECEC] rounded-[24px] text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-[#D32F2F]/10 text-[#D32F2F] mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="font-serif text-xl font-normal text-[#17191C]">Batch Not Found</h3>
        <p className="text-xs text-[#777B86]">
          {(jobErrorData as any)?.response?.data?.detail || 'This certificate batch could not be found or you do not have permission to access it.'}
        </p>
        <div className="pt-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#17191C] hover:bg-[#2C2F35] text-[#FFFFFF] text-xs font-medium rounded-full transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#5D2A1A]/10 text-[#5D2A1A] border border-[#5D2A1A]/20">
            <Clock className="w-3.5 h-3.5 animate-spin" /> Processing ({job.completion_percentage}%)
          </span>
        );
      case 'partially_failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Partial ({job.failed_count} Failed)
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#D32F2F]/10 text-[#D32F2F] border border-[#D32F2F]/20">
            <XCircle className="w-3.5 h-3.5" /> Batch Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#F2F2F3] text-[#777B86] border border-[#ECECEC]">
            <Clock className="w-3.5 h-3.5" /> Queued
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-150">
      {/* Top Breadcrumb & Metadata Header - Steep Editorial Heading */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 pb-6 border-b border-[#ECECEC]">
        <div className="space-y-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-xs text-[#777B86] hover:text-[#17191C] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-3.5">
            <h2 className="font-serif text-3xl md:text-4xl font-normal text-[#17191C] tracking-tight">
              {job.event_name}
            </h2>
            {getStatusBadge(job.status)}
          </div>
          <div className="text-xs text-[#777B86]">
            Issuer: <span className="font-medium text-[#17191C]">{job.issuer_name}</span> • Date: {job.issue_date} • Batch ID: <span className="font-mono text-[#17191C]">{job.id}</span>
          </div>
        </div>

        {/* Action Buttons Toolbar - Steep Matched Pill Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {job.failed_count > 0 && (
            <button
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending || job.status === 'processing'}
              className="inline-flex items-center gap-2 px-5 py-2 bg-[#FBE1D1] hover:bg-[#F5CBB2] text-[#5D2A1A] text-xs font-medium rounded-full shadow-xs transition-all disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
              <span>Retry {job.failed_count} Failed</span>
            </button>
          )}

          {job.success_count > 0 && (
            <button
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="inline-flex items-center gap-2 px-5 py-2 bg-[#17191C] hover:bg-[#2C2F35] text-[#FFFFFF] text-xs font-medium rounded-full shadow-sm transition-all disabled:opacity-50"
            >
              {downloadingZip ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download ZIP Archive</span>
            </button>
          )}

          <button
            onClick={handleDownloadCsv}
            disabled={downloadingCsv}
            className="inline-flex items-center gap-2 px-5 py-2 border border-[#17191C] bg-transparent hover:bg-[#F2F2F3] text-[#17191C] text-xs font-medium rounded-full transition-all disabled:opacity-50"
          >
            {downloadingCsv ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#5D2A1A]" />
            )}
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* Progress & Counters Card (Steep 24px Radius Paper Card) */}
      <div className="bg-[#FFFFFF] border border-[#ECECEC] rounded-[24px] p-6 space-y-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="space-y-2.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-[#17191C]">Batch Issuance Progress</span>
            <span className="font-mono font-bold text-[#17191C]">{job.completion_percentage}%</span>
          </div>
          <div className="w-full h-2 bg-[#F2F2F3] rounded-full overflow-hidden border border-[#ECECEC]">
            <div
              className="h-full bg-[#17191C] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${job.completion_percentage}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 text-center">
          <div className="p-4 bg-[#F2F2F3] rounded-[16px]">
            <span className="text-[10px] uppercase font-sans font-medium text-[#777B86]">Total</span>
            <div className="font-serif text-2xl text-[#17191C] mt-1">{job.total_count}</div>
          </div>
          <div className="p-4 bg-[#2E7D32]/10 rounded-[16px] border border-[#2E7D32]/20">
            <span className="text-[10px] uppercase font-sans font-medium text-[#2E7D32]">Successful</span>
            <div className="font-serif text-2xl text-[#2E7D32] mt-1">{job.success_count}</div>
          </div>
          <div className="p-4 bg-[#D32F2F]/10 rounded-[16px] border border-[#D32F2F]/20">
            <span className="text-[10px] uppercase font-sans font-medium text-[#D32F2F]">Failed</span>
            <div className="font-serif text-2xl text-[#D32F2F] mt-1">{job.failed_count}</div>
          </div>
          <div className="p-4 bg-[#5D2A1A]/10 rounded-[16px] border border-[#5D2A1A]/20">
            <span className="text-[10px] uppercase font-sans font-medium text-[#5D2A1A]">Processing</span>
            <div className="font-serif text-2xl text-[#5D2A1A] mt-1">{job.processing_count}</div>
          </div>
          <div className="p-4 bg-[#F2F2F3] rounded-[16px]">
            <span className="text-[10px] uppercase font-sans font-medium text-[#777B86]">Pending</span>
            <div className="font-serif text-2xl text-[#777B86] mt-1">{job.pending_count}</div>
          </div>
        </div>
      </div>

      {/* Recipients Table Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-serif text-xl font-normal text-[#17191C]">
            Recipient Results ({recipientsData?.total ?? 0})
          </h3>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-2.5 text-[#A3A6AF]" />
              <input
                type="text"
                placeholder="Search name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#ECECEC] rounded-full focus:outline-none focus:border-[#17191C] text-[#17191C] placeholder-[#A3A6AF] w-52 shadow-xs"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-4 text-xs bg-[#FFFFFF] border border-[#ECECEC] rounded-full focus:outline-none focus:border-[#17191C] text-[#17191C] shadow-xs"
            >
              <option value="">All Statuses</option>
              <option value="succeeded">Succeeded</option>
              <option value="failed">Failed</option>
              <option value="processing">Processing</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#ECECEC] rounded-[24px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          {recipientsLoading ? (
            <div className="p-16 text-center text-xs text-[#777B86] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#5D2A1A]" />
              <span>Loading recipient records...</span>
            </div>
          ) : !recipientsData || recipientsData.items.length === 0 ? (
            <div className="p-16 text-center text-xs text-[#777B86]">
              No recipients match the selected criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFB] border-b border-[#ECECEC] text-[#777B86] uppercase font-sans text-[11px] tracking-wider select-none">
                  <tr>
                    <th className="px-6 py-4 font-medium">Recipient</th>
                    <th className="px-6 py-4 font-medium">Institution</th>
                    <th className="px-6 py-4 font-medium">Achievement</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Certificate & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECECEC]">
                  {recipientsData.items.map((recipient: Recipient) => {
                    const cert = certs?.find((c) => c.recipient_id === recipient.id);

                    return (
                      <tr key={recipient.id} className="hover:bg-[#FAFAFB] transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-[#17191C] text-sm">{recipient.full_name}</div>
                          <div className="text-[11px] text-[#777B86] font-mono mt-0.5">{recipient.email || '—'}</div>
                        </td>
                        <td className="px-6 py-4 text-[#777B86]">{recipient.institution || '—'}</td>
                        <td className="px-6 py-4 text-[#17191C]">{recipient.achievement || '—'}</td>
                        <td className="px-6 py-4">
                          {recipient.status === 'succeeded' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2E7D32] bg-[#2E7D32]/10 border border-[#2E7D32]/20 px-3 py-1 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Succeeded
                            </span>
                          )}
                          {recipient.status === 'failed' && (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D32F2F] bg-[#D32F2F]/10 border border-[#D32F2F]/20 px-3 py-1 rounded-full">
                                <XCircle className="w-3.5 h-3.5" /> Failed
                              </span>
                              {recipient.error_message && (
                                <div className="text-[11px] text-[#D32F2F] max-w-xs truncate" title={recipient.error_message}>
                                  {recipient.error_message}
                                </div>
                              )}
                            </div>
                          )}
                          {recipient.status === 'processing' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5D2A1A] bg-[#5D2A1A]/10 border border-[#5D2A1A]/20 px-3 py-1 rounded-full">
                              <Clock className="w-3.5 h-3.5 animate-spin" /> Rendering
                            </span>
                          )}
                          {recipient.status === 'pending' && (
                            <span className="text-[11px] text-[#777B86] font-mono">Pending</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {cert ? (
                            <div className="inline-flex items-center gap-2">
                              {/* Preview Action */}
                              <button
                                onClick={() => setSelectedCertForPreview(cert)}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#17191C] hover:bg-[#17191C] hover:text-white bg-[#F2F2F3] px-3.5 py-1.5 rounded-full transition-all"
                                title="Preview Certificate"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#5D2A1A]" />
                                <span>Preview</span>
                              </button>

                              {/* Download PDF Action */}
                              <button
                                onClick={() => handleDownloadCert(cert)}
                                disabled={downloadingCertId === cert.id}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#17191C] hover:bg-[#17191C] hover:text-white bg-[#F2F2F3] px-3.5 py-1.5 rounded-full transition-all disabled:opacity-50"
                                title="Download PDF"
                              >
                                {downloadingCertId === cert.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5D2A1A]" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                                <span>PDF</span>
                              </button>

                              {/* Public Verifier Link */}
                              <Link
                                to={`/verify/${cert.public_id}`}
                                target="_blank"
                                className="inline-flex items-center gap-1 text-xs font-medium text-[#777B86] hover:text-[#17191C] p-2 hover:bg-[#F2F2F3] rounded-full transition-colors"
                                title="Verify Certificate"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          ) : (
                            <span className="text-[#979799] text-xs font-mono">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Interactive PDF Viewer Modal */}
      <PdfViewerModal
        certificate={selectedCertForPreview}
        isOpen={Boolean(selectedCertForPreview)}
        onClose={() => setSelectedCertForPreview(null)}
      />
    </div>
  );
};

