/**
 * @fileoverview Configuração do React Router
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ExamPage } from './pages/ExamPage';
import { CompletedPage } from './pages/CompletedPage';
import { AdminExamsPage } from './pages/AdminExamsPage';
import { AdminExamDetailPage } from './pages/AdminExamDetailPage';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/prova/:token" element={<ExamPage />} />
                <Route path="/prova-concluida" element={<CompletedPage />} />
                <Route path="/admin/exams" element={<AdminExamsPage />} />
                <Route path="/admin/exams/:attempt_id" element={<AdminExamDetailPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
