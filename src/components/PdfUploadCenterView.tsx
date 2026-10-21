/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { ExaminingBodyId, ProcessingJob, Question } from '../types';
import scannerImg from '../assets/images/pdf_scanner_diagram_1792592295901.jpg';

export const PdfUploadCenterView: React.FC = () => {
  const {
    examiningBodies,
    processingJobs,
    addProcessingJob,
    updateProcessingJobStatus,
    setActiveTab,
    addNewPaperWithQuestions,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [examiningBody, setExaminingBody] = useState<ExaminingBodyId>('PPSC');
  const [examName, setExamName] = useState('General Recruitment Examination');
  const [year, setYear] = useState<number>(2026);
  const [paperNumber, setPaperNumber] = useState('Paper 01');
  const [language, setLanguage] = useState<'English' | 'Urdu' | 'Bilingual'>('Bilingual');
  const [hasAnswerKey, setHasAnswerKey] = useState(true);

  // Ingestion status
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractionResult, setExtractionResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setErrorMessage('Please select a valid PDF document (.pdf format)');
        return;
      }
      setErrorMessage(null);
      setSelectedFile(file);

      const reader = new FileReader();
      reader.onload = () => {
        setFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Sample Past Paper Ingestion for Instant Testing
  const handleLoadSamplePdf = () => {
    setSelectedFile(
      new File(['%PDF-1.4 sample content'], 'PPSC_Tehsildar_2026_Sample.pdf', {
        type: 'application/pdf',
      })
    );
    setExaminingBody('PPSC');
    setExamName('Tehsildar & Naib Tehsildar (Land Records)');
    setYear(2026);
    setPaperNumber('Paper 03');
    setLanguage('Bilingual');
    setErrorMessage(null);
  };

  const handleStartIngestion = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select or load a past paper PDF file first.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setExtractionResult(null);

    const jobId = `job-${Date.now()}`;
    const initialJob: ProcessingJob = {
      id: jobId,
      fileName: selectedFile.name,
      fileSizeBytes: selectedFile.size,
      examiningBodyId: examiningBody,
      examName,
      year,
      paperNumber,
      language,
      status: 'Processing',
      totalPages: 4,
      extractedQuestionsCount: 0,
      confidenceScore: 0,
      uploadedAt: Date.now(),
    };

    addProcessingJob(initialJob);

    try {
      // Sample extracted text representing real Pakistani past paper items
      const sampleScannedText = `
PUNJAB PUBLIC SERVICE COMMISSION (PPSC)
RECRUITMENT TEST FOR THE POST OF TEHSILDAR / NAIB TEHSILDAR - 2026

Q1. The Objective Resolution was passed by the Constituent Assembly of Pakistan on which date?
(A) 12 March 1949
(B) 14 August 1947
(C) 23 March 1940
(D) 8 June 1956
[Answer Key: A]

Q2. Who was the Prime Minister of Pakistan during the signing of the Tashkent Declaration in 1966?
(A) Ayub Khan
(B) Liaquat Ali Khan
(C) Zulfikar Ali Bhutto
(D) Malik Feroz Khan Noon
[Answer Key: A]

Q3. قرآن پاک میں کس نبی کا نام سب سے زیادہ مرتبہ آیا ہے؟
(A) حضرت ابراہیم علیہ السلام
(B) حضرت موسیٰ علیہ السلام
(C) حضرت عیسیٰ علیہ السلام
(D) حضرت نوح علیہ السلام
[Answer Key: B]

Q4. What is the approximate speed of sound in dry air at 20°C?
(A) 343 meters per second
(B) 299,792 km/s
(C) 1500 meters per second
(D) 120 meters per second
[Answer Key: A]

Q5. Ambiguous past paper scan question with disputed key:
(A) Option One
(B) Option Two
(C) Option Three
(D) Option Four
      `;

      const response = await fetch('/api/gemini/extract-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: fileBase64,
          sampleText: sampleScannedText,
          examMetadata: {
            examiningBody,
            examName,
            year,
            paperNumber,
          },
        }),
      });

      const data = await response.json();

      if (data.questions && data.questions.length > 0) {
        // Map into questions
        const newQuestions: Question[] = data.questions.map((item: any, idx: number) => ({
          id: `q-ingest-${Date.now()}-${idx}`,
          paperId: `paper-${jobId}`,
          questionNumber: item.questionNumber || idx + 1,
          questionText: item.questionText,
          language: item.language || 'English',
          options: item.options.map((opt: any) => ({
            id: `opt-${Date.now()}-${opt.label}`,
            label: opt.label,
            text: opt.text,
          })),
          correctOptionLabel: item.correctOptionLabel,
          verificationStatus:
            item.extractionConfidence >= 0.9 && item.correctOptionLabel
              ? 'Verified'
              : 'Needs Review',
          subject: (item.subject as any) || 'General Knowledge',
          sourcePage: 1,
          extractionConfidence: item.extractionConfidence || 0.85,
          explanation: item.detectedExplanation,
        }));

        setExtractionResult({
          count: newQuestions.length,
          questions: newQuestions,
        });

        updateProcessingJobStatus(jobId, 'Needs Review');

        // Automatically create draft paper in library
        addNewPaperWithQuestions(
          {
            id: `paper-${jobId}`,
            title: `${examiningBody} ${examName} - ${year}`,
            paperNumber,
            examiningBodyId: examiningBody,
            examinationName: examName,
            year,
            subjectOrCategory: 'General Ingested Paper',
            totalQuestions: newQuestions.length,
            durationMinutes: 90,
            negativeMarking: examiningBody === 'PPSC' || examiningBody === 'SPSC' ? 0.25 : 0,
            verificationStatus: 'Needs Review',
            sourcePdfName: selectedFile.name,
          },
          newQuestions
        );
      } else {
        updateProcessingJobStatus(jobId, 'Failed');
        setErrorMessage(data.error || 'Failed to extract questions from document.');
      }
    } catch (err: any) {
      console.error('Extraction error:', err);
      updateProcessingJobStatus(jobId, 'Failed');
      setErrorMessage(err.message || 'Network error occurred during PDF processing.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          PDF Past Paper Ingestion & OCR Center
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload and convert scanned Pakistani past examination papers into structured digital MCQs using Gemini OCR.
        </p>
      </div>

      {/* Main Grid: Upload Form + Processing Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload & Metadata Card */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Upload Past Examination Paper
            </h2>
            <button
              onClick={handleLoadSamplePdf}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md"
            >
              Load Sample Past Paper
            </button>
          </div>

          {/* Drag & Drop Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-emerald-500/70 bg-slate-50 hover:bg-slate-50/80 rounded-xl p-8 text-center cursor-pointer transition-colors space-y-3"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-emerald-600 shadow-2xs">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {selectedFile ? selectedFile.name : 'Click or drag and drop past paper PDF'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Supports single or multi-page scanned PDF documents with unlimited-scale chunk streaming
              </p>
            </div>
          </div>

          {/* Metadata Assignment Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Examining Commission</label>
              <select
                value={examiningBody}
                onChange={(e: any) => setExaminingBody(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {examiningBodies.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.province})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Examination Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value={2026}>2026 (Upcoming & Latest)</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
                <option value={2023}>2023</option>
                <option value={2022}>2022</option>
                <option value={2021}>2021</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Examination Name</label>
              <input
                type="text"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g. Tehsildar, AD FIA, PMS..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Paper Sequence</label>
              <input
                type="text"
                value={paperNumber}
                onChange={(e) => setPaperNumber(e.target.value)}
                placeholder="e.g. Paper 01, Paper 02..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Language Content</label>
              <select
                value={language}
                onChange={(e: any) => setLanguage(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Bilingual">Bilingual (English & Urdu)</option>
                <option value="English">English Only</option>
                <option value="Urdu">Urdu (Nastaliq RTL)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Answer Key Attachment</label>
              <select
                value={hasAnswerKey ? 'attached' : 'separate'}
                onChange={(e) => setHasAnswerKey(e.target.value === 'attached')}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="attached">Official Key on Paper</option>
                <option value="separate">Needs Separate Gazette Review</option>
              </select>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              {errorMessage}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleStartIngestion}
            disabled={isProcessing}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                Extracting & Parsing with Gemini OCR...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Ingest & Process Past Paper
              </>
            )}
          </button>

          {/* Success Callout */}
          {extractionResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Successfully Extracted {extractionResult.count} Questions!
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                The questions have been structured with 4 options and mapped to their respective subjects. They are now queued in the Admin Review Console for verification.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setActiveTab('admin')}
                  className="px-3.5 py-1.5 bg-emerald-700 text-white text-xs font-semibold rounded-md hover:bg-emerald-800 transition-colors"
                >
                  Open Admin Review Queue
                </button>
                <button
                  onClick={() => setActiveTab('papers')}
                  className="px-3.5 py-1.5 bg-white border border-emerald-300 text-emerald-900 text-xs font-semibold rounded-md hover:bg-emerald-50 transition-colors"
                >
                  View in Library
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Processing Diagram & Ingestion Queue */}
        <div className="lg:col-span-5 space-y-6">
          {/* Visual Architecture Diagram */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Document Processing Architecture
            </h3>
            <div className="rounded-lg overflow-hidden border border-slate-100 bg-slate-50 aspect-4/3">
              <img
                src={scannerImg}
                alt="Document OCR processing pipeline illustration"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every past paper passes through image pre-processing, text detection, question segmentation, and answer-key validation.
            </p>
          </div>

          {/* Ingestion Queue */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Recent Processing Jobs ({processingJobs.length})
            </h3>

            <div className="space-y-3">
              {processingJobs.slice(0, 4).map((job) => (
                <div
                  key={job.id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span className="truncate max-w-[65%]">{job.fileName}</span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                        job.status === 'Verified' || job.status === 'Published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : job.status === 'Needs Review'
                          ? 'bg-amber-100 text-amber-800'
                          : job.status === 'Processing'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>
                      {job.examiningBodyId} · {job.year}
                    </span>
                    <span className="font-mono">
                      {job.extractedQuestionsCount} MCQs · {Math.round(job.confidenceScore * 100)}% conf
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
