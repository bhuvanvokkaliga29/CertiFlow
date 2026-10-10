import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi } from '../lib/api';
import { 
  Upload, 
  AlertCircle, 
  Download, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import type { CSVValidationResult, RecipientInput } from '../types';

export const CreateJobPage: React.FC = () => {
  const navigate = useNavigate();

  // Wizard state: Step 1 (Event details), Step 2 (Recipient data), Step 3 (Review & Dispatch)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Form state
  const [eventName, setEventName] = useState('');
  const [issuerName, setIssuerName] = useState('Acme Innovation Lab');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [achievementDescription, setAchievementDescription] = useState('Certificate of Achievement');
  const [signatoryName, setSignatoryName] = useState('Dr. Elena Vance');
  const [signatoryTitle, setSignatoryTitle] = useState('Head of Engineering');

  // Step 2: Data Input mode ('csv' | 'json')
  const [inputMode, setInputMode] = useState<'csv' | 'json'>('csv');
  const [jsonText, setJsonText] = useState(
    JSON.stringify(
      [
        { full_name: 'Alice Johnson', email: 'alice@example.com', institution: 'MIT', achievement: 'Distinction' },
        { full_name: 'Bob Smith', email: 'bob@example.com', institution: 'Stanford', achievement: 'Honors' },
      ],
      null,
      2
    )
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvValidation, setCsvValidation] = useState<CSVValidationResult | null>(null);
  const [csvValidating, setCsvValidating] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Step 3: Validated state and submission
  const [validatedRecipients, setValidatedRecipients] = useState<RecipientInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Step 1 validation
  const handleNextFromStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim() || !issuerName.trim() || !issueDate) {
      alert('Please fill in required event information.');
      return;
    }
    setCurrentStep(2);
  };

  const processCsvFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Only CSV files (.csv extension) are accepted.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File exceeds maximum upload size of 25MB.');
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    setCsvValidating(true);

    try {
      const res = await jobsApi.validateCsv(file);
      setCsvValidation(res);

      if (res.valid_recipients && res.valid_recipients.length > 0) {
        setValidatedRecipients(res.valid_recipients);
      } else if (res.preview && res.preview.length > 0) {
        const rows: RecipientInput[] = res.preview.map((p) => ({
          full_name: p.full_name || p.name || p.recipient_name || '',
          email: p.email || undefined,
          institution: p.institution || p.organization || undefined,
          achievement: p.achievement || undefined,
        })).filter((r) => !!r.full_name);
        setValidatedRecipients(rows);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to parse and validate CSV file.';
      setUploadError(msg);
      setCsvValidation(null);
    } finally {
      setCsvValidating(false);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processCsvFile(file);
  };

  const handleNextFromStep2 = () => {
    if (inputMode === 'json') {
      try {
        const parsed = JSON.parse(jsonText);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          alert('JSON must be a non-empty array of recipient objects.');
          return;
        }
        for (const item of parsed) {
          if (!item.full_name || typeof item.full_name !== 'string' || !item.full_name.trim()) {
            alert('Each recipient in JSON must have a non-empty "full_name".');
            return;
          }
        }
        setValidatedRecipients(parsed);
        setCurrentStep(3);
      } catch (err) {
        alert('Invalid JSON syntax. Please check formatting.');
      }
    } else {
      if (!csvValidation || validatedRecipients.length === 0) {
        alert('Please upload and validate a CSV with at least one eligible recipient.');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleSubmitJob = async () => {
    if (isSubmitting) return; // Prevent duplicate submissions
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const job = await jobsApi.create({
        event_name: eventName,
        issuer_name: issuerName,
        issue_date: issueDate,
        achievement_description: achievementDescription || undefined,
        signatory_name: signatoryName || undefined,
        signatory_title: signatoryTitle || undefined,
        recipients: validatedRecipients,
      });
      const targetId = job.id || job.job_id;
      navigate(`/jobs/${targetId}`);
    } catch (err: any) {
      setSubmissionError(err.response?.data?.detail || 'Job creation failed.');
      setIsSubmitting(false);
    }
  };

  const downloadSampleCsv = () => {
    const sample = 'full_name,email,institution,achievement\nAlice Johnson,alice@example.com,MIT,Distinction in Research\nBob Smith,bob@example.com,Stanford,Outstanding Achievement\nCharlie Brown,charlie@example.com,Oxford,First Class Honors\nDiana Prince,diana@example.com,Columbia,Fellowship Recipient';
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_recipients.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Wizard Header & Stepper */}
      <div className="border-b border-[#ECECEC] pb-6">
        <span className="text-xs uppercase tracking-wider font-sans font-medium text-[#979799]">
          Issuance Workflow
        </span>
        <h1 className="text-3xl md:text-4xl font-serif font-normal text-[#17191C] tracking-tight mt-1">
          Issue New Certificate Batch
        </h1>
        <p className="text-sm text-[#777B86] mt-1.5 font-sans max-w-2xl">
          Define event authority metadata, validate recipient records against the schema, and dispatch asynchronous generation.
        </p>

        {/* Steep Stepper */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
          {[
            { step: 1, label: 'Event Authority', desc: 'Metadata & signatures' },
            { step: 2, label: 'Recipient Roster', desc: 'CSV or JSON dataset' },
            { step: 3, label: 'Review & Dispatch', desc: 'Verify and generate' },
          ].map((s) => (
            <div
              key={s.step}
              className={`flex items-center gap-3 p-3.5 rounded-[16px] border transition-all ${
                currentStep === s.step
                  ? 'bg-white border-[#17191C] shadow-sm'
                  : currentStep > s.step
                  ? 'bg-[#F2F2F3] border-transparent text-[#17191C]'
                  : 'bg-[#FAFAFB] border-[#ECECEC] text-[#979799]'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-sans text-xs font-medium shrink-0 ${
                  currentStep === s.step
                    ? 'bg-[#17191C] text-white'
                    : currentStep > s.step
                    ? 'bg-[#17191C] text-white'
                    : 'bg-[#ECECEC] text-[#777B86]'
                }`}
              >
                {currentStep > s.step ? '✓' : s.step}
              </div>
              <div className="min-w-0">
                <div className={`text-xs font-medium truncate ${currentStep >= s.step ? 'text-[#17191C]' : 'text-[#777B86]'}`}>
                  {s.label}
                </div>
                <div className="text-[11px] text-[#979799] truncate">
                  {s.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Event & Issuer Metadata */}
      {currentStep === 1 && (
        <form onSubmit={handleNextFromStep1} className="bg-white border border-[#ECECEC] rounded-[24px] p-6 md:p-8 space-y-6 shadow-sm">
          <div className="border-b border-[#ECECEC] pb-4">
            <h2 className="text-xl font-serif font-normal text-[#17191C]">Step 1 — Event & Authority Details</h2>
            <p className="text-xs text-[#777B86] mt-0.5">
              These verified parameters will be stamped into the cryptographic certificate layout and public ledger.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div className="space-y-1.5 md:col-span-2">
              <label className="block font-medium text-[#17191C]">
                Event / Program Name *
              </label>
              <input
                type="text"
                required
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. Global Distributed Systems Summit 2026"
                className="w-full p-3 bg-white border border-[#ECECEC] rounded-[16px] focus:outline-none focus:border-[#17191C] text-[#17191C] placeholder-[#A3A6AF] text-sm transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-medium text-[#17191C]">
                Issuing Organization *
              </label>
              <input
                type="text"
                required
                value={issuerName}
                onChange={(e) => setIssuerName(e.target.value)}
                placeholder="e.g. Acme Innovation Lab"
                className="w-full p-3 bg-white border border-[#ECECEC] rounded-[16px] focus:outline-none focus:border-[#17191C] text-[#17191C] placeholder-[#A3A6AF] text-sm transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-medium text-[#17191C]">
                Date of Issuance *
              </label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full p-3 bg-white border border-[#ECECEC] rounded-[16px] focus:outline-none focus:border-[#17191C] text-[#17191C] text-sm transition-colors font-mono"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block font-medium text-[#17191C]">
                Achievement Title / Description *
              </label>
              <input
                type="text"
                required
                value={achievementDescription}
                onChange={(e) => setAchievementDescription(e.target.value)}
                placeholder="e.g. Certificate of Excellence & Outstanding Contribution"
                className="w-full p-3 bg-white border border-[#ECECEC] rounded-[16px] focus:outline-none focus:border-[#17191C] text-[#17191C] placeholder-[#A3A6AF] text-sm transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-medium text-[#17191C]">
                Authorized Signatory Name *
              </label>
              <input
                type="text"
                required
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                placeholder="e.g. Dr. Elena Vance"
                className="w-full p-3 bg-white border border-[#ECECEC] rounded-[16px] focus:outline-none focus:border-[#17191C] text-[#17191C] placeholder-[#A3A6AF] text-sm transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-medium text-[#17191C]">
                Signatory Title
              </label>
              <input
                type="text"
                value={signatoryTitle}
                onChange={(e) => setSignatoryTitle(e.target.value)}
                placeholder="e.g. Head of Engineering"
                className="w-full p-3 bg-white border border-[#ECECEC] rounded-[16px] focus:outline-none focus:border-[#17191C] text-[#17191C] placeholder-[#A3A6AF] text-sm transition-colors"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end border-t border-[#ECECEC]">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#17191C] hover:bg-black text-white text-xs font-medium rounded-full shadow-sm transition-colors"
            >
              <span>Continue to Recipients</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Recipient Data Input */}
      {currentStep === 2 && (
        <div className="bg-white border border-[#ECECEC] rounded-[24px] p-6 md:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ECECEC] pb-4">
            <div>
              <h2 className="text-xl font-serif font-normal text-[#17191C]">Step 2 — Recipient Roster</h2>
              <p className="text-xs text-[#777B86] mt-0.5">
                Supply recipient names via structured CSV spreadsheet or structured JSON array.
              </p>
            </div>

            {/* Input Mode Toggle (Segmented Pill) */}
            <div className="flex bg-[#F2F2F3] p-1 rounded-full text-xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setInputMode('csv')}
                className={`px-4 py-1.5 rounded-full transition-all ${
                  inputMode === 'csv'
                    ? 'bg-white text-[#17191C] font-medium shadow-xs'
                    : 'text-[#777B86] hover:text-[#17191C]'
                }`}
              >
                CSV Upload
              </button>
              <button
                type="button"
                onClick={() => setInputMode('json')}
                className={`px-4 py-1.5 rounded-full transition-all ${
                  inputMode === 'json'
                    ? 'bg-white text-[#17191C] font-medium shadow-xs'
                    : 'text-[#777B86] hover:text-[#17191C]'
                }`}
              >
                JSON Array
              </button>
            </div>
          </div>

          {inputMode === 'csv' ? (
            <div className="space-y-5">
              {/* CSV Upload Dropzone */}
              <div className="border border-dashed border-[#DCDCDC] hover:border-[#17191C] bg-[#FAFAFB] rounded-[20px] p-8 md:p-10 text-center space-y-3 transition-colors">
                <div className="w-12 h-12 rounded-full bg-white border border-[#ECECEC] shadow-xs flex items-center justify-center mx-auto text-[#17191C]">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <span className="text-sm font-medium text-[#17191C] underline underline-offset-2 hover:opacity-80">
                      Select CSV file
                    </span>
                    <span className="text-sm text-[#777B86]"> or drag and drop</span>
                  </label>
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-[#777B86] mt-1.5 font-sans">
                    Required column: <code className="bg-[#F2F2F3] text-[#17191C] px-1.5 py-0.5 rounded text-[11px]">full_name</code>. Optional: <code className="bg-[#F2F2F3] text-[#17191C] px-1.5 py-0.5 rounded text-[11px]">email</code>, <code className="bg-[#F2F2F3] text-[#17191C] px-1.5 py-0.5 rounded text-[11px]">institution</code>, <code className="bg-[#F2F2F3] text-[#17191C] px-1.5 py-0.5 rounded text-[11px]">achievement</code>
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={downloadSampleCsv}
                    className="inline-flex items-center gap-1.5 text-xs text-[#17191C] bg-white hover:bg-[#F2F2F3] border border-[#ECECEC] px-4 py-2 rounded-full transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-[#777B86]" />
                    <span>Download sample CSV template</span>
                  </button>
                </div>
              </div>

              {/* Upload Error Alert */}
              {uploadError && (
                <div className="p-4 bg-[#FBE1D1] text-[#5D2A1A] rounded-[16px] text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#5D2A1A]" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Validating Spinner */}
              {csvValidating && (
                <div className="p-5 bg-[#FAFAFB] border border-[#ECECEC] rounded-[16px] text-xs text-[#777B86] flex items-center justify-center gap-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-[#17191C]" />
                  <span>Parsing and validating CSV recipient records...</span>
                </div>
              )}

              {/* Validation Result Box */}
              {csvValidation && !csvValidating && (
                <div className="p-5 bg-[#F2F2F3] rounded-[20px] space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-medium text-[#17191C]">
                      <FileSpreadsheet className="w-4 h-4 text-[#17191C]" />
                      <span>{selectedFile?.name || 'recipients.csv'}</span>
                    </div>
                    <span className="text-xs font-mono font-medium text-[#17191C] bg-white px-2.5 py-1 rounded-full border border-[#ECECEC]">
                      {csvValidation.valid_rows} valid records
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="bg-white p-3.5 rounded-[16px] border border-[#ECECEC]">
                      <div className="text-[#777B86] text-[10px] uppercase font-mono tracking-wider">Total Rows</div>
                      <div className="font-semibold text-lg text-[#17191C] font-mono mt-0.5">{csvValidation.total_rows}</div>
                    </div>
                    <div className="bg-white p-3.5 rounded-[16px] border border-[#ECECEC]">
                      <div className="text-[#777B86] text-[10px] uppercase font-mono tracking-wider">Invalid Rows</div>
                      <div className={`font-semibold text-lg font-mono mt-0.5 ${csvValidation.invalid_rows > 0 ? 'text-[#5D2A1A]' : 'text-[#17191C]'}`}>
                        {csvValidation.invalid_rows}
                      </div>
                    </div>
                    <div className="bg-white p-3.5 rounded-[16px] border border-[#ECECEC]">
                      <div className="text-[#777B86] text-[10px] uppercase font-mono tracking-wider">Duplicates</div>
                      <div className="font-semibold text-lg text-[#17191C] font-mono mt-0.5">{csvValidation.duplicate_rows}</div>
                    </div>
                  </div>

                  {(() => {
                    const errorList = csvValidation.errors || csvValidation.row_errors || [];
                    if (errorList.length === 0) return null;
                    return (
                      <div className="p-4 bg-[#FBE1D1] text-[#5D2A1A] rounded-[16px] text-xs space-y-1.5">
                        <div className="font-medium">Validation Issues Detected ({errorList.length}):</div>
                        {errorList.slice(0, 5).map((err, i) => (
                          <div key={i} className="text-[11px] font-mono">
                            Row {err.row || err.row_number || (i + 1)}: {err.message || (err.errors ? err.errors.join(', ') : 'Validation error')}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#17191C]">
                Recipient JSON Array
              </label>
              <textarea
                rows={10}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="w-full font-mono text-xs p-4 bg-white border border-[#ECECEC] rounded-[16px] focus:outline-none focus:border-[#17191C] text-[#17191C]"
              />
              <span className="text-xs text-[#777B86] block">
                Must be a valid JSON array of objects with <code className="font-mono">full_name</code> and optional <code className="font-mono">email</code>, <code className="font-mono">institution</code>, <code className="font-mono">achievement</code>.
              </span>
            </div>
          )}

          <div className="pt-4 flex items-center justify-between border-t border-[#ECECEC]">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#17191C] text-[#17191C] hover:bg-[#F2F2F3] rounded-full text-xs font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleNextFromStep2}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#17191C] hover:bg-black text-white text-xs font-medium rounded-full shadow-sm transition-colors"
            >
              <span>Review & Validate</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Validate and Review */}
      {currentStep === 3 && (
        <div className="bg-white border border-[#ECECEC] rounded-[24px] p-6 md:p-8 space-y-6 shadow-sm">
          <div className="border-b border-[#ECECEC] pb-4">
            <h2 className="text-xl font-serif font-normal text-[#17191C]">Step 3 — Review Batch Summary & Confirm</h2>
            <p className="text-xs text-[#777B86] mt-0.5">
              Verify batch metadata and preview recipient entries before triggering background rendering tasks.
            </p>
          </div>

          {submissionError && (
            <div className="p-4 bg-[#FBE1D1] text-[#5D2A1A] text-xs rounded-[16px] flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#5D2A1A]" />
              <span>{submissionError}</span>
            </div>
          )}

          {/* Batch Summary Box */}
          <div className="bg-[#F2F2F3] rounded-[20px] p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[#777B86] text-[10px] uppercase font-mono tracking-wider">Event Name</span>
                <div className="font-medium text-[#17191C] truncate mt-1 text-sm">{eventName}</div>
              </div>
              <div>
                <span className="text-[#777B86] text-[10px] uppercase font-mono tracking-wider">Authority</span>
                <div className="font-medium text-[#17191C] truncate mt-1 text-sm">{issuerName}</div>
              </div>
              <div>
                <span className="text-[#777B86] text-[10px] uppercase font-mono tracking-wider">Issuance Date</span>
                <div className="font-mono text-[#17191C] mt-1 text-sm">{issueDate}</div>
              </div>
              <div>
                <span className="text-[#777B86] text-[10px] uppercase font-mono tracking-wider">Recipients</span>
                <div className="font-mono font-medium text-[#17191C] mt-1 text-sm">{validatedRecipients.length} records</div>
              </div>
            </div>
          </div>

          {/* Recipient Preview Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#17191C]">
                Previewing Eligible Recipients ({validatedRecipients.length} total queued)
              </span>
            </div>
            <div className="border border-[#ECECEC] rounded-[16px] overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFB] border-b border-[#ECECEC] text-[#777B86] text-[10px] uppercase font-mono font-medium select-none">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Full Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Institution</th>
                    <th className="px-4 py-3">Achievement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECECEC]">
                  {validatedRecipients.slice(0, 15).map((r, i) => (
                    <tr key={i} className="hover:bg-[#FAFAFB]">
                      <td className="px-4 py-2.5 text-[#777B86] font-mono">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-[#17191C]">{r.full_name}</td>
                      <td className="px-4 py-2.5 text-[#777B86] font-mono">{r.email || '—'}</td>
                      <td className="px-4 py-2.5 text-[#777B86]">{r.institution || '—'}</td>
                      <td className="px-4 py-2.5 text-[#777B86]">{r.achievement || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {validatedRecipients.length > 15 && (
              <span className="text-xs text-[#777B86] font-sans block">
                + {validatedRecipients.length - 15} additional records queued for batch rendering.
              </span>
            )}
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-[#ECECEC]">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#17191C] text-[#17191C] hover:bg-[#F2F2F3] rounded-full text-xs font-medium transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitJob}
              className="inline-flex items-center gap-2 px-7 py-3 bg-[#17191C] hover:bg-black text-white text-xs font-medium rounded-full shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching Generation Job...</span>
                </>
              ) : (
                <>
                  <span>Dispatch Certificate Generation</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
