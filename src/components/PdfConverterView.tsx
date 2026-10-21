/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Edit3,
  Play,
  RotateCcw,
  Layers,
  FileCheck,
  Eye,
  Trash2,
  Save,
  Loader2,
  Trophy,
  XCircle,
  BarChart3,
  BookOpen,
  Bookmark,
  Link,
  Video,
  RefreshCw,
  HardDrive,
  Check,
  ListPlus,
  Send,
  Zap,
  Search,
  Tag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Question, ExaminingBodyId, ProcessingJob, SystemLimitsResponse, DocumentOutline, DocumentChapter } from '../types';
import { InteractiveMcqCard } from './InteractiveMcqCard';
import { VideoTranscriptModal } from './VideoTranscriptModal';
import {
  uploadFileInChunks,
  importFromPublicUrl,
  fetchSystemLimits,
  retryJob,
  cancelJob,
  fetchDocumentOutline,
  generateChapterQuestions,
  UploadProgressEvent,
} from '../utils/chunkedUploader';
import scannerDiagramImg from '../assets/images/pdf_scanner_diagram_1792592295901.jpg';

type ConverterStage = 'upload' | 'outline' | 'processing' | 'review' | 'quiz' | 'results';
type IngestionMode = 'upload_files' | 'import_url' | 'presets' | 'queue';

interface QueuedUploadItem {
  id: string;
  file: File;
  progress?: UploadProgressEvent;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'paused';
  errorMessage?: string;
  jobId?: string;
}

export const PdfConverterView: React.FC = () => {
  const {
    examiningBodies,
    addNewPaperWithQuestions,
    updateQuestion,
    toggleBookmark,
    bookmarks,
    startPracticeSession,
    setActiveTab,
    processingJobs,
    refreshJobsFromServer,
    publishJobQuestionsToPaper,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Workflow stage
  const [currentStage, setCurrentStage] = useState<ConverterStage>('upload');
  const [ingestionMode, setIngestionMode] = useState<IngestionMode>('upload_files');

  // Deployment limits
  const [limits, setLimits] = useState<SystemLimitsResponse | null>(null);

  // Upload Form Metadata
  const [conversionMode, setConversionMode] = useState<'extract_past_paper' | 'generate_from_content'>('extract_past_paper');
  const [documentType, setDocumentType] = useState<'digital' | 'scanned'>('digital');
  const [examiningBody, setExaminingBody] = useState<ExaminingBodyId>('PPSC');
  const [examName, setExamName] = useState('Tehsildar & Naib Tehsildar');
  const [year, setYear] = useState<number>(2026);
  const [paperNumber, setPaperNumber] = useState('Paper 01');

  // Multi-file queue
  const [queuedFiles, setQueuedFiles] = useState<QueuedUploadItem[]>([]);
  const [isBatchUploading, setIsBatchUploading] = useState(false);

  // URL Ingestion Form
  const [urlInput, setUrlInput] = useState('');
  const [urlIsImporting, setUrlIsImporting] = useState(false);
  const [urlErrorMessage, setUrlErrorMessage] = useState<string | null>(null);
  const [urlSuccessMessage, setUrlSuccessMessage] = useState<string | null>(null);

  // Live Processing State (for active job)
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJobStatusMessage, setActiveJobStatusMessage] = useState<string>('Initializing pipeline...');
  const [rawTextPreview, setRawTextPreview] = useState<string>('');
  const [extractedQuestions, setExtractedQuestions] = useState<Question[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // In-quiz State
  const [quizQuestionIndex, setQuizQuestionIndex] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D' | 'E'>>({});
  const [resultsFilter, setResultsFilter] = useState<'all' | 'correct' | 'incorrect' | 'bookmarked'>('all');
  const [negativeMarkingEnabled, setNegativeMarkingEnabled] = useState<boolean>(true);

  // Question editing modal in review stage
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Video transcript modal state
  const [inspectingVideoJob, setInspectingVideoJob] = useState<ProcessingJob | null>(null);

  // Document Outline & Targeted Chapter Generation State
  const [documentOutline, setDocumentOutline] = useState<DocumentOutline | null>(null);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState<boolean>(false);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [chapterQuestionCount, setChapterQuestionCount] = useState<number>(5);
  const [chapterDifficulty, setChapterDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [isGeneratingChapterQuestions, setIsGeneratingChapterQuestions] = useState<boolean>(false);
  const [isGeneratingAllChapters, setIsGeneratingAllChapters] = useState<boolean>(false);
  const [chapterGenerationSuccess, setChapterGenerationSuccess] = useState<string | null>(null);
  const [chapterGeneratedQuestionsMap, setChapterGeneratedQuestionsMap] = useState<Record<string, Question[]>>({});
  const [chapterSearchQuery, setChapterSearchQuery] = useState<string>('');

  // Automatically generate chapter outline for an uploaded PDF file
  const generateOutlineForFile = async (file: File) => {
    setIsGeneratingOutline(true);
    setErrorMessage(null);
    setCurrentStage('outline');
    try {
      const outline = await fetchDocumentOutline({
        fileName: file.name,
        examMetadata: {
          examiningBody,
          examName,
          year,
          paperNumber,
        },
      });
      setDocumentOutline(outline);
      if (outline.chapters && outline.chapters.length > 0) {
        setSelectedChapterId(outline.chapters[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate chapter outline');
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  // Generate chapter outline from public PDF URL
  const generateOutlineFromUrl = async (url: string) => {
    if (!url.trim()) return;
    setIsGeneratingOutline(true);
    setUrlErrorMessage(null);
    setCurrentStage('outline');
    try {
      const parsedName = url.split('/').pop()?.split('?')[0] || 'Imported Past Paper';
      const outline = await fetchDocumentOutline({
        fileName: parsedName,
        examMetadata: {
          examiningBody,
          examName,
          year,
          paperNumber,
        },
      });
      setDocumentOutline(outline);
      if (outline.chapters && outline.chapters.length > 0) {
        setSelectedChapterId(outline.chapters[0].id);
      }
    } catch (err: any) {
      setUrlErrorMessage(err.message || 'Failed to generate chapter outline from URL');
      setCurrentStage('upload');
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  // Generate MCQs for a specific outline chapter
  const handleGenerateForChapter = async (chapter: DocumentChapter) => {
    setIsGeneratingChapterQuestions(true);
    setChapterGenerationSuccess(null);
    try {
      const qList = await generateChapterQuestions({
        chapterTitle: chapter.title,
        keyTopics: chapter.keyTopics,
        subject: chapter.subject,
        count: chapterQuestionCount,
        difficulty: chapterDifficulty,
        examMetadata: {
          examiningBody,
          examName,
          year,
        },
        paperId: `ch-${chapter.id}-${Date.now()}`,
      });

      setChapterGeneratedQuestionsMap((prev) => ({
        ...prev,
        [chapter.id]: qList,
      }));

      // Update global extracted questions for review & quiz
      setExtractedQuestions((prev) => {
        // filter out previous questions for this chapter if any
        const filtered = prev.filter((item) => !item.id.includes(chapter.id));
        return [...filtered, ...qList];
      });

      setChapterGenerationSuccess(`Successfully generated ${qList.length} MCQs for "${chapter.title}"!`);

      // Register new paper in the past papers collection
      const newPaper = {
        id: `paper-${chapter.id}-${Date.now()}`,
        title: `${examiningBody} ${examName} — Ch. ${chapter.chapterNumber}: ${chapter.title}`,
        paperNumber: `Ch. ${chapter.chapterNumber}`,
        examiningBodyId: examiningBody,
        examinationName: examName,
        year,
        subjectOrCategory: chapter.subject,
        totalQuestions: qList.length,
        durationMinutes: Math.max(10, qList.length * 2),
        negativeMarking: examiningBody === 'PPSC' || examiningBody === 'SPSC' ? 0.25 : 0,
        verificationStatus: 'Verified' as const,
        sourcePdfName: documentOutline?.documentTitle || `${examName}.pdf`,
      };
      addNewPaperWithQuestions(newPaper, qList);
    } catch (err: any) {
      alert(`Failed to generate chapter questions: ${err.message}`);
    } finally {
      setIsGeneratingChapterQuestions(false);
    }
  };

  // Generate MCQs for all chapters in sequence
  const handleGenerateAllChapters = async () => {
    if (!documentOutline || !documentOutline.chapters || documentOutline.chapters.length === 0) return;
    setIsGeneratingAllChapters(true);
    setChapterGenerationSuccess(null);

    const accumulatedQuestions: Question[] = [];
    try {
      for (const chapter of documentOutline.chapters) {
        const qList = await generateChapterQuestions({
          chapterTitle: chapter.title,
          keyTopics: chapter.keyTopics,
          subject: chapter.subject,
          count: 5,
          difficulty: chapterDifficulty,
          examMetadata: {
            examiningBody,
            examName,
            year,
          },
          paperId: `ch-${chapter.id}-${Date.now()}`,
        });
        accumulatedQuestions.push(...qList);
        setChapterGeneratedQuestionsMap((prev) => ({
          ...prev,
          [chapter.id]: qList,
        }));
      }

      setExtractedQuestions(accumulatedQuestions);
      setChapterGenerationSuccess(`Successfully generated all chapters! (${accumulatedQuestions.length} total MCQs)`);

      const fullPaper = {
        id: `paper-full-${Date.now()}`,
        title: `${examiningBody} ${examName} (${year}) — Full Outline Ingest`,
        paperNumber,
        examiningBodyId: examiningBody,
        examinationName: examName,
        year,
        subjectOrCategory: 'Past Paper Compendium',
        totalQuestions: accumulatedQuestions.length,
        durationMinutes: Math.max(30, accumulatedQuestions.length * 1.5),
        negativeMarking: examiningBody === 'PPSC' || examiningBody === 'SPSC' ? 0.25 : 0,
        verificationStatus: 'Verified' as const,
        sourcePdfName: documentOutline.documentTitle,
      };
      addNewPaperWithQuestions(fullPaper, accumulatedQuestions);
    } catch (err: any) {
      alert(`Batch generation interrupted: ${err.message}`);
    } finally {
      setIsGeneratingAllChapters(false);
    }
  };

  // Start practicing immediately on a chapter's questions
  const handlePracticeChapterNow = (chapterId: string) => {
    const qList = chapterGeneratedQuestionsMap[chapterId];
    if (qList && qList.length > 0) {
      setExtractedQuestions(qList);
      setQuizQuestionIndex(0);
      setQuizAnswers({});
      setCurrentStage('quiz');
    }
  };

  // Fetch server limits on mount
  useEffect(() => {
    fetchSystemLimits()
      .then(setLimits)
      .catch((err) => console.warn('Could not load system limits:', err));
  }, []);

  // Format bytes helper
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Handle local multi-file selection
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMessage(null);
    let firstPdfFile: File | null = null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Check if file is supported
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      const isPdf = ext === '.pdf' || file.type.includes('pdf');
      const isVideo = ['.mp4', '.webm', '.mov', '.mkv', '.avi'].includes(ext) || file.type.startsWith('video/');

      if (!isPdf && !isVideo) {
        setErrorMessage(`File "${file.name}" has an unsupported format. Supported formats: PDF, MP4, WebM, MOV, MKV.`);
        continue;
      }

      // Check against real deployment limit (if available)
      if (limits && file.size > limits.maxUploadSizeBytes) {
        setErrorMessage(
          `"${file.name}" (${formatSize(file.size)}) exceeds server deployment quota of ${limits.maxUploadSizeFormatted}.`
        );
        continue;
      }

      if (isPdf && !firstPdfFile) {
        firstPdfFile = file;
      }

      newItems.push({
        id: `upload-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        file,
        status: 'pending',
      });
    }

    setQueuedFiles((prev) => [...prev, ...newItems]);
    // Reset file input value so same files can be re-selected if removed
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Automatically generate outline showing chapters contained within
    if (firstPdfFile) {
      generateOutlineForFile(firstPdfFile);
    }
  };

  const removeQueuedFile = (id: string) => {
    setQueuedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  // Upload all queued files sequentially in chunks
  const startBatchChunkedUpload = async () => {
    if (queuedFiles.length === 0) {
      setErrorMessage('Please add at least one PDF or video file to the queue.');
      return;
    }

    setIsBatchUploading(true);
    setErrorMessage(null);

    const pending = queuedFiles.filter((q) => q.status === 'pending' || q.status === 'failed');

    for (const item of pending) {
      // Update item to uploading
      setQueuedFiles((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading', errorMessage: undefined } : q))
      );

      try {
        const { job } = await uploadFileInChunks(item.file, {
          examMetadata: {
            examiningBody,
            examName,
            year,
            paperNumber,
            documentType,
            conversionMode,
          },
          onProgress: (prog) => {
            setQueuedFiles((prev) =>
              prev.map((q) => (q.id === item.id ? { ...q, progress: prog } : q))
            );
          },
        });

        // Mark as completed
        setQueuedFiles((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'completed', jobId: job.id } : q))
        );

        // Refresh global jobs list from server
        await refreshJobsFromServer();
      } catch (err: any) {
        setQueuedFiles((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'failed', errorMessage: err.message } : q
          )
        );
      }
    }

    setIsBatchUploading(false);
    // Switch to queue view to watch background jobs
    setIngestionMode('queue');
  };

  // Handle URL Ingestion
  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setUrlErrorMessage('Please enter a valid HTTP or HTTPS URL pointing to a document or media file.');
      return;
    }

    setUrlIsImporting(true);
    setUrlErrorMessage(null);
    setUrlSuccessMessage(null);

    try {
      const { job, downloadResult } = await importFromPublicUrl(urlInput.trim(), {
        examiningBody,
        examName,
        year,
        paperNumber,
        documentType,
      });

      setUrlSuccessMessage(
        `Successfully retrieved "${downloadResult.fileName}" (${formatSize(downloadResult.fileSizeBytes)}). Background ingestion job #${job.id} enqueued!`
      );
      setUrlInput('');
      await refreshJobsFromServer();
      setTimeout(() => {
        setIngestionMode('queue');
      }, 1200);
    } catch (err: any) {
      setUrlErrorMessage(err.message || 'Failed to import document from URL.');
    } finally {
      setUrlIsImporting(false);
    }
  };

  // Quick Preset Loader (instant testing)
  const loadPreset = (presetType: 'digital_css' | 'scanned_ppsc' | 'textbook_notes') => {
    if (presetType === 'digital_css') {
      setConversionMode('extract_past_paper');
      setDocumentType('digital');
      setExaminingBody('FPSC');
      setExamName('CSS Competitive Screening Test (MPT)');
      setYear(2025);
      setPaperNumber('Paper 01');
      runPresetSimulation('digital_css');
    } else if (presetType === 'scanned_ppsc') {
      setConversionMode('extract_past_paper');
      setDocumentType('scanned');
      setExaminingBody('PPSC');
      setExamName('Tehsildar & Naib Tehsildar Recruitment');
      setYear(2026);
      setPaperNumber('Paper 01');
      runPresetSimulation('scanned_ppsc');
    } else {
      setConversionMode('generate_from_content');
      setDocumentType('digital');
      setExaminingBody('PPSC');
      setExamName('Pakistan Affairs & Constitutional Law Notes');
      setYear(2026);
      setPaperNumber('Paper 02');
      runPresetSimulation('textbook_notes');
    }
  };

  const runPresetSimulation = (presetType: 'digital_css' | 'scanned_ppsc' | 'textbook_notes') => {
    setCurrentStage('processing');
    setProcessingStep(0);
    setActiveJobStatusMessage('Running simulated past paper parsing...');

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setProcessingStep(step);
      if (step >= 4) {
        clearInterval(interval);
        const mappedQuestions = getPresetQuestions(presetType);
        setRawTextPreview('Pakistani past paper document parsed successfully.');
        setExtractedQuestions(mappedQuestions);

        const newPaper = {
          id: mappedQuestions[0]?.paperId || `converted-paper-${Date.now()}`,
          title: `${examiningBody} ${examName} (${year})`,
          paperNumber,
          examiningBodyId: examiningBody,
          examinationName: examName,
          year,
          subjectOrCategory: 'Converted PDF Exam',
          totalQuestions: mappedQuestions.length,
          durationMinutes: 90,
          negativeMarking: examiningBody === 'PPSC' || examiningBody === 'SPSC' ? 0.25 : 0,
          verificationStatus: presetType === 'scanned_ppsc' ? ('Needs Review' as const) : ('Verified' as const),
          sourcePdfName: `${examiningBody}_${examName.replace(/\s+/g, '_')}_${year}.pdf`,
        };

        addNewPaperWithQuestions(newPaper, mappedQuestions);
        setTimeout(() => setCurrentStage('review'), 300);
      }
    }, 250);
  };

  // Preset question data for immediate reliable testing
  const getPresetQuestions = (type: 'digital_css' | 'scanned_ppsc' | 'textbook_notes'): Question[] => {
    const timestamp = Date.now();
    const paperId = `converted-paper-${timestamp}`;

    if (type === 'digital_css') {
      return [
        {
          id: `conv-q-${timestamp}-1`,
          paperId,
          questionNumber: 1,
          questionText: 'The Indus Waters Treaty of 1960 gave Pakistan exclusive rights to which three western rivers?',
          originalQuestionText: 'The Indus Waters Treaty of 1960 gave Pakistan exclusive rights to which three western rivers?',
          language: 'English',
          options: [
            { id: `opt-${timestamp}-A`, label: 'A', text: 'Indus, Jhelum, Chenab' },
            { id: `opt-${timestamp}-B`, label: 'B', text: 'Ravi, Beas, Sutlej' },
            { id: `opt-${timestamp}-C`, label: 'C', text: 'Kabul, Swat, Kurram' },
            { id: `opt-${timestamp}-D`, label: 'D', text: 'Chenab, Ravi, Beas' },
          ],
          correctOptionLabel: 'A',
          extractedAnswerKey: 'A',
          verifiedAnswerKey: 'A',
          verificationStatus: 'Verified',
          subject: 'Pakistan Affairs',
          sourcePage: 1,
          extractionConfidence: 0.99,
          hasMissingOptions: false,
          explanation: 'Under the Indus Waters Treaty brokered by the World Bank in 1960, Pakistan received exclusive rights over the three Western Rivers: Indus, Jhelum, and Chenab.',
        },
        {
          id: `conv-q-${timestamp}-2`,
          paperId,
          questionNumber: 2,
          questionText: 'Which organ of the United Nations is primarily responsible for the maintenance of international peace and security?',
          originalQuestionText: 'Which organ of the United Nations is primarily responsible for the maintenance of international peace and security?',
          language: 'English',
          options: [
            { id: `opt-${timestamp}-A2`, label: 'A', text: 'General Assembly' },
            { id: `opt-${timestamp}-B2`, label: 'B', text: 'Security Council' },
            { id: `opt-${timestamp}-C2`, label: 'C', text: 'Economic and Social Council' },
            { id: `opt-${timestamp}-D2`, label: 'D', text: 'International Court of Justice' },
          ],
          correctOptionLabel: 'B',
          extractedAnswerKey: 'B',
          verifiedAnswerKey: 'B',
          verificationStatus: 'Verified',
          subject: 'Current Affairs',
          sourcePage: 1,
          extractionConfidence: 0.98,
          hasMissingOptions: false,
          explanation: 'Under Article 24 of the UN Charter, the UN Security Council holds primary responsibility for the maintenance of international peace and security.',
        },
        {
          id: `conv-q-${timestamp}-3`,
          paperId,
          questionNumber: 3,
          questionText: 'What is the antonym of the word "EPHEMERAL"?',
          originalQuestionText: 'What is the antonym of the word "EPHEMERAL"?',
          language: 'English',
          options: [
            { id: `opt-${timestamp}-A3`, label: 'A', text: 'Transient' },
            { id: `opt-${timestamp}-B3`, label: 'B', text: 'Permanent' },
            { id: `opt-${timestamp}-C3`, label: 'C', text: 'Fleeting' },
            { id: `opt-${timestamp}-D3`, label: 'D', text: 'Fragile' },
          ],
          correctOptionLabel: 'B',
          extractedAnswerKey: 'B',
          verifiedAnswerKey: 'B',
          verificationStatus: 'Verified',
          subject: 'English',
          sourcePage: 2,
          extractionConfidence: 0.97,
          hasMissingOptions: false,
          explanation: '"Ephemeral" means lasting for a very short duration. Its antonym is "Permanent".',
        },
        {
          id: `conv-q-${timestamp}-4`,
          paperId,
          questionNumber: 4,
          questionText: 'The Treaty of Hudaibiyyah was signed in which Hijri year?',
          originalQuestionText: 'The Treaty of Hudaibiyyah was signed in which Hijri year?',
          language: 'English',
          options: [
            { id: `opt-${timestamp}-A4`, label: 'A', text: '2 AH' },
            { id: `opt-${timestamp}-B4`, label: 'B', text: '4 AH' },
            { id: `opt-${timestamp}-C4`, label: 'C', text: '6 AH' },
            { id: `opt-${timestamp}-D4`, label: 'D', text: '8 AH' },
          ],
          correctOptionLabel: 'C',
          extractedAnswerKey: 'C',
          verifiedAnswerKey: 'C',
          verificationStatus: 'Verified',
          subject: 'Islamic Studies',
          sourcePage: 2,
          extractionConfidence: 0.99,
          hasMissingOptions: false,
          explanation: 'The Treaty of Hudaybiyyah was signed in Dhu al-Qadah, 6 AH between Prophet Muhammad (PBUH) representing Madinah and the Quraysh of Makkah.',
        },
      ];
    } else if (type === 'scanned_ppsc') {
      return [
        {
          id: `conv-q-${timestamp}-1`,
          paperId,
          questionNumber: 1,
          questionText: 'Under the Land Revenue Act 1967, which authority prepares the Quadrennial Jamabandi (Record of Rights)?',
          originalQuestionText: 'Under the Land Revenue Act 1967, which authority prepares the Quadrennial Jamabandi (Record of Rights)?',
          language: 'English',
          options: [
            { id: `opt-${timestamp}-A1`, label: 'A', text: 'Patwari' },
            { id: `opt-${timestamp}-B1`, label: 'B', text: 'Girdawar / Kanungo' },
            { id: `opt-${timestamp}-C1`, label: 'C', text: 'Tehsildar' },
            { id: `opt-${timestamp}-D1`, label: 'D', text: 'Collector' },
          ],
          correctOptionLabel: 'A',
          extractedAnswerKey: 'A',
          verifiedAnswerKey: 'A',
          verificationStatus: 'Verified',
          subject: 'General Knowledge',
          sourcePage: 1,
          extractionConfidence: 0.88,
          hasMissingOptions: false,
          explanation: 'Under Section 42 of the Punjab Land Revenue Act 1967, the Village Patwari prepares the periodic Jamabandi every 4 years under the supervision of the Kanungo.',
        },
        {
          id: `conv-q-${timestamp}-2`,
          paperId,
          questionNumber: 2,
          questionText: 'What is the standard SI unit of magnetic flux density?',
          originalQuestionText: 'What is the standard SI unit of magnetic flux density?',
          language: 'English',
          options: [
            { id: `opt-${timestamp}-A2`, label: 'A', text: 'Weber' },
            { id: `opt-${timestamp}-B2`, label: 'B', text: 'Tesla' },
            { id: `opt-${timestamp}-C2`, label: 'C', text: 'Henry' },
            { id: `opt-${timestamp}-D2`, label: 'D', text: 'Gauss' },
          ],
          correctOptionLabel: 'B',
          extractedAnswerKey: 'B',
          verifiedAnswerKey: 'B',
          verificationStatus: 'Verified',
          subject: 'Everyday Science',
          sourcePage: 1,
          extractionConfidence: 0.91,
          hasMissingOptions: false,
          explanation: 'The SI unit of magnetic flux density is the Tesla (T). Weber is the unit of total magnetic flux.',
        },
        {
          id: `conv-q-${timestamp}-3`,
          paperId,
          questionNumber: 3,
          questionText: 'مسدسِ مدوجزرِ اسلام کس معروف شاعر کی شہرہ آفاق تصنیف ہے؟',
          originalQuestionText: '"مسدسِ مدوجزرِ اسلام" کس معروف شاعر کی شہرہ آفاق تصنیف ہے؟',
          language: 'Urdu',
          options: [
            { id: `opt-${timestamp}-A3`, label: 'A', text: 'الطاف حسین حالی' },
            { id: `opt-${timestamp}-B3`, label: 'B', text: 'علامہ محمد اقبال' },
            { id: `opt-${timestamp}-C3`, label: 'C', text: 'شبلی نعمانی' },
            { id: `opt-${timestamp}-D3`, label: 'D', text: 'سر سید احمد خان' },
          ],
          correctOptionLabel: 'A',
          extractedAnswerKey: 'A',
          verifiedAnswerKey: 'A',
          verificationStatus: 'Verified',
          subject: 'Urdu',
          sourcePage: 2,
          extractionConfidence: 0.85,
          hasMissingOptions: false,
          explanation: 'مولانا الطاف حسین حالی نے سر سید احمد خان کی تحریک پر ۱۸۷۹ء میں مسدس لکھی جو قومی بیداری کا شاہکار مانی جاتی ہے۔',
        },
        {
          id: `conv-q-${timestamp}-4`,
          paperId,
          questionNumber: 4,
          questionText: 'If a train traveling at 72 km/h crosses a 180-meter long platform in 15 seconds, what is the length of the train?',
          originalQuestionText: 'If a train traveling at 72 km/h crosses a 180-meter long platform in 15 seconds, what is the length of the train?',
          language: 'English',
          options: [
            { id: `opt-${timestamp}-A4`, label: 'A', text: '120 meters' },
            { id: `opt-${timestamp}-B4`, label: 'B', text: '150 meters' },
            { id: `opt-${timestamp}-C4`, label: 'C', text: '180 meters' },
            { id: `opt-${timestamp}-D4`, label: 'D', text: '200 meters' },
          ],
          correctOptionLabel: 'A',
          extractedAnswerKey: 'A',
          verifiedAnswerKey: 'A',
          verificationStatus: 'Verified',
          subject: 'Mathematics & Reasoning',
          sourcePage: 2,
          extractionConfidence: 0.84,
          hasMissingOptions: false,
          explanation: 'Speed = 72 * (5/18) = 20 m/s. In 15 seconds, distance = 300m. Train length = 300 - 180 = 120m.',
        },
        {
          id: `conv-q-${timestamp}-5`,
          paperId,
          questionNumber: 5,
          questionText: 'Question digitized from low-contrast scanned page corner with pending verification:',
          originalQuestionText: 'Question digitized from low-contrast scanned page corner with pending verification:',
          language: 'English',
          options: [
            { id: `opt-${timestamp}-A5`, label: 'A', text: 'Statutory provision under sec 14' },
            { id: `opt-${timestamp}-B5`, label: 'B', text: 'Administrative notification' },
            { id: `opt-${timestamp}-C5`, label: 'C', text: 'Board of Revenue circular' },
          ],
          correctOptionLabel: undefined,
          extractedAnswerKey: undefined,
          verifiedAnswerKey: undefined,
          verificationStatus: 'Unverified',
          subject: 'General Knowledge',
          sourcePage: 3,
          extractionConfidence: 0.62,
          hasMissingOptions: true,
          explanation: undefined,
        },
      ];
    } else {
      return [
        {
          id: `conv-q-${timestamp}-1`,
          paperId,
          questionNumber: 1,
          questionText: 'Who presented the historic Lahore Resolution on 23rd March 1940 at Minto Park?',
          originalQuestionText: 'Who presented the historic Lahore Resolution on 23rd March 1940 at Minto Park?',
          language: 'English',
          options: [
            { id: `opt-${timestamp}-A1`, label: 'A', text: 'A.K. Fazlul Huq (Sher-e-Bengal)' },
            { id: `opt-${timestamp}-B1`, label: 'B', text: 'Chaudhry Khaliquzzaman' },
            { id: `opt-${timestamp}-C1`, label: 'C', text: 'Liaquat Ali Khan' },
            { id: `opt-${timestamp}-D1`, label: 'D', text: 'Quaid-e-Azam Muhammad Ali Jinnah' },
          ],
          correctOptionLabel: 'A',
          extractedAnswerKey: 'A',
          verifiedAnswerKey: 'A',
          verificationStatus: 'Verified',
          subject: 'Pakistan Affairs',
          sourcePage: 1,
          extractionConfidence: 0.99,
          hasMissingOptions: false,
          explanation: 'The Lahore Resolution (later called the Pakistan Resolution) was formally moved by A.K. Fazlul Huq, the Premier of Bengal, on March 23, 1940.',
        },
        {
          id: `conv-q-${timestamp}-2`,
          paperId,
          questionNumber: 2,
          questionText: 'Who presided over the 27th Annual Session of the All-India Muslim League in Lahore in 1940?',
          originalQuestionText: 'Who presided over the 27th Annual Session of the All-India Muslim League in Lahore in 1940?',
          language: 'English',
          options: [
            { id: `opt-${timestamp}-A2`, label: 'A', text: 'Sir Aga Khan III' },
            { id: `opt-${timestamp}-B2`, label: 'B', text: 'Quaid-e-Azam Muhammad Ali Jinnah' },
            { id: `opt-${timestamp}-C2`, label: 'C', text: 'Allama Muhammad Iqbal' },
            { id: `opt-${timestamp}-D2`, label: 'D', text: 'Maulana Muhammad Ali Jouhar' },
          ],
          correctOptionLabel: 'B',
          extractedAnswerKey: 'B',
          verifiedAnswerKey: 'B',
          verificationStatus: 'Verified',
          subject: 'Pakistan Affairs',
          sourcePage: 1,
          extractionConfidence: 0.98,
          hasMissingOptions: false,
          explanation: 'Quaid-e-Azam Muhammad Ali Jinnah presided over the landmark session and delivered his historic presidential address on the Two-Nation Theory.',
        },
        {
          id: `conv-q-${timestamp}-3`,
          paperId,
          questionNumber: 3,
          questionText: 'Who coined the name "Pakistan" in the 1933 pamphlet "Now or Never"?',
          originalQuestionText: 'Who coined the name "Pakistan" in the 1933 pamphlet "Now or Never"?',
          language: 'English',
          options: [
            { id: `opt-${timestamp}-A3`, label: 'A', text: 'Sir Syed Ahmad Khan' },
            { id: `opt-${timestamp}-B3`, label: 'B', text: 'Choudhry Rahmat Ali' },
            { id: `opt-${timestamp}-C3`, label: 'C', text: 'Allama Muhammad Iqbal' },
            { id: `opt-${timestamp}-D3`, label: 'D', text: 'Mohsin-ul-Mulk' },
          ],
          correctOptionLabel: 'B',
          extractedAnswerKey: 'B',
          verifiedAnswerKey: 'B',
          verificationStatus: 'Verified',
          subject: 'Pakistan Affairs',
          sourcePage: 1,
          extractionConfidence: 0.97,
          hasMissingOptions: false,
          explanation: 'Choudhry Rahmat Ali coined the acronym "PAKSTAN" in 1933 while studying at Cambridge.',
        },
      ];
    }
  };

  // Actions on Background Job Queue
  const handleLoadJobIntoReview = (job: ProcessingJob) => {
    if (job.extractedQuestions && job.extractedQuestions.length > 0) {
      setExtractedQuestions(job.extractedQuestions);
      setRawTextPreview(job.rawExtractedText || 'Extracted content loaded from background job.');
      setCurrentStage('review');
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await retryJob(jobId);
      await refreshJobsFromServer();
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await cancelJob(jobId);
      await refreshJobsFromServer();
    } catch (err: any) {
      alert(`Cancel failed: ${err.message}`);
    }
  };

  const handlePublishJob = (jobId: string) => {
    publishJobQuestionsToPaper(jobId);
  };

  // Pre-Quiz Question Key Modification
  const handleVerifyQuestionKey = (index: number, key: 'A' | 'B' | 'C' | 'D') => {
    setExtractedQuestions((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        correctOptionLabel: key,
        verifiedAnswerKey: key,
        verificationStatus: 'Verified',
      };
      return copy;
    });
  };

  // Start Interactive Quiz
  const handleStartQuiz = () => {
    setQuizQuestionIndex(0);
    setQuizAnswers({});
    setCurrentStage('quiz');
  };

  const handleAnswerSelect = (optionLabel: 'A' | 'B' | 'C' | 'D' | 'E') => {
    const currentQ = extractedQuestions[quizQuestionIndex];
    if (!currentQ) return;
    setQuizAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionLabel,
    }));
  };

  // Quiz Results Calculation
  const totalQuestionsCount = extractedQuestions.length;
  const answeredCount = Object.keys(quizAnswers).length;
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;

  extractedQuestions.forEach((q) => {
    const userAns = quizAnswers[q.id];
    if (userAns) {
      if (q.correctOptionLabel && userAns === q.correctOptionLabel) {
        correctCount += 1;
      } else if (q.correctOptionLabel) {
        incorrectCount += 1;
      }
    } else {
      unattemptedCount += 1;
    }
  });

  const negativePenaltyRate =
    examiningBody === 'PPSC' || examiningBody === 'SPSC' ? 0.25 : 0;
  const rawScore = correctCount * 1.0;
  const penalty = negativeMarkingEnabled ? incorrectCount * negativePenaltyRate : 0;
  const netScore = Math.max(0, +(rawScore - penalty).toFixed(2));
  const accuracyPercentage =
    answeredCount > 0 ? +((correctCount / answeredCount) * 100).toFixed(1) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wide">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Scalable Past Paper & Video Ingestion Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Unlimited-Scale Document & Lecture Ingestion
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Upload multi-page PDFs, scanned provincial papers, or lecture videos. Streamed chunking, SSRF-safe URL imports, and background OCR & transcription.
          </p>
        </div>

        {/* Deployment Limit Indicator */}
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs text-emerald-900 font-medium">
          <HardDrive className="w-4 h-4 text-emerald-700 shrink-0" />
          <div>
            <div className="font-bold">Active Deployment Capacity</div>
            <div className="text-[11px] text-emerald-800 font-mono">
              {limits ? `${limits.maxUploadSizeFormatted} per asset · ${limits.chunkSizeFormatted} chunks` : 'Scalable Resumable Ingestion'}
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Stage Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 sm:p-3 flex items-center justify-between text-xs font-semibold overflow-x-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentStage('upload')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              currentStage === 'upload'
                ? 'bg-emerald-700 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            1. Ingestion Workspace
          </button>
          <span className="text-slate-300">→</span>
          <button
            onClick={() => {
              if (documentOutline) setCurrentStage('outline');
            }}
            disabled={!documentOutline}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              currentStage === 'outline'
                ? 'bg-emerald-700 text-white shadow-xs font-bold'
                : documentOutline
                ? 'text-slate-600 hover:bg-slate-100 cursor-pointer'
                : 'text-slate-300 cursor-not-allowed'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            2. Chapter Outline & Targeted MCQs
          </button>
          <span className="text-slate-300">→</span>
          <button
            onClick={() => {
              if (extractedQuestions.length > 0) setCurrentStage('review');
            }}
            disabled={extractedQuestions.length === 0}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              currentStage === 'review'
                ? 'bg-emerald-700 text-white shadow-xs font-bold'
                : extractedQuestions.length > 0
                ? 'text-slate-600 hover:bg-slate-100 cursor-pointer'
                : 'text-slate-300 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            3. Review & Verify Keys ({extractedQuestions.length})
          </button>
          <span className="text-slate-300">→</span>
          <button
            onClick={() => {
              if (extractedQuestions.length > 0) handleStartQuiz();
            }}
            disabled={extractedQuestions.length === 0}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              currentStage === 'quiz'
                ? 'bg-emerald-700 text-white shadow-xs font-bold'
                : extractedQuestions.length > 0
                ? 'text-slate-600 hover:bg-slate-100 cursor-pointer'
                : 'text-slate-300 cursor-not-allowed'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            4. Interactive Quiz
          </button>
          <span className="text-slate-300">→</span>
          <span
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              currentStage === 'results'
                ? 'bg-emerald-700 text-white shadow-xs font-bold'
                : 'text-slate-400'
            }`}
          >
            5. Performance Scorecard
          </span>
        </div>

        {/* Link to Queue */}
        <button
          onClick={() => {
            setCurrentStage('upload');
            setIngestionMode('queue');
          }}
          className="hidden md:flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono text-xs"
        >
          <Clock className="w-3 h-3 text-slate-500" />
          <span>Active Jobs: {processingJobs.length}</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* STAGE 1: INGESTION WORKSPACE (Tabs: Upload, URL, Presets, Queue)   */}
      {/* =================================================================== */}
      {currentStage === 'upload' && (
        <div className="space-y-6">
          {/* Ingestion Mode Navigation */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setIngestionMode('upload_files')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                ingestionMode === 'upload_files'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              Upload Files (PDF & Video)
              {queuedFiles.length > 0 && (
                <span className="px-1.5 py-0.2 bg-emerald-800 text-white rounded text-[10px] font-mono">
                  {queuedFiles.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setIngestionMode('import_url')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                ingestionMode === 'import_url'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Link className="w-4 h-4" />
              Import from Public PDF / Video URL
            </button>

            <button
              onClick={() => setIngestionMode('queue')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                ingestionMode === 'queue'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-4 h-4" />
              Background Jobs & Processing Queue
              <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[11px] font-mono text-slate-700">
                {processingJobs.length}
              </span>
            </button>

            <button
              onClick={() => setIngestionMode('presets')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                ingestionMode === 'presets'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Quick Exam Testing Presets
            </button>
          </div>

          {/* TAB A: UPLOAD MULTIPLE FILES */}
          {ingestionMode === 'upload_files' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Dropzone & File Queue */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Multi-File Ingestion Queue
                    </h2>
                    <p className="text-xs text-slate-500">
                      No arbitrary 50MB restriction. Upload multiple past papers or lecture videos simultaneously.
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <ListPlus className="w-4 h-4" />
                    Add Files
                  </button>
                </div>

                {/* Drag & Drop Zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50/80 hover:bg-slate-50 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFilesSelected}
                    accept=".pdf,.mp4,.webm,.mov,.mkv,.avi"
                    multiple
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-emerald-600 shadow-2xs">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900">
                      Choose PDF Past Papers or Lecture Videos
                    </p>
                    <p className="text-xs text-slate-500">
                      Drag and drop multiple files. Supported formats: .pdf, .mp4, .webm, .mov, .mkv
                    </p>
                    <p className="text-[11px] text-emerald-700 font-mono font-medium">
                      Memory-safe chunk streaming enabled (5MB slices)
                    </p>
                  </div>
                </div>

                {/* Queued Files List */}
                {queuedFiles.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Selected Uploads ({queuedFiles.length})</span>
                      <button
                        onClick={() => setQueuedFiles([])}
                        className="text-xs text-slate-400 hover:text-red-600 transition-colors"
                      >
                        Clear All
                      </button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {queuedFiles.map((item) => {
                        const isVideo = item.file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(item.file.name);
                        return (
                          <div
                            key={item.id}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {isVideo ? (
                                  <Video className="w-4 h-4 text-indigo-600 shrink-0" />
                                ) : (
                                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                )}
                                <span className="font-semibold text-slate-900 truncate">
                                  {item.file.name}
                                </span>
                                <span className="text-[11px] font-mono text-slate-500 shrink-0">
                                  ({formatSize(item.file.size)})
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {item.status === 'completed' && (
                                  <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Queued
                                  </span>
                                )}
                                {item.status === 'failed' && (
                                  <span className="text-red-600 font-semibold text-[11px]">
                                    Failed
                                  </span>
                                )}
                                {!isBatchUploading && (
                                  <button
                                    onClick={() => removeQueuedFile(item.id)}
                                    className="text-slate-400 hover:text-red-600 p-1"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Progress bar */}
                            {item.progress && item.status === 'uploading' && (
                              <div className="space-y-1">
                                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-emerald-600 h-1.5 transition-all duration-150"
                                    style={{ width: `${item.progress.percent}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                                  <span>
                                    Chunk {item.progress.currentChunk} / {item.progress.totalChunks}
                                  </span>
                                  <span>{item.progress.percent}%</span>
                                  <span>{formatSize(item.progress.speedBytesPerSec)}/s</span>
                                </div>
                              </div>
                            )}

                            {item.errorMessage && (
                              <p className="text-[11px] text-red-600 leading-tight">
                                {item.errorMessage}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Metadata Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Examining Commission</label>
                    <select
                      value={examiningBody}
                      onChange={(e: any) => setExaminingBody(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                    >
                      {examiningBodies.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.fullName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Exam Year</label>
                    <select
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-800"
                    >
                      {[2026, 2025, 2024, 2023, 2022, 2021].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Examination Name</label>
                    <input
                      type="text"
                      value={examName}
                      onChange={(e) => setExamName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Paper Sequence</label>
                    <input
                      type="text"
                      value={paperNumber}
                      onChange={(e) => setPaperNumber(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                    {errorMessage}
                  </div>
                )}

                <button
                  onClick={startBatchChunkedUpload}
                  disabled={queuedFiles.length === 0 || isBatchUploading}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  {isBatchUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Streaming Chunks to Background Queue...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Upload & Ingest All Files ({queuedFiles.length})
                    </>
                  )}
                </button>
              </div>

              {/* Right Column: Engine Specs */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    Unlimited-Scale Ingestion Architecture
                  </h3>
                  <div className="rounded-xl overflow-hidden border border-slate-100 aspect-4/3 bg-slate-50">
                    <img
                      src={scannerDiagramImg}
                      alt="PDF to MCQ engine diagram"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <ul className="text-xs text-slate-600 space-y-2.5">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Resumable 5MB multipart chunks (bypasses memory caps)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>FFmpeg audio extraction & speech-to-text transcription</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Multimodal OCR for low-contrast scanned commission papers</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Asynchronous background queue with safe idempotent retries</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB B: IMPORT FROM DIRECT URL */}
          {ingestionMode === 'import_url' && (
            <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>SSRF-Protected URL Stream Engine</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Import Public Past Paper or Lecture URL
                </h2>
                <p className="text-xs text-slate-500">
                  Directly download and ingest public PDFs or media links. Built-in SSRF protection blocks private network ranges, loopbacks, and cloud metadata.
                </p>
              </div>

              <form onSubmit={handleUrlImport} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Public Document or Video URL</label>
                  <div className="relative">
                    <input
                      type="url"
                      placeholder="https://example.com/papers/PPSC_General_Recruitment_2026.pdf"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      required
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Must be a direct HTTP/HTTPS link to a PDF or video. Webpages with authentication or login walls are protected.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Examining Commission</label>
                    <select
                      value={examiningBody}
                      onChange={(e: any) => setExaminingBody(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                    >
                      {examiningBodies.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.fullName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Exam Year</label>
                    <select
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-800"
                    >
                      {[2026, 2025, 2024, 2023, 2022, 2021].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {urlErrorMessage && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>{urlErrorMessage}</div>
                  </div>
                )}

                {urlSuccessMessage && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-200 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>{urlSuccessMessage}</div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={urlIsImporting || !urlInput.trim()}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  {urlIsImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Validating & Streaming Remote Document...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Safely Ingest Document from URL
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB C: BACKGROUND JOBS & MONITORING */}
          {ingestionMode === 'queue' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Background Ingestion Jobs Queue
                  </h2>
                  <p className="text-xs text-slate-500">
                    Durable asynchronous background worker pipeline. Track OCR, audio transcription, and MCQ synthesis.
                  </p>
                </div>
                <button
                  onClick={() => refreshJobsFromServer()}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 self-start"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh Queue
                </button>
              </div>

              {processingJobs.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No active background jobs. Upload a past paper or paste a URL above.
                </div>
              ) : (
                <div className="space-y-3">
                  {processingJobs.map((job) => {
                    const isVideo = job.jobType === 'video';
                    const isDone = ['Verified', 'Needs Review', 'Published'].includes(job.status);
                    const isProcessing = ['Queued', 'Uploading', 'Processing', 'Transcribing', 'Generating MCQs'].includes(job.status);
                    const isFailed = job.status === 'Failed';

                    return (
                      <div
                        key={job.id}
                        className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                              {isVideo ? (
                                <Video className="w-4 h-4 text-indigo-600" />
                              ) : (
                                <FileText className="w-4 h-4 text-emerald-600" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                                  {job.fileName}
                                </h3>
                                <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-200 rounded text-slate-700">
                                  {formatSize(job.fileSizeBytes)}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                {job.examiningBodyId} · {job.examName} ({job.year}) · {job.sourceType === 'url' ? 'Imported via URL' : 'Uploaded File'}
                              </p>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 ${
                                job.status === 'Verified' || job.status === 'Published'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : job.status === 'Needs Review'
                                  ? 'bg-amber-100 text-amber-800'
                                  : job.status === 'Failed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {isProcessing && <Loader2 className="w-3 h-3 animate-spin" />}
                              {job.status}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar & Stage description */}
                        {isProcessing && (
                          <div className="space-y-1.5 pt-1">
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-emerald-600 h-2 transition-all duration-300"
                                style={{ width: `${job.progressPercent || 25}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-600">
                              <span className="font-medium">{job.currentStage || 'Processing...'}</span>
                              <span className="font-mono font-bold">{job.progressPercent || 0}%</span>
                            </div>
                          </div>
                        )}

                        {job.errorMessage && (
                          <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs border border-red-200 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                            <span>{job.errorMessage}</span>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                          <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                            {job.extractedQuestionsCount > 0 && (
                              <span>{job.extractedQuestionsCount} MCQs extracted</span>
                            )}
                            {job.videoMetadata?.durationSeconds ? (
                              <span>{Math.round(job.videoMetadata.durationSeconds)}s lecture</span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Review MCQs */}
                            {job.extractedQuestions && job.extractedQuestions.length > 0 && (
                              <button
                                onClick={() => handleLoadJobIntoReview(job)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Review & Practice MCQs
                              </button>
                            )}

                            {/* View Transcript (for videos) */}
                            {isVideo && job.transcript && (
                              <button
                                onClick={() => setInspectingVideoJob(job)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                              >
                                <Video className="w-3.5 h-3.5" />
                                View Transcript & Notes
                              </button>
                            )}

                            {/* Publish button */}
                            {isDone && job.status !== 'Published' && (
                              <button
                                onClick={() => handlePublishJob(job.id)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                Publish to Question Bank
                              </button>
                            )}

                            {/* Retry button */}
                            {isFailed && (
                              <button
                                onClick={() => handleRetryJob(job.id)}
                                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Retry Job
                              </button>
                            )}

                            {/* Cancel button */}
                            {isProcessing && (
                              <button
                                onClick={() => handleCancelJob(job.id)}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB D: PRESETS */}
          {ingestionMode === 'presets' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold font-mono text-sm">
                  FPSC
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  CSS Screening Test (MPT) 2025
                </h3>
                <p className="text-xs text-slate-500">
                  Digital past paper covering Indus Waters Treaty, UN Security Council charter, and English vocabulary.
                </p>
                <button
                  onClick={() => loadPreset('digital_css')}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Load & Parse FPSC Paper
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold font-mono text-sm">
                  PPSC
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  PPSC Tehsildar Scanned Paper (OCR)
                </h3>
                <p className="text-xs text-slate-500">
                  Scanned revenue exam with low-contrast print requiring manual key verification.
                </p>
                <button
                  onClick={() => loadPreset('scanned_ppsc')}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Load Scanned PPSC OCR
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold font-mono text-sm">
                  NOTES
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Pakistan Studies & Constitutional Notes
                </h3>
                <p className="text-xs text-slate-500">
                  Automatic MCQ generation from raw textbook chapters and constitutional law notes.
                </p>
                <button
                  onClick={() => loadPreset('textbook_notes')}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Generate MCQs from Notes
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* STAGE 2: PROCESSING LOADER                                         */}
      {/* =================================================================== */}
      {currentStage === 'processing' && (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-6 shadow-md my-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">
              Processing Document / Media Ingestion...
            </h2>
            <p className="text-xs text-slate-500">{activeJobStatusMessage}</p>
          </div>

          <div className="space-y-3 text-left pt-2">
            {[
              'Validating storage integrity & checksum',
              'Inspecting pages / media tracks via multimodal OCR',
              'Segmenting question stems and distractor boundaries',
              'Extracting Options A, B, C, D & authoritative answer keys',
              'Validating against Pakistani civil service exam schema',
            ].map((step, idx) => {
              const isPast = processingStep > idx;
              const isCurrent = processingStep === idx;
              return (
                <div
                  key={step}
                  className={`p-3 rounded-lg border text-xs flex items-center gap-3 transition-colors ${
                    isPast
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium'
                      : isCurrent
                      ? 'bg-slate-50 border-slate-300 text-slate-900 font-semibold ring-1 ring-slate-400'
                      : 'bg-white border-slate-100 text-slate-400'
                  }`}
                >
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-800" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-200" />
                    )}
                  </div>
                  <span>{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* STAGE 3: PRE-QUIZ REVIEW & ANSWER VERIFICATION                     */}
      {/* =================================================================== */}
      {currentStage === 'review' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded">
                  Extracted Successfully
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {extractedQuestions.length} Questions Ingested
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Pre-Quiz Question Review & Answer Key Verification
              </h2>
              <p className="text-xs text-slate-500">
                Inspect extracted questions and confirm commission keys. Questions without verified keys are flagged as &apos;Needs Review&apos; and will not falsely report correctness.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setCurrentStage('upload')}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors"
              >
                Back to Ingestion Hub
              </button>
              <button
                onClick={handleStartQuiz}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 shadow-xs"
              >
                <Play className="w-4 h-4 fill-current" />
                Launch Interactive Practice Quiz
              </button>
            </div>
          </div>

          {/* Extracted Questions List */}
          <div className="space-y-4">
            {extractedQuestions.map((q, qIdx) => (
              <div
                key={q.id}
                className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">Q#{q.questionNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span>{q.subject}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">Page {q.sourcePage || 1}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-emerald-700 font-semibold">
                      {Math.round((q.extractionConfidence || 0.95) * 100)}% Confidence
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {q.correctOptionLabel ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Key: Option {q.correctOptionLabel}
                      </span>
                    ) : (
                      <span className="text-amber-800 font-semibold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Awaiting Verification
                      </span>
                    )}

                    {/* Quick Set Key Buttons */}
                    <div className="flex items-center gap-1">
                      {(['A', 'B', 'C', 'D'] as const).map((optKey) => (
                        <button
                          key={optKey}
                          onClick={() => handleVerifyQuestionKey(qIdx, optKey)}
                          className={`w-6 h-6 rounded text-[10px] font-mono font-bold transition-colors ${
                            q.correctOptionLabel === optKey
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title={`Set Option ${optKey} as verified answer`}
                        >
                          {optKey}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <p
                  className={`text-sm text-slate-900 font-medium ${
                    q.language === 'Urdu' ? 'font-urdu text-right text-base' : ''
                  }`}
                  dir={q.language === 'Urdu' ? 'rtl' : 'ltr'}
                >
                  {q.questionText}
                </p>

                {/* Options grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-3 rounded-lg border text-xs flex items-center gap-2 transition-colors ${
                        opt.label === q.correctOptionLabel
                          ? 'bg-emerald-50/70 border-emerald-400 text-emerald-950 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-md bg-white border border-slate-200 flex items-center justify-center font-mono font-bold text-[11px] shrink-0 text-slate-800">
                        {opt.label}
                      </span>
                      <span
                        className={`truncate ${
                          q.language === 'Urdu' ? 'font-urdu text-sm' : ''
                        }`}
                      >
                        {opt.text}
                      </span>
                    </div>
                  ))}
                </div>

                {q.explanation && (
                  <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                    <span className="font-semibold text-slate-800">Explanation: </span>
                    {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* STAGE 4: INTERACTIVE QUIZ                                          */}
      {/* =================================================================== */}
      {currentStage === 'quiz' && extractedQuestions[quizQuestionIndex] && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                Interactive Solving Mode
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Question {quizQuestionIndex + 1} of {extractedQuestions.length}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-slate-400">Answered</div>
                <div className="text-sm font-mono font-bold text-slate-900">
                  {answeredCount} / {extractedQuestions.length}
                </div>
              </div>
              <button
                onClick={() => setCurrentStage('results')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Submit Paper
              </button>
            </div>
          </div>

          {/* Interactive MCQ Card */}
          <InteractiveMcqCard
            question={extractedQuestions[quizQuestionIndex]}
            questionIndex={quizQuestionIndex}
            totalQuestions={extractedQuestions.length}
            initialSelectedOption={quizAnswers[extractedQuestions[quizQuestionIndex].id]}
            onAnswerSubmit={handleAnswerSelect}
            isBookmarked={!!bookmarks[extractedQuestions[quizQuestionIndex].id]}
            onBookmarkToggle={() => toggleBookmark(extractedQuestions[quizQuestionIndex].id)}
            instantFeedback={true}
            hasPrevious={quizQuestionIndex > 0}
            hasNext={quizQuestionIndex < extractedQuestions.length - 1}
            onPrevious={() => setQuizQuestionIndex((prev) => Math.max(0, prev - 1))}
            onNext={() => setQuizQuestionIndex((prev) => Math.min(extractedQuestions.length - 1, prev + 1))}
            onFinish={() => setCurrentStage('results')}
          />

          {/* Question Navigator */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Quick Question Jumper</span>
              <span>{Math.round((answeredCount / extractedQuestions.length) * 100)}% Complete</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {extractedQuestions.map((q, idx) => {
                const isCurrent = idx === quizQuestionIndex;
                const isAns = Boolean(quizAnswers[q.id]);
                return (
                  <button
                    key={q.id}
                    onClick={() => setQuizQuestionIndex(idx)}
                    className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition-colors ${
                      isCurrent
                        ? 'bg-emerald-700 text-white ring-2 ring-emerald-500'
                        : isAns
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setQuizQuestionIndex((prev) => Math.max(0, prev - 1))}
                disabled={quizQuestionIndex === 0}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 rounded-lg text-xs font-semibold"
              >
                Previous Question
              </button>
              <button
                onClick={() =>
                  setQuizQuestionIndex((prev) =>
                    Math.min(extractedQuestions.length - 1, prev + 1)
                  )
                }
                disabled={quizQuestionIndex === extractedQuestions.length - 1}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold"
              >
                Next Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* STAGE 5: RESULTS SCORECARD                                         */}
      {/* =================================================================== */}
      {currentStage === 'results' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Exam Performance Scorecard
              </h2>
              <p className="text-xs text-slate-500">
                Evaluation calculated in accordance with Pakistani Commission rules ({examiningBody}).
              </p>
            </div>

            {/* Score Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left pt-2">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">Net Score</div>
                <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
                  {netScore} / {totalQuestionsCount}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Negative penalty: {penalty}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">Accuracy</div>
                <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                  {accuracyPercentage}%
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {correctCount} correct of {answeredCount}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">Wrong Answers</div>
                <div className="text-2xl font-black font-mono text-red-600 mt-1">
                  {incorrectCount}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Added to Mistakes Notebook</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">Skipped</div>
                <div className="text-2xl font-black font-mono text-slate-600 mt-1">
                  {unattemptedCount}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Unattempted items</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <button
                onClick={handleStartQuiz}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                Retake Exam
              </button>
              <button
                onClick={() => setCurrentStage('review')}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Eye className="w-4 h-4" />
                Review All Questions
              </button>
              <button
                onClick={() => setActiveTab('papers')}
                className="px-5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors"
              >
                Go to Past Papers Bank
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Transcript & Study Notes Modal */}
      {inspectingVideoJob && (
        <VideoTranscriptModal
          job={inspectingVideoJob}
          onClose={() => setInspectingVideoJob(null)}
          onPracticeQuestions={(questions) => {
            setExtractedQuestions(questions);
            setCurrentStage('quiz');
          }}
        />
      )}
    </div>
  );
};
