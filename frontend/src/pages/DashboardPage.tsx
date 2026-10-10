import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { statsApi, jobsApi } from '../lib/api';
import { 
  PlusCircle, 
  Layers, 
  Award, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  ArrowRight,
  Clock,
  AlertTriangle,
  History
} from 'lucide-react';
import type { GenerationJob } from '../types';

export const DashboardPage: React.FC = () => {
  const { organization } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: statsApi.getStats,
    refetchInterval: 5000,
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['recent-jobs'],
    queryFn: () => jobsApi.list(),
    refetchInterval: 5000,
  });

  const { data: auditEvents } = useQuery({
    queryKey: ['recent-audit-events'],
    queryFn: () => statsApi.getAuditEvents(5, 0),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#5D2A1A]/10 text-[#5D2A1A] border border-[#5D2A1A]/20">
            <Clock className="w-3.5 h-3.5 animate-spin" /> Processing
          </span>
        );
      case 'partially_failed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Partial
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#D32F2F]/10 text-[#D32F2F] border border-[#D32F2F]/20">
            <XCircle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#F2F2F3] text-[#777B86] border border-[#ECECEC]">
            Queued
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-150">
      {/* Header Banner - Editorial Headline */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#ECECEC]">
        <div>
          <div className="text-xs uppercase font-sans font-medium tracking-wider text-[#979799]">
            {organization?.name || 'Workspace'}
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-normal text-[#17191C] mt-1 tracking-tight">
            Issuance Analytics & Batches
          </h2>
          <p className="text-sm text-[#777B86] mt-1">
            Real-time credential telemetry, cryptographic sealing rates, and batch lifecycles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/jobs/new"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#17191C] hover:bg-[#2C2F35] text-[#FFFFFF] text-xs font-medium rounded-full shadow-sm transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Generation Batch</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row (Steep Floating Artifacts at 24px radius) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1 */}
        <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#ECECEC] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[#979799] font-sans font-medium">Total Issued</span>
            <div className="w-8 h-8 rounded-full bg-[#F2F2F3] flex items-center justify-center text-[#17191C]">
              <Award className="w-4 h-4 text-[#5D2A1A]" />
            </div>
          </div>
          <div className="font-serif text-3xl text-[#17191C] mt-3">
            {statsLoading ? '—' : stats?.total_certificates ?? 0}
          </div>
          <span className="text-xs text-[#777B86] mt-1 block">
            Cryptographically sealed credentials
          </span>
        </div>

        {/* Card 2 */}
        <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#ECECEC] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[#979799] font-sans font-medium">Batches Handled</span>
            <div className="w-8 h-8 rounded-full bg-[#F2F2F3] flex items-center justify-center text-[#17191C]">
              <Layers className="w-4 h-4 text-[#5D2A1A]" />
            </div>
          </div>
          <div className="font-serif text-3xl text-[#17191C] mt-3">
            {statsLoading ? '—' : stats?.total_jobs ?? 0}
          </div>
          <span className="text-xs text-[#777B86] mt-1 block">
            {statsLoading ? '—' : `${stats?.active_jobs ?? 0} currently processing`}
          </span>
        </div>

        {/* Card 3 */}
        <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#ECECEC] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[#979799] font-sans font-medium">Success Rate</span>
            <div className="w-8 h-8 rounded-full bg-[#2E7D32]/10 flex items-center justify-center text-[#2E7D32]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-3xl text-[#2E7D32] mt-3">
            {statsLoading ? '—' : `${stats?.success_rate ?? 100}%`}
          </div>
          <span className="text-xs text-[#777B86] mt-1 block">
            {stats?.successful_certificates ?? 0} validated records
          </span>
        </div>

        {/* Card 4 - Steep Accent Blush Peach Card */}
        <div className="bg-[#FBE1D1] text-[#5D2A1A] p-6 rounded-[24px] border border-[#F5CBB2] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[#5D2A1A]/80 font-sans font-semibold">Isolated Failures</span>
            <div className="w-8 h-8 rounded-full bg-[#5D2A1A]/10 flex items-center justify-center text-[#5D2A1A]">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-3xl text-[#5D2A1A] mt-3">
            {statsLoading ? '—' : stats?.failed_certificates ?? 0}
          </div>
          <span className="text-xs text-[#5D2A1A]/80 mt-1 block font-medium">
            Eligible for single-click retry
          </span>
        </div>
      </div>

      {/* Main Grid: Recent Batches & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Jobs Table (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-normal text-[#17191C]">Recent Generation Batches</h3>
            <Link to="/jobs/new" className="text-xs font-medium text-[#17191C] hover:underline flex items-center gap-1">
              <span>New Batch</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-[#FFFFFF] border border-[#ECECEC] rounded-[24px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            {jobsLoading ? (
              <div className="p-16 text-center text-xs text-[#777B86]">Loading batch records...</div>
            ) : !jobs || jobs.length === 0 ? (
              <div className="p-16 text-center space-y-4">
                <div className="w-12 h-12 bg-[#F2F2F3] rounded-full flex items-center justify-center mx-auto text-[#777B86]">
                  <Award className="w-6 h-6 text-[#5D2A1A]" />
                </div>
                <h4 className="font-serif text-lg font-normal text-[#17191C]">No certificate jobs yet</h4>
                <p className="text-xs text-[#777B86] max-w-sm mx-auto">
                  Create your first batch of credentials by uploading a recipient CSV.
                </p>
                <Link
                  to="/jobs/new"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#17191C] hover:bg-[#2C2F35] text-[#FFFFFF] text-xs font-medium rounded-full shadow-sm transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Start First Batch</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFAFB] border-b border-[#ECECEC] text-[#777B86] uppercase font-sans text-[11px] tracking-wider select-none">
                    <tr>
                      <th className="px-6 py-3.5 font-medium">Event / Batch</th>
                      <th className="px-6 py-3.5 font-medium">Recipients</th>
                      <th className="px-6 py-3.5 font-medium">Status</th>
                      <th className="px-6 py-3.5 font-medium">Progress</th>
                      <th className="px-6 py-3.5 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECECEC]">
                    {jobs.slice(0, 8).map((job: GenerationJob) => (
                      <tr key={job.id} className="hover:bg-[#FAFAFB] transition-colors">
                        <td className="px-6 py-4">
                          <Link to={`/jobs/${job.id}`} className="font-medium text-[#17191C] hover:underline transition-colors text-sm">
                            {job.event_name}
                          </Link>
                          <div className="text-[11px] text-[#777B86] mt-0.5">
                            {job.issuer_name} • {job.issue_date}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono font-medium text-[#17191C]">{job.total_count}</span>
                          <span className="text-[#777B86] ml-1">recipients</span>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(job.status)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-32 space-y-1.5">
                            <div className="flex justify-between text-[11px] font-mono text-[#777B86]">
                              <span>{job.success_count}/{job.total_count}</span>
                              <span className="text-[#17191C] font-semibold">{job.completion_percentage}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-[#F2F2F3] rounded-full overflow-hidden border border-[#ECECEC]">
                              <div
                                className="h-full bg-[#17191C] rounded-full transition-all duration-300"
                                style={{ width: `${job.completion_percentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to={`/jobs/${job.id}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F2F2F3] hover:bg-[#17191C] hover:text-[#FFFFFF] text-[#17191C] rounded-full text-xs font-medium transition-all"
                          >
                            <span>Manage</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Audit Log Feed (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-normal text-[#17191C]">Security & Audit Activity</h3>
            <Link to="/audit" className="text-xs font-medium text-[#777B86] hover:text-[#17191C]">
              View All →
            </Link>
          </div>

          <div className="bg-[#FFFFFF] border border-[#ECECEC] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
            {!auditEvents || auditEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#777B86]">
                No security audit events recorded.
              </div>
            ) : (
              <div className="space-y-4">
                {auditEvents.slice(0, 6).map((event) => (
                  <div key={event.id} className="flex items-start gap-3.5 text-xs pb-4 border-b border-[#ECECEC] last:border-0 last:pb-0">
                    <div className="w-7 h-7 rounded-full bg-[#F2F2F3] flex items-center justify-center shrink-0 mt-0.5 text-[#5D2A1A]">
                      <History className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-medium text-[#17191C] truncate">
                          {event.action}
                        </span>
                        <span className="text-[10px] text-[#979799] font-mono">
                          {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#777B86] truncate mt-0.5 font-mono">
                        {event.actor_email || 'system'} • {event.resource_type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

