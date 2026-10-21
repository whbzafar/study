/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  SlidersHorizontal,
  User,
  Shield,
  RotateCcw,
  CheckCircle2,
  Bell,
  Type,
  BookOpen,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { userRole, setUserRole } = useApp();

  const [defaultNegativeMarking, setDefaultNegativeMarking] = useState<number>(0.25);
  const [preferredUrduFont, setPreferredUrduFont] = useState<string>('Noto Nastaliq Urdu');
  const [soundFeedback, setSoundFeedback] = useState<boolean>(true);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSaveSettings = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to reset your local test history and restore default past papers?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Application & Practice Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Customize exam simulation parameters, Urdu typography, and account preferences.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Practice & Exam Preferences */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
            Exam Simulation Rules
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Default Negative Marking Rate
              </label>
              <select
                value={defaultNegativeMarking}
                onChange={(e) => setDefaultNegativeMarking(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
              >
                <option value={0.25}>0.25 marks per error (Standard PPSC / KPPSC)</option>
                <option value={0.33}>0.33 marks per error (1/3rd penalty)</option>
                <option value={0.5}>0.50 marks per error</option>
                <option value={0}>0 (No negative marking - FPSC / NTS standard)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Urdu Nastaliq Calligraphic Font
              </label>
              <select
                value={preferredUrduFont}
                onChange={(e) => setPreferredUrduFont(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
              >
                <option value="Noto Nastaliq Urdu">Noto Nastaliq Urdu (Official)</option>
                <option value="Jameel Noori">Jameel Noori Nastaleeq System</option>
              </select>
            </div>
          </div>
        </div>

        {/* User Role Switcher */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-600" />
            Account & Role Mode
          </h2>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div className="text-xs font-bold text-slate-900">Active Role Mode</div>
              <div className="text-[11px] text-slate-500">
                Switching to Admin unlocks the question editor, OCR review queue, and publishing controls.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setUserRole('student')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  userRole === 'student'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                Student
              </button>
              <button
                onClick={() => setUserRole('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  userRole === 'admin'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                Admin
              </button>
            </div>
          </div>
        </div>

        {/* Data Reset */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-900">Reset Local Storage Data</div>
            <div className="text-[11px] text-slate-500">
              Clear your recorded attempt scores, bookmarks, and revert to initial past paper library.
            </div>
          </div>

          <button
            onClick={handleResetData}
            className="px-3.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset State
          </button>
        </div>

        {savedSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Preferences saved successfully!
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleSaveSettings}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
