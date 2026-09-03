import React, { Suspense } from 'react';

import {
  BrowserRouter as Router,
  Routes,
  Route,
} from 'react-router-dom';

import { Layout } from './components/Layout';
import { lazyWithRetry } from './lib/lazyWithRetry';

const Dashboard = lazyWithRetry(() => import('./components/pages/Dashboard').then((module) => ({ default: module.Dashboard })), 'dashboard');
const Alunos = lazyWithRetry(() => import('./components/pages/Alunos').then((module) => ({ default: module.Alunos })), 'alunos');
const AlunoDetalhes = lazyWithRetry(() => import('./components/pages/AlunoDetalhes').then((module) => ({ default: module.AlunoDetalhes })), 'aluno-detalhes');
const Turmas = lazyWithRetry(() => import('./components/pages/Turmas').then((module) => ({ default: module.Turmas })), 'turmas');
const Horarios = lazyWithRetry(() => import('./components/pages/Horarios').then((module) => ({ default: module.Horarios })), 'horarios');
const Frequencia = lazyWithRetry(() => import('./components/pages/Frequencia').then((module) => ({ default: module.Frequencia })), 'frequencia');
const Relatorios = lazyWithRetry(() => import('./components/pages/Relatorios').then((module) => ({ default: module.Relatorios })), 'relatorios');
const Financeiro = lazyWithRetry(() => import('./components/pages/Financeiro').then((module) => ({ default: module.Financeiro })), 'financeiro');

export const App: React.FC = () => {

  return (

    <Router>
      <Routes>

        <Route
          path="/"
          element={
            <Layout title="Dashboard">
              <Suspense fallback={null}><Dashboard /></Suspense>
            </Layout>
          }
        />

        <Route
          path="/alunos/:id"
          element={
            <Layout title="Dados do Aluno">
              <Suspense fallback={null}><AlunoDetalhes /></Suspense>
            </Layout>
          }
        />

        <Route
          path="/alunos"
          element={
            <Layout title="Alunos">
              <Suspense fallback={null}><Alunos /></Suspense>
            </Layout>
          }
        />

        <Route
          path="/turmas"
          element={
            <Layout title="Turmas">
              <Suspense fallback={null}><Turmas /></Suspense>
            </Layout>
          }
        />

        <Route
          path="/horarios"
          element={
            <Layout title="Horários">
              <Suspense fallback={null}><Horarios /></Suspense>
            </Layout>
          }
        />

        <Route
          path="/frequencia"
          element={
            <Layout title="Frequência">
              <Suspense fallback={null}><Frequencia /></Suspense>
            </Layout>
          }
        />

        <Route
          path="/relatorios"
          element={
            <Layout title="Relatórios">
              <Suspense fallback={null}><Relatorios /></Suspense>
            </Layout>
          }
        />

        <Route
          path="/financeiro"
          element={
            <Layout title="Controle Financeiro">
              <Suspense fallback={null}><Financeiro /></Suspense>
            </Layout>
          }
        />

      </Routes>

    </Router>
  );
};
