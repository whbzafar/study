/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { PastPapersView } from './components/PastPapersView';
import { PracticeEngineView } from './components/PracticeEngineView';
import { MockTestsView } from './components/MockTestsView';
import { SubjectsView } from './components/SubjectsView';
import { BookmarksView } from './components/BookmarksView';
import { MistakesNotebookView } from './components/MistakesNotebookView';
import { PdfConverterView } from './components/PdfConverterView';
import { ProgressAnalyticsView } from './components/ProgressAnalyticsView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { SettingsView } from './components/SettingsView';

const MainContent: React.FC = () => {
  const { activeTab, userRole } = useApp();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'landing':
        return <LandingPage />;
      case 'dashboard':
        return <DashboardView />;
      case 'papers':
        return <PastPapersView />;
      case 'practice':
        return <PracticeEngineView />;
      case 'mocks':
        return <MockTestsView />;
      case 'subjects':
        return <SubjectsView />;
      case 'bookmarks':
        return <BookmarksView />;
      case 'mistakes':
        return <MistakesNotebookView />;
      case 'progress':
        return <ProgressAnalyticsView />;
      case 'upload':
        return <PdfConverterView />;
      case 'admin':
        return userRole === 'admin' ? <AdminDashboardView /> : <DashboardView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <LandingPage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        {renderActiveView()}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
