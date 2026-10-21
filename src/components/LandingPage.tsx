/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Compass,
  Search,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  FileText,
  Clock,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  GraduationCap,
} from 'lucide-react';
import heroImg from '../assets/images/hero_exampilot_students_1792592295431.jpg';
import prepBannerImg from '../assets/images/ppsc_prep_banner_1792592296580.jpg';

export const LandingPage: React.FC = () => {
  const {
    papers,
    questions,
    examiningBodies,
    setActiveTab,
    startPracticeSession,
    setSelectedBodyFilter,
    setSelectedYearFilter,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Filter papers for search
  const filteredPapers = papers.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.examinationName.toLowerCase().includes(q) ||
      p.examiningBodyId.toLowerCase().includes(q) ||
      p.year.toString().includes(q) ||
      p.subjectOrCategory.toLowerCase().includes(q)
    );
  });

  // Calculate live platform statistics from database
  const totalVerifiedQuestions = questions.filter((q) => q.verificationStatus === 'Verified').length;
  const uniqueYearsCount = new Set(papers.map((p) => p.year)).size;

  const faqs = [
    {
      q: 'How does ExamPilot Pakistan handle negative marking in competitive exams?',
      a: 'Examinations conducted by provincial bodies like PPSC, SPSC, and KPPSC follow documented negative marking rules (typically 0.25 marks deducted per wrong response). ExamPilot simulates this negative marking in Exam Mode and Mock Tests, while Learning Mode allows relaxed revision without penalties.',
    },
    {
      q: 'Are answers verified against official departmental gazettes?',
      a: 'Yes. Questions in our digital library are tagged with their verification status. Verified answers are cross-referenced with official commission gazettes. Incomplete or ambiguous questions from scanned papers are explicitly flagged as Unverified so students are never misled.',
    },
    {
      q: 'Can I practice Urdu literature, grammar, and bilingual questions?',
      a: 'Absolutely. ExamPilot Pakistan provides right-to-left (RTL) typography tailored for Urdu Nastaliq script, accommodating Urdu grammar, poetry (Allama Iqbal, Faiz Ahmad Faiz), and Islamic Studies questions alongside English questions.',
    },
    {
      q: 'How does PDF Past Paper ingestion work?',
      a: 'Our PDF Upload Center uses Gemini multimodal AI to parse scanned past papers into structured multiple-choice questions, options (A, B, C, D), and detected answer keys while preserving original page references. Commission admins can review and publish them to the public library.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-white border-b border-slate-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Value Proposition */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 tracking-wide uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Centralized Digital Archive for Pakistani Aspirants</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Master Pakistani Competitive Exams with Real Past Papers & Interactive MCQs
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Prepare for PPSC, FPSC, SPSC, KPPSC, BPSC, and NTS recruitment tests. Ingest authentic past examination papers, practice with instant feedback, simulate timed negative marking, and target your weak subjects.
              </p>

              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Tehsildar, AD FIA, PMS, 2026, or Pakistan Studies..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>
                <button
                  onClick={() => setActiveTab('papers')}
                  className="px-6 py-3 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shrink-0 shadow-xs"
                >
                  Explore Library
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Platform Statistics (based on actual database records) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100">
                <div>
                  <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                    {papers.length}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Archived Papers</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                    {questions.length}+
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Digital MCQs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
                    {totalVerifiedQuestions}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Verified Keys</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                    {examiningBodies.length}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Commissions</div>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Asset */}
            <div className="lg:col-span-5 relative">
              <div className="rounded-xl overflow-hidden border border-slate-200 shadow-lg bg-slate-100 aspect-16/10 relative">
                <img
                  src={heroImg}
                  alt="Pakistani students preparing for competitive exams in library"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent flex items-end p-5">
                  <div className="text-white">
                    <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                      Authentic Test Preparation
                    </div>
                    <div className="text-sm font-medium mt-1">
                      Targeting Tehsildar, Sub-Inspector, AD FIA, PMS & General Recruitment
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Examining Bodies */}
      <section className="py-12 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Featured Examination Commissions
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Explore structured past papers categorized by federal and provincial testing bodies.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('papers')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 shrink-0"
            >
              View all papers <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {examiningBodies.map((body) => (
              <div
                key={body.id}
                onClick={() => {
                  setSelectedBodyFilter(body.id);
                  setActiveTab('papers');
                }}
                className="group cursor-pointer p-5 rounded-xl border border-slate-200 bg-white hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {body.name}
                    </span>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      {body.province}
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-slate-700 mb-2">{body.fullName}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">{body.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Negative marking:{' '}
                    <strong className="text-slate-700 font-mono">
                      {body.negativeMarkingDefault > 0 ? `-${body.negativeMarkingDefault}` : 'None'}
                    </strong>
                  </span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Solve Papers <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recently Added Papers */}
      <section className="py-12 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Available Past Examination Papers
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Multi-year archived collections spanning 2021 to 2026.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('papers')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              Browse complete library <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPapers.slice(0, 6).map((paper) => {
              const paperQuestions = questions.filter((q) => q.paperId === paper.id);
              return (
                <div
                  key={paper.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span className="font-bold text-emerald-700">{paper.examiningBodyId}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{paper.year}</span>
                      <span aria-hidden="true">·</span>
                      <span>{paper.paperNumber}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-1 line-clamp-2">
                      {paper.title}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">{paper.subjectOrCategory}</p>

                    <div className="flex items-center gap-4 text-xs text-slate-600 mb-4 py-2 border-y border-slate-100">
                      <div className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{paperQuestions.length || paper.totalQuestions} MCQs</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{paper.durationMinutes} mins</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{paper.verificationStatus}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => startPracticeSession(paper.id, 'learning')}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Learn Mode
                    </button>
                    <button
                      onClick={() => startPracticeSession(paper.id, 'exam')}
                      className="py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      Exam Timed
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-14 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              From Scanned PDF to Verified Interactive Practice
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Our end-to-end ingestion and verification workflow ensures accuracy before questions enter your study queue.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-lg mb-4">
                01
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">Ingest Past Papers</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Upload official recruitment test PDFs with commission, year, and subject metadata.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-lg mb-4">
                02
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">Multimodal OCR</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Gemini OCR extracts question stems, 4 answer options, language (English/Urdu), and detected keys.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-lg mb-4">
                03
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">Gazette Verification</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Commission administrators inspect low-confidence or disputed answers before publication.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg mb-4">
                04
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">Interactive Mastery</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Practice in Learning or Exam mode, track accuracy, bookmark questions, and revise mistakes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-14 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Everything you need to know about preparing for Pakistani recruitment examinations.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-lg border border-slate-200 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-5 pb-4 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                EP
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">ExamPilot Pakistan</div>
                <div className="text-xs text-slate-500">
                  قومی امتحانات اور مسابقتی بھرتی کی ڈیجیٹل تیاری
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-slate-500">
              <button onClick={() => setActiveTab('papers')} className="hover:text-slate-900">
                Past Papers
              </button>
              <button onClick={() => setActiveTab('mocks')} className="hover:text-slate-900">
                Mock Tests
              </button>
              <button onClick={() => setActiveTab('subjects')} className="hover:text-slate-900">
                Subjects
              </button>
              <button onClick={() => setActiveTab('upload')} className="hover:text-slate-900">
                Upload Center
              </button>
            </div>

            <div className="text-xs text-slate-400">
              © {new Date().getFullYear()} ExamPilot Pakistan. Built for competitive exam preparation.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
