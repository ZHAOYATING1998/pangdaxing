import React from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import DashboardPage from './pages/DashboardPage/DashboardPage';
import TasksPage from './pages/TasksPage/TasksPage';
import ChatPage from './pages/ChatPage/ChatPage';
import KnowledgePage from './pages/KnowledgePage/KnowledgePage';
import RemindersPage from './pages/RemindersPage/RemindersPage';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="reminders" element={<RemindersPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
