import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiDownload, FiFileText, FiGrid } from 'react-icons/fi';
import { Card } from '../common';
import { useAlunos } from '../../hooks/useAlunos';
import { useTurmas } from '../../hooks/useTurmas';
import { useFrequencia } from '../../hooks/useFrequencia';
import edukarLogo from '../../../EDUKARXP-horizontal.png';
import './Relatorios.css';

const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const anos = Array.from({ length: 7 }, (_, index) => new Date().getFullYear() - 3 + index);
const presente = (valor: unknown) => String(valor ?? '').trim().toLowerCase() === 'presente';
const falta = (valor: unknown) => ['falta', 'ausente'].includes(String(valor ?? '').trim().toLowerCase());
const percentual = (presencas: number, faltas: number) => {
  const total = presencas + faltas;
  return total ? (presencas / total) * 100 : 0;
};
const formatarPercentual = (valor: number) => `${valor.toFixed(2).replace('.', ',')}%`;
const formatarData = (valor?: string) => valor
  ? new Date(`${valor}T00:00:00`).toLocaleDateString('pt-BR')
  : 'Não informada';
const escapeHtml = (valor: unknown) => String(valor ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

let logoDataUrlCache: string | null = null;
const carregarLogoDataUrl = async () => {
  if (logoDataUrlCache) return logoDataUrlCache;
  const response = await fetch(edukarLogo);
  const blob = await response.blob();
  logoDataUrlCache = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return logoDataUrlCache;
};

export const Relatorios: React.FC = () => {
  const { alunos } = useAlunos();
  const { turmas } = useTurmas();
  const { frequencias } = useFrequencia();
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [tipoRelatorio, setTipoRelatorio] = useState<'geral' | 'aluno' | 'turma'>('geral');
  const [alunoSelecionado, setAlunoSelecionado] = useState('Todos');
  const [pesquisaAluno, setPesquisaAluno] = useState('');
  const [turmaSelecionada, setTurmaSelecionada] = useState('Todas');
  const [resumoAberto, setResumoAberto] = useState(false);
  const resumoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!resumoAberto) return;
    const frame = window.requestAnimationFrame(() => {
      resumoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [resumoAberto, alunoSelecionado, turmaSelecionada, tipoRelatorio]);

  const alunosOrdenados = useMemo(() => [...alunos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [alunos]);
  const alunosPesquisados = useMemo(() => {
    const termo = pesquisaAluno.trim().toLocaleLowerCase('pt-BR');
    if (!termo) return alunosOrdenados;
    return alunosOrdenados.filter((aluno) => aluno.nome.toLocaleLowerCase('pt-BR').includes(termo));
  }, [alunosOrdenados, pesquisaAluno]);
  const turmasOrdenadas = useMemo(() => [...turmas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [turmas]);
  const nomeTurma = (valor?: string) => turmas.find((turma) => turma.id === valor || turma.nome === valor)?.nome ?? valor ?? 'Não definida';

  const frequenciasDoPeriodo = useMemo(() => frequencias.filter((registro) => {
    if (!registro.data) return false;
    const [registroAno, registroMes] = registro.data.split('-').map(Number);
    return registroAno === ano && registroMes === mes;
  }), [ano, frequencias, mes]);

  const frequenciasFiltradas = useMemo(() => frequenciasDoPeriodo.filter((registro) => {
    const alunoOk = tipoRelatorio !== 'aluno' || alunoSelecionado === 'Todos' || registro.aluno === alunoSelecionado;
    const turmaOk = tipoRelatorio !== 'turma' || turmaSelecionada === 'Todas' || registro.turma === turmaSelecionada || nomeTurma(registro.turma) === turmaSelecionada;
    return alunoOk && turmaOk;
  }), [alunoSelecionado, frequenciasDoPeriodo, tipoRelatorio, turmaSelecionada, turmas]);

  const totalPresencas = frequenciasFiltradas.filter((registro) => presente(registro.presenca)).length;
  const totalFaltas = frequenciasFiltradas.filter((registro) => falta(registro.presenca)).length;
  const frequenciaMedia = percentual(totalPresencas, totalFaltas);

  const resumoAlunos = useMemo(() => {
    const nomes = alunoSelecionado === 'Todos'
      ? alunosOrdenados.filter((aluno) => turmaSelecionada === 'Todas' || aluno.turma === turmaSelecionada).map((aluno) => aluno.nome)
      : [alunoSelecionado];
    return nomes.map((nome) => {
      const aluno = alunos.find((item) => item.nome === nome);
      const registros = frequenciasFiltradas.filter((item) => item.aluno === nome);
      const presencas = registros.filter((item) => presente(item.presenca)).length;
      const faltas = registros.filter((item) => falta(item.presenca)).length;
      return { nome, turma: aluno?.turma || nomeTurma(registros[0]?.turma), presencas, faltas, percentual: percentual(presencas, faltas) };
    });
  }, [alunoSelecionado, alunos, alunosOrdenados, frequenciasFiltradas, turmaSelecionada]);

  const turmaAtiva = useMemo(() => turmas.find((turma) => turma.id === turmaSelecionada || turma.nome === turmaSelecionada), [turmaSelecionada, turmas]);
  const resumoTurma = turmaAtiva ? {
    nome: turmaAtiva.nome,
    professor: turmaAtiva.professor || 'Não informado',
    horario: turmaAtiva.horaInicio && turmaAtiva.horaFim ? `${turmaAtiva.horaInicio} - ${turmaAtiva.horaFim}` : turmaAtiva.horario || 'Não informado',
    alunos: alunos.filter((aluno) => aluno.turma === turmaAtiva.nome || aluno.turma === turmaAtiva.id).length,
    presencas: totalPresencas,
    faltas: totalFaltas,
    percentual: frequenciaMedia,
  } : null;

  const periodo = `${meses[mes - 1]}/${ano}`;
  const escopo = tipoRelatorio === 'aluno' && alunoSelecionado !== 'Todos'
    ? alunoSelecionado
    : tipoRelatorio === 'turma' && turmaSelecionada !== 'Todas' ? turmaSelecionada : 'GERAL';
  const linhasExportacao = frequenciasFiltradas.map((registro) => [
    formatarData(registro.data), nomeTurma(registro.turma), registro.aluno || 'Não informado',
    registro.presenca || 'Não informado', registro.professorResponsavel || 'Não informado', registro.conteudoMinistrado || '',
  ]);

  const exportarPdf = async () => {
    const [{ jsPDF }, { default: autoTable }, logoDataUrl] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
      carregarLogoDataUrl(),
    ]);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const emitidoEm = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());

    doc.setFillColor(248, 250, 252); doc.rect(0, 0, pageWidth, 142, 'F');
    doc.setFillColor(37, 99, 235); doc.rect(0, 0, 8, 142, 'F');
    doc.addImage(logoDataUrl, 'PNG', 38, 22, 132, 43);
    doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(19);
    doc.text('Relatório de Frequência', 196, 39);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139); doc.setFontSize(9);
    doc.text(`Período: ${periodo}   •   Escopo: ${escopo === 'GERAL' ? 'Todos' : escopo}`, 196, 57);
    doc.text(`Emitido em ${emitidoEm}`, pageWidth - 38, 39, { align: 'right' });

    const cards = [
      { label: 'REGISTROS', value: frequenciasFiltradas.length, color: [37, 99, 235] },
      { label: 'PRESENÇAS', value: totalPresencas, color: [5, 150, 105] },
      { label: 'FALTAS', value: totalFaltas, color: [220, 38, 38] },
      { label: 'FREQUÊNCIA', value: formatarPercentual(frequenciaMedia), color: [79, 70, 229] },
    ] as const;
    cards.forEach((card, index) => {
      const x = 38 + index * 194;
      doc.setFillColor(255, 255, 255); doc.roundedRect(x, 82, 176, 43, 6, 6, 'F');
      doc.setDrawColor(226, 232, 240); doc.roundedRect(x, 82, 176, 43, 6, 6, 'S');
      doc.setFillColor(card.color[0], card.color[1], card.color[2]); doc.roundedRect(x, 82, 4, 43, 2, 2, 'F');
      doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.text(card.label, x + 14, 98);
      doc.setTextColor(card.color[0], card.color[1], card.color[2]); doc.setFontSize(14); doc.text(String(card.value), x + 14, 116);
    });

    autoTable(doc, {
      startY: 158,
      margin: { left: 38, right: 38, bottom: 38 },
      head: [['Data', 'Turma', 'Aluno', 'Presença', 'Professor', 'Conteúdo ministrado']],
      body: linhasExportacao,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 7, textColor: [51, 65, 85], lineColor: [226, 232, 240], lineWidth: { bottom: 0.5 } },
      headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: 'bold', cellPadding: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 65 }, 3: { cellWidth: 68 }, 4: { cellWidth: 105 } },
      didDrawPage: ({ pageNumber }) => {
        doc.setDrawColor(226, 232, 240); doc.line(38, pageHeight - 25, pageWidth - 38, pageHeight - 25);
        doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
        doc.text('Edukar XP • Sistema Acadêmico Escolar', 38, pageHeight - 12);
        doc.text(`Página ${pageNumber}`, pageWidth - 38, pageHeight - 12, { align: 'right' });
      },
    });
    doc.save(`FREQUENCIA_${escopo}_${mes}-${ano}.pdf`);
  };

  const exportarWord = async () => {
    const logoDataUrl = await carregarLogoDataUrl();
    const linhas = linhasExportacao.map((linha) => `<tr>${linha.map((celula) => `<td>${escapeHtml(celula)}</td>`).join('')}</tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: A4 landscape; margin: 1.4cm; } body { color:#1e293b; font-family:Arial,sans-serif; font-size:10pt; }
      .header { width:100%; padding-bottom:14px; border-bottom:3px solid #2563eb; } .logo { width:145px; }
      h1 { margin:0 0 5px; color:#0f172a; font-size:22pt; } .muted { color:#64748b; font-size:9pt; }
      .summary { width:100%; margin:18px 0; border-spacing:8px; } .summary td { padding:12px; border:1px solid #dbe3ee; background:#f8fafc; }
      .summary small,.summary strong { display:block; } .summary small { color:#64748b; font-weight:bold; } .summary strong { margin-top:5px; color:#1d4ed8; font-size:16pt; }
      .data { width:100%; border-collapse:collapse; } .data th { padding:9px; color:#fff; background:#1e40af; text-align:left; font-size:8pt; }
      .data td { padding:8px; border-bottom:1px solid #e2e8f0; } .data tr:nth-child(even) td { background:#f8fafc; }
      .footer { margin-top:18px; padding-top:9px; border-top:1px solid #e2e8f0; color:#64748b; font-size:8pt; }
    </style></head><body><table class="header"><tr><td><img class="logo" src="${logoDataUrl}"></td><td><h1>Relatório de Frequência</h1><div class="muted">Período: ${escapeHtml(periodo)} &nbsp; | &nbsp; Escopo: ${escapeHtml(escopo === 'GERAL' ? 'Todos' : escopo)}</div></td></tr></table>
    <table class="summary"><tr><td><small>REGISTROS</small><strong>${frequenciasFiltradas.length}</strong></td><td><small>PRESENÇAS</small><strong>${totalPresencas}</strong></td><td><small>FALTAS</small><strong>${totalFaltas}</strong></td><td><small>FREQUÊNCIA</small><strong>${formatarPercentual(frequenciaMedia)}</strong></td></tr></table>
    <table class="data"><thead><tr><th>Data</th><th>Turma</th><th>Aluno</th><th>Presença</th><th>Professor</th><th>Conteúdo ministrado</th></tr></thead><tbody>${linhas}</tbody></table>
    <div class="footer">Edukar XP • Sistema Acadêmico Escolar — Documento emitido em ${new Date().toLocaleString('pt-BR')}</div></body></html>`;
    baixarArquivo(new Blob([html], { type: 'application/msword' }), `FREQUENCIA_${escopo}_${mes}-${ano}.doc`);
  };

  const exportarExcel = async () => {
    const logoDataUrl = await carregarLogoDataUrl();
    const linhas = linhasExportacao.map((linha) => `<tr>${linha.map((celula) => `<td>${escapeHtml(celula)}</td>`).join('')}</tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body { font-family:Calibri,Arial,sans-serif; color:#1e293b; } table { border-collapse:collapse; }
      .title { color:#0f172a; font-size:20pt; font-weight:bold; } .meta { color:#64748b; }
      .metric-label { color:#64748b; background:#f1f5f9; font-weight:bold; } .metric { color:#1d4ed8; background:#f8fafc; font-size:15pt; font-weight:bold; }
      th { padding:9px; color:#fff; background:#1e40af; text-align:left; } td { padding:7px; border:1px solid #dbe3ee; }
      .spacer td { height:8px; border:0; }
    </style></head><body><table><tr><td colspan="2" rowspan="2"><img src="${logoDataUrl}" width="150"></td><td colspan="4" class="title">Relatório de Frequência</td></tr>
    <tr><td colspan="4" class="meta">Período: ${escapeHtml(periodo)} | Escopo: ${escapeHtml(escopo === 'GERAL' ? 'Todos' : escopo)}</td></tr><tr class="spacer"><td colspan="6"></td></tr>
    <tr><td class="metric-label">REGISTROS</td><td class="metric-label">PRESENÇAS</td><td class="metric-label">FALTAS</td><td class="metric-label">FREQUÊNCIA</td><td colspan="2" class="meta">Emitido em ${new Date().toLocaleString('pt-BR')}</td></tr>
    <tr><td class="metric">${frequenciasFiltradas.length}</td><td class="metric">${totalPresencas}</td><td class="metric">${totalFaltas}</td><td class="metric">${formatarPercentual(frequenciaMedia)}</td><td colspan="2"></td></tr>
    <tr class="spacer"><td colspan="6"></td></tr><tr><th>Data</th><th>Turma</th><th>Aluno</th><th>Presença</th><th>Professor</th><th>Conteúdo ministrado</th></tr>${linhas}</table></body></html>`;
    baixarArquivo(new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' }), `FREQUENCIA_${escopo}_${mes}-${ano}.xls`);
  };

  const baixarArquivo = (blob: Blob, nome: string) => {
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = nome; link.click(); URL.revokeObjectURL(url);
  };

  const botoesExportacao = (compacto = false) => <div className={`report-export-actions ${compacto ? 'compact' : ''}`}>
    <button type="button" className="report-export pdf" onClick={exportarPdf} title="Baixar relatório em PDF">
      <span className="report-export-icon"><FiFileText aria-hidden="true" /></span>
      <span className="report-export-copy"><strong>PDF</strong><small>Documento portátil</small></span>
      <FiDownload className="report-export-download" aria-hidden="true" />
    </button>
    <button type="button" className="report-export word" onClick={exportarWord} title="Baixar relatório em Word">
      <span className="report-export-icon"><FiFileText aria-hidden="true" /></span>
      <span className="report-export-copy"><strong>Word</strong><small>Documento editável</small></span>
      <FiDownload className="report-export-download" aria-hidden="true" />
    </button>
    <button type="button" className="report-export excel" onClick={exportarExcel} title="Baixar relatório em Excel">
      <span className="report-export-icon"><FiGrid aria-hidden="true" /></span>
      <span className="report-export-copy"><strong>Excel</strong><small>Planilha de dados</small></span>
      <FiDownload className="report-export-download" aria-hidden="true" />
    </button>
  </div>;

  return <div className="relatorios-container">
    <section className="relatorios-grid" aria-label="Resumo geral">
      <Card padding="lg" className="relatorio-card blue"><span>Total de Alunos</span><strong>{alunos.length}</strong></Card>
      <Card padding="lg" className="relatorio-card purple"><span>Total de Turmas</span><strong>{turmas.length}</strong></Card>
      <Card padding="lg" className="relatorio-card green"><span>Total de Presenças</span><strong>{totalPresencas}</strong><small>{formatarPercentual(frequenciaMedia)} de frequência</small></Card>
      <Card padding="lg" className="relatorio-card red"><span>Total de Faltas</span><strong>{totalFaltas}</strong></Card>
    </section>

    <Card padding="lg" className="report-filter-card">
      <div className="report-section-title"><div><span>FILTROS</span><h2>Período e escopo</h2></div><p>Os resultados e exportações são atualizados automaticamente.</p></div>
      <div className="report-type-selector" role="radiogroup" aria-label="Tipo de relatório">
        <label className={tipoRelatorio === 'geral' ? 'active' : ''} onClick={() => { if (tipoRelatorio === 'geral') setResumoAberto(true); }}><input type="radio" name="tipo-relatorio" checked={tipoRelatorio === 'geral'} onChange={() => { setTipoRelatorio('geral'); setAlunoSelecionado('Todos'); setPesquisaAluno(''); setTurmaSelecionada('Todas'); setResumoAberto(true); }} /><span><b>Relatório Geral</b><small>Todos os alunos e turmas</small></span></label>
        <label className={tipoRelatorio === 'aluno' ? 'active' : ''}><input type="radio" name="tipo-relatorio" checked={tipoRelatorio === 'aluno'} onChange={() => { setTipoRelatorio('aluno'); setTurmaSelecionada('Todas'); setResumoAberto(false); }} /><span><b>Por Aluno</b><small>Frequência individual</small></span></label>
        <label className={tipoRelatorio === 'turma' ? 'active' : ''}><input type="radio" name="tipo-relatorio" checked={tipoRelatorio === 'turma'} onChange={() => { setTipoRelatorio('turma'); setAlunoSelecionado('Todos'); setPesquisaAluno(''); setResumoAberto(false); }} /><span><b>Por Turma</b><small>Presenças e faltas da turma</small></span></label>
      </div>
      <div className="report-filters">
        <label>Mês<select value={mes} onChange={(e) => setMes(Number(e.target.value))}>{meses.map((nome, i) => <option key={nome} value={i + 1}>{nome}</option>)}</select></label>
        <label>Ano<select value={ano} onChange={(e) => setAno(Number(e.target.value))}>{anos.map((item) => <option key={item}>{item}</option>)}</select></label>
        {tipoRelatorio === 'aluno' && <div className="report-student-picker">
          <label>Pesquisar Aluno
            <div className="report-search-combobox">
              <div className="report-search-field"><span aria-hidden="true">⌕</span><input type="search" role="combobox" aria-expanded={Boolean(pesquisaAluno && alunoSelecionado === 'Todos')} value={pesquisaAluno} placeholder="Digite o nome do aluno" onChange={(e) => { setPesquisaAluno(e.target.value); setAlunoSelecionado('Todos'); setResumoAberto(false); }} /></div>
              {pesquisaAluno && alunoSelecionado === 'Todos' && <div className="report-search-results" role="listbox">
                {alunosPesquisados.length ? alunosPesquisados.slice(0, 8).map((aluno) => <button key={aluno.id} type="button" role="option" onClick={() => { setAlunoSelecionado(aluno.nome); setPesquisaAluno(aluno.nome); setResumoAberto(true); }}><span className="report-student-avatar">{aluno.nome.charAt(0).toUpperCase()}</span><span><strong>{aluno.nome}</strong><small>{aluno.turma || 'Sem turma'}</small></span></button>) : <p>Nenhum aluno encontrado.</p>}
              </div>}
            </div>
          </label>
        </div>}
        {tipoRelatorio === 'turma' && <label>Selecionar Turma<select value={turmaSelecionada} onChange={(e) => { const turma = e.target.value; setTurmaSelecionada(turma); setResumoAberto(turma !== 'Todas'); }}><option value="Todas">Selecione uma turma</option>{turmasOrdenadas.map((turma) => <option key={turma.id} value={turma.nome}>{turma.nome}</option>)}</select></label>}
      </div>
    </Card>

    {resumoAberto && <div ref={resumoRef} className="report-preview-anchor"><Card padding="lg" className="report-preview-card">
      <div className="report-preview-header">
        <div><span>RESUMO DO ARQUIVO</span><h2>Relatório pronto para baixar</h2></div>
        <button type="button" className="report-preview-close" onClick={() => setResumoAberto(false)} aria-label="Fechar resumo">×</button>
      </div>
      <div className="report-preview-scope">
        <div><small>Período</small><strong>{periodo}</strong></div>
        <div><small>Tipo</small><strong>{tipoRelatorio === 'aluno' ? 'Relatório por aluno' : tipoRelatorio === 'turma' ? 'Relatório por turma' : 'Relatório geral'}</strong></div>
        <div><small>Selecionado</small><strong>{escopo === 'GERAL' ? 'Todos' : escopo}</strong></div>
        <div><small>Registros</small><strong>{frequenciasFiltradas.length}</strong></div>
      </div>
      <div className="report-preview-numbers">
        <div className="success"><span>✓</span><strong>{totalPresencas}</strong><small>Presenças</small></div>
        <div className="danger"><span>×</span><strong>{totalFaltas}</strong><small>Faltas</small></div>
        <div className="primary"><span>%</span><strong>{formatarPercentual(frequenciaMedia)}</strong><small>Frequência</small></div>
      </div>
      {resumoTurma && <p className="report-preview-detail"><strong>{resumoTurma.nome}</strong> · {resumoTurma.professor} · {resumoTurma.horario} · {resumoTurma.alunos} alunos</p>}
      <div className="report-preview-download"><div><strong>Escolha o formato</strong><small>O arquivo respeitará todos os filtros acima.</small></div>{botoesExportacao()}</div>
    </Card></div>}

    <Card padding="lg" className="report-card-block">
      <div className="report-section-title"><div><span>DETALHAMENTO</span><h2>Frequência por Aluno</h2></div><strong>{periodo}</strong></div>
      <div className="report-table-wrap"><table className="report-table"><thead><tr><th>Aluno</th><th>Turma</th><th>Presenças</th><th>Faltas</th><th>Frequência</th></tr></thead><tbody>
        {resumoAlunos.length ? resumoAlunos.map((aluno) => <tr key={aluno.nome}><td><strong>{aluno.nome}</strong></td><td>{aluno.turma}</td><td><span className="report-count success">{aluno.presencas}</span></td><td><span className="report-count danger">{aluno.faltas}</span></td><td><strong>{formatarPercentual(aluno.percentual)}</strong></td></tr>) : <tr><td colSpan={5} className="report-empty">Nenhum dado encontrado.</td></tr>}
      </tbody></table></div>
    </Card>

  </div>;
};
