import { supabase } from '../lib/supabase';
import type {
  Aluno,
  Turma,
  Horario,
  Frequencia,
  ContatoVinculado,
  MensagemAutomatica,
  FinanceiroAluno,
  BoletoEmitido,
  FinanceiroStatus,
  FinanceiroPerfil,
  FinanceiroModalidade,
  FinanceiroCurso,
} from '../types';

const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);

  if (!value) return [];

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeAluno = (aluno: any): Aluno => ({
  id: aluno?.id ?? aluno?.ID ?? '',
  nome: aluno?.nome ?? aluno?.['Nome Completo'] ?? '',
  cpf: aluno?.cpf ?? aluno?.['CPF'] ?? '',
  dataNascimento: aluno?.dataNascimento ?? aluno?.['Data de Nascimento'] ?? aluno?.data_nascimento ?? '',
  dataInicio: aluno?.dataInicio ?? aluno?.['Data de Início'] ?? aluno?.data_inicio ?? '',
  responsavel: aluno?.responsavel ?? aluno?.['Responsável'] ?? aluno?.responsavel ?? '',
  cpfResponsavel: aluno?.cpfResponsavel ?? aluno?.cpf_responsavel ?? '',
  endereco: aluno?.endereco ?? '',
  bairro: aluno?.bairro ?? '',
  cidade: aluno?.cidade ?? '',
  estado: aluno?.estado ?? '',
  email: aluno?.email ?? '',
  telefone: aluno?.telefone ?? aluno?.['Telefone'] ?? '',
  turma: aluno?.turma ?? aluno?.['Turma'] ?? '',
  diasAula: normalizeStringArray(aluno?.diasAula ?? aluno?.['Dias da Aula'] ?? aluno?.dias_aula),
  mensagem: aluno?.mensagem ?? aluno?.['Mensagem'] ?? aluno?.mensagem_aluno ?? '',
  status: (aluno?.status ?? aluno?.['Status'] ?? 'Ativo') as 'Ativo' | 'Inativo',
  createdAt: aluno?.createdAt ?? aluno?.['Data de Criação'] ?? aluno?.created_at,
  updatedAt: aluno?.updatedAt ?? aluno?.['Data de Atualização'] ?? aluno?.updated_at,
});

const normalizeTurma = (turma: any): Turma => ({
  id: turma?.id ?? turma?.ID ?? '',
  nome: turma?.nome ?? turma?.['Nome da Turma'] ?? '',
  professor: turma?.professor ?? turma?.['Professor'] ?? '',
  horario: turma?.horario ?? turma?.['Horário'] ?? turma?.['Horario'] ?? turma?.horario ?? '',
  horaInicio: turma?.horaInicio ?? turma?.['Hora de Início'] ?? turma?.['Hora Inicial'] ?? turma?.hora_inicio ?? '',
  horaFim: turma?.horaFim ?? turma?.['Hora de Término'] ?? turma?.['Hora Final'] ?? turma?.hora_fim ?? '',
  diasSemana: normalizeStringArray(turma?.diasSemana ?? turma?.['Dias da Semana'] ?? turma?.dias_semana),
  quantidadeAlunos: Number(turma?.quantidadeAlunos ?? turma?.['Quantidade de Alunos'] ?? turma?.quantidade_alunos ?? 0),
  sala: turma?.sala ?? turma?.['Sala'] ?? turma?.sala ?? '',
  createdAt: turma?.createdAt ?? turma?.['Data de Criação'] ?? turma?.created_at,
  updatedAt: turma?.updatedAt ?? turma?.['Data de Atualização'] ?? turma?.updated_at,
});

const normalizeHorario = (horario: any): Horario => ({
  id: horario?.id ?? horario?.ID ?? '',
  horaInicial: horario?.horaInicial ?? horario?.['Hora Inicial'] ?? horario?.hora_inicial ?? '',
  horaFinal: horario?.horaFinal ?? horario?.['Hora Final'] ?? horario?.hora_final ?? '',
  sala: horario?.sala ?? horario?.['Sala'] ?? horario?.sala ?? '',
});

const normalizeContatoVinculado = (contato: any) => ({
  id: contato?.id ?? contato?.ID ?? '',
  nome: contato?.nome ?? contato?.['Nome'] ?? '',
  telefone: contato?.telefone ?? contato?.['Telefone'] ?? '',
  relacao: (contato?.relacao ?? contato?.['Relação'] ?? 'Responsável') as ContatoVinculado['relacao'],
  aluno: contato?.aluno ?? contato?.['Aluno'] ?? undefined,
  turma: contato?.turma ?? contato?.['Turma'] ?? 'Robótica Kids',
  principal: Boolean(contato?.principal ?? contato?.['Principal'] ?? false),
  createdAt: contato?.created_at ?? contato?.['Data de Criação'],
  updatedAt: contato?.updated_at ?? contato?.['Data de Atualização'],
});

const normalizeMensagemAutomatica = (item: any) => ({
  id: item?.id ?? item?.ID ?? '',
  turmaId: item?.turma_id ?? item?.turmaId ?? '',
  titulo: item?.titulo ?? item?.['Título'] ?? '',
  tipo: (item?.tipo ?? item?.['Tipo'] ?? 'inicio') as any,
  minutosAntes: Number(item?.minutos_antes ?? item?.minutosAntes ?? 15),
  texto: item?.texto ?? item?.['Texto'] ?? '',
  ativo: Boolean(item?.ativo ?? item?.['Ativo'] ?? true),
  createdAt: item?.created_at ?? item?.['Data de Criação'],
  updatedAt: item?.updated_at ?? item?.['Data de Atualização'],
});

const normalizeFinanceiroStatus = (value: unknown): FinanceiroStatus => {
  const status = String(value ?? 'Pendente');
  return status === 'Pago' || status === 'Permuta' || status === 'Pendente'
    ? status
    : 'Pendente';
};

const normalizeFinanceiroPerfil = (item: any): FinanceiroPerfil => ({
  id: item?.id ?? undefined,
  alunoId: item?.aluno_id ?? item?.alunoId ?? '',
  modalidade: (item?.modalidade === 'Permuta' ? 'Permuta' : 'Boleto') as FinanceiroModalidade,
  createdAt: item?.created_at,
  updatedAt: item?.updated_at,
});

const normalizeFinanceiroCurso = (item: any): FinanceiroCurso => ({
  id: item?.id ?? undefined,
  turmaId: item?.turma_id ?? item?.turmaId ?? '',
  turmaNome: item?.turma_nome ?? item?.turmaNome ?? '',
  valorMensalidade: Number(item?.valor_mensalidade ?? item?.valorMensalidade ?? 0),
  createdAt: item?.created_at,
  updatedAt: item?.updated_at,
});

const normalizeFinanceiroAluno = (item: any): FinanceiroAluno => ({
  id: item?.id ?? item?.ID ?? undefined,
  alunoId: item?.aluno_id ?? item?.alunoId ?? '',
  alunoNome: item?.aluno_nome ?? item?.alunoNome ?? '',
  curso: item?.curso ?? item?.['Curso'] ?? '',
  turma: item?.turma ?? item?.['Turma'] ?? item?.curso ?? '',
  valorMensalidade: Number(item?.valor_mensalidade ?? item?.valorMensalidade ?? 0),
  mesReferencia: Number(item?.mes_referencia ?? item?.mesReferencia ?? new Date().getMonth() + 1),
  anoReferencia: Number(item?.ano_referencia ?? item?.anoReferencia ?? new Date().getFullYear()),
  boletoEmitido: (item?.boleto_emitido ?? item?.boletoEmitido ?? 'Não') as BoletoEmitido,
  statusPagamento: normalizeFinanceiroStatus(item?.status_pagamento ?? item?.statusPagamento),
  observacoes: item?.observacoes ?? item?.['Observações'] ?? '',
  createdAt: item?.created_at ?? item?.['Data de Criação'],
  updatedAt: item?.updated_at ?? item?.['Data de Atualização'],
});

const getTurnoOrder = (value: string): number => {
  const normalized = value.toLowerCase();

  if (normalized.includes('manha') || normalized.includes('manhã')) return 0;
  if (normalized.includes('tarde')) return 1;
  if (normalized.includes('noite')) return 2;

  return 3;
};

const ordenarTurmasPorTurno = (turmas: Turma[]): Turma[] => {
  return [...turmas].sort((a, b) => {
    const ordem = getTurnoOrder(a.nome) - getTurnoOrder(b.nome);
    if (ordem !== 0) return ordem;
    return (a.nome || '').localeCompare(b.nome || '');
  });
};

const assertSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.');
  }

  return supabase;
};

const isBackendUnavailableError = (error: unknown) => {
  if (!error) return false;

  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  return [
    'supabase',
    'fetch failed',
    'failed to fetch',
    'network',
    'not resolved',
    'enotfound',
    'failed to load resource',
  ].some((item) => normalized.includes(item));
};

export const alunosService = {
  async getAll(): Promise<Aluno[]> {
    const client = assertSupabase();
    try {
      const { data, error } = await client.from('alunos').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(normalizeAluno);
    } catch (error) {
      if (isBackendUnavailableError(error)) return [];
      throw error;
    }
  },

  async create(aluno: Omit<Aluno, 'id'>): Promise<Aluno> {
    const client = assertSupabase();
    const payload: Record<string, any> = {
      nome: aluno.nome,
      cpf: aluno.cpf || null,
      data_nascimento: aluno.dataNascimento,
      data_inicio: aluno.dataInicio,
      responsavel: aluno.responsavel,
      cpf_responsavel: aluno.cpfResponsavel || null,
      endereco: aluno.endereco || '',
      bairro: aluno.bairro || '',
      cidade: aluno.cidade || '',
      estado: aluno.estado || '',
      email: aluno.email || '',
      telefone: aluno.telefone,
      turma: aluno.turma,
      dias_aula: aluno.diasAula || [],
      mensagem: aluno.mensagem || '',
      status: aluno.status,
    };

    const { data, error } = await client.from('alunos').insert(payload).select().single();
    if (error) throw error;
    return normalizeAluno(data);
  },

  async update(id: string, aluno: Partial<Aluno>): Promise<Aluno> {
    const client = assertSupabase();
    const payload: Record<string, any> = {
      ...(aluno.nome ? { nome: aluno.nome } : {}),
      ...(aluno.cpf !== undefined ? { cpf: aluno.cpf || null } : {}),
      ...(aluno.dataNascimento ? { data_nascimento: aluno.dataNascimento } : {}),
      ...(aluno.dataInicio ? { data_inicio: aluno.dataInicio } : {}),
      ...(aluno.responsavel ? { responsavel: aluno.responsavel } : {}),
      ...(aluno.cpfResponsavel !== undefined ? { cpf_responsavel: aluno.cpfResponsavel || null } : {}),
      ...(aluno.endereco !== undefined ? { endereco: aluno.endereco } : {}),
      ...(aluno.bairro !== undefined ? { bairro: aluno.bairro } : {}),
      ...(aluno.cidade !== undefined ? { cidade: aluno.cidade } : {}),
      ...(aluno.estado !== undefined ? { estado: aluno.estado } : {}),
      ...(aluno.email !== undefined ? { email: aluno.email } : {}),
      ...(aluno.telefone ? { telefone: aluno.telefone } : {}),
      ...(aluno.turma ? { turma: aluno.turma } : {}),
      ...(aluno.diasAula ? { dias_aula: aluno.diasAula } : {}),
      ...(aluno.mensagem !== undefined ? { mensagem: aluno.mensagem } : {}),
      ...(aluno.status ? { status: aluno.status } : {}),
    };

    const { data, error } = await client.from('alunos').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return normalizeAluno(data);
  },

  async delete(id: string): Promise<void> {
    const client = assertSupabase();
    const { error } = await client.from('alunos').delete().eq('id', id);
    if (error) throw error;
  },

  async search(termo: string, signal?: AbortSignal): Promise<Aluno[]> {
    const client = assertSupabase();
    const searchTerm = termo.trim();
    if (!searchTerm) return this.getAll();

    const { data, error } = await client
      .from('alunos')
      .select('*')
      .or(`nome.ilike.%${searchTerm}%,turma.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .abortSignal(signal ?? new AbortController().signal);

    if (error) throw error;
    return (data || []).map(normalizeAluno);
  },
};

export const turmasService = {
  async getAll(): Promise<Turma[]> {
    const client = assertSupabase();
    try {
      const { data, error } = await client.from('turmas').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return ordenarTurmasPorTurno((data || []).map(normalizeTurma));
    } catch (error) {
      if (isBackendUnavailableError(error)) return [];
      throw error;
    }
  },

  async syncQuantidadeAlunos(alunos: Aluno[]): Promise<void> {
    const client = assertSupabase();
    const { data: turmasData, error: turmasError } = await client.from('turmas').select('id, nome');
    if (turmasError) throw turmasError;

    const contagemPorTurma = alunos.reduce<Record<string, number>>((acc, aluno) => {
      const turma = (aluno.turma || '').trim();
      if (!turma) return acc;
      acc[turma] = (acc[turma] || 0) + 1;
      return acc;
    }, {});

    await Promise.all((turmasData || []).map(async (turma) => {
      const quantidade = contagemPorTurma[turma.nome] || 0;
      const { error } = await client.from('turmas').update({ quantidade_alunos: quantidade }).eq('id', turma.id);
      if (error) throw error;
    }));
  },

  async create(turma: Omit<Turma, 'id'>): Promise<Turma> {
    const client = assertSupabase();
    const payload = {
      nome: turma.nome,
      professor: turma.professor,
      horario: turma.horario,
      hora_inicio: turma.horaInicio || '',
      hora_fim: turma.horaFim || '',
      dias_semana: turma.diasSemana || [],
      quantidade_alunos: turma.quantidadeAlunos || 0,
      sala: turma.sala || '',
    };

    const { data, error } = await client.from('turmas').insert(payload).select().single();
    if (error) throw error;
    return normalizeTurma(data);
  },

  async update(id: string, turma: Partial<Turma>): Promise<Turma> {
    const client = assertSupabase();
    const payload = {
      ...(turma.nome ? { nome: turma.nome } : {}),
      ...(turma.professor ? { professor: turma.professor } : {}),
      ...(turma.horario ? { horario: turma.horario } : {}),
      ...(turma.horaInicio !== undefined ? { hora_inicio: turma.horaInicio } : {}),
      ...(turma.horaFim !== undefined ? { hora_fim: turma.horaFim } : {}),
      ...(turma.diasSemana ? { dias_semana: turma.diasSemana } : {}),
      ...(turma.quantidadeAlunos !== undefined ? { quantidade_alunos: turma.quantidadeAlunos } : {}),
      ...(turma.sala !== undefined ? { sala: turma.sala } : {}),
    };

    const { data, error } = await client.from('turmas').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return normalizeTurma(data);
  },

  async delete(id: string): Promise<void> {
    const client = assertSupabase();
    const { error } = await client.from('turmas').delete().eq('id', id);
    if (error) throw error;
  },
};

export const horariosService = {
  async getAll(): Promise<Horario[]> {
    const client = assertSupabase();
    const { data, error } = await client.from('horarios').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(normalizeHorario);
  },

  async create(horario: Omit<Horario, 'id'>): Promise<Horario> {
    const client = assertSupabase();
    const payload = {
      hora_inicial: horario.horaInicial,
      hora_final: horario.horaFinal,
      sala: horario.sala,
    };

    const { data, error } = await client.from('horarios').insert(payload).select().single();
    if (error) throw error;
    return normalizeHorario(data);
  },

  async update(id: string, horario: Partial<Horario>): Promise<Horario> {
    const client = assertSupabase();
    const payload = {
      ...(horario.horaInicial ? { hora_inicial: horario.horaInicial } : {}),
      ...(horario.horaFinal ? { hora_final: horario.horaFinal } : {}),
      ...(horario.sala !== undefined ? { sala: horario.sala } : {}),
    };

    const { data, error } = await client.from('horarios').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return normalizeHorario(data);
  },

  async delete(id: string): Promise<void> {
    const client = assertSupabase();
    const { error } = await client.from('horarios').delete().eq('id', id);
    if (error) throw error;
  },
};

export const contatosVinculadosService = {
  async getAll(): Promise<ContatoVinculado[]> {
    const client = assertSupabase();
    try {
      const { data, error } = await client.from('contatos_vinculados').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(normalizeContatoVinculado);
    } catch (error) {
      if (isBackendUnavailableError(error)) return [];
      throw error;
    }
  },

  async getByTurma(turma: string): Promise<ContatoVinculado[]> {
    const client = assertSupabase();
    try {
      const { data, error } = await client.from('contatos_vinculados').select('*').eq('turma', turma).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(normalizeContatoVinculado);
    } catch (error) {
      if (isBackendUnavailableError(error)) return [];
      throw error;
    }
  },

  async create(contato: Omit<ContatoVinculado, 'id'>): Promise<ContatoVinculado> {
    const client = assertSupabase();
    const payload = {
      nome: contato.nome,
      telefone: contato.telefone,
      relacao: contato.relacao,
      aluno: contato.aluno ?? null,
      turma: contato.turma,
      principal: contato.principal,
    };

    const { data, error } = await client.from('contatos_vinculados').insert(payload).select().single();
    if (error) throw error;
    return normalizeContatoVinculado(data);
  },

  async update(id: string, contato: Partial<ContatoVinculado>): Promise<ContatoVinculado> {
    const client = assertSupabase();
    const payload = {
      ...(contato.nome ? { nome: contato.nome } : {}),
      ...(contato.telefone ? { telefone: contato.telefone } : {}),
      ...(contato.relacao ? { relacao: contato.relacao } : {}),
      ...(contato.aluno !== undefined ? { aluno: contato.aluno || null } : {}),
      ...(contato.turma ? { turma: contato.turma } : {}),
      ...(contato.principal !== undefined ? { principal: contato.principal } : {}),
    };

    const { data, error } = await client.from('contatos_vinculados').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return normalizeContatoVinculado(data);
  },

  async delete(id: string): Promise<void> {
    const client = assertSupabase();
    const { error } = await client.from('contatos_vinculados').delete().eq('id', id);
    if (error) throw error;
  },
};

export const mensagensAutomaticaService = {
  async getByTurma(turmaId: string): Promise<MensagemAutomatica[]> {
    const client = assertSupabase();
    try {
      const { data, error } = await client.from('mensagens_automatica').select('*').eq('turma_id', turmaId).order('minutos_antes', { ascending: true });
      if (error) throw error;
      return (data || []).map(normalizeMensagemAutomatica);
    } catch (error) {
      if (isBackendUnavailableError(error)) return [];
      throw error;
    }
  },

  async create(item: Omit<MensagemAutomatica, 'id'>): Promise<MensagemAutomatica> {
    const client = assertSupabase();
    const payload = {
      turma_id: item.turmaId,
      titulo: item.titulo,
      tipo: item.tipo,
      minutos_antes: item.minutosAntes,
      texto: item.texto,
      ativo: item.ativo,
    };

    const { data, error } = await client.from('mensagens_automatica').insert(payload).select().single();
    if (error) throw error;
    return normalizeMensagemAutomatica(data);
  },

  async update(id: string, item: Partial<MensagemAutomatica>): Promise<MensagemAutomatica> {
    const client = assertSupabase();
    const payload = {
      ...(item.turmaId ? { turma_id: item.turmaId } : {}),
      ...(item.titulo ? { titulo: item.titulo } : {}),
      ...(item.tipo ? { tipo: item.tipo } : {}),
      ...(item.minutosAntes !== undefined ? { minutos_antes: item.minutosAntes } : {}),
      ...(item.texto ? { texto: item.texto } : {}),
      ...(item.ativo !== undefined ? { ativo: item.ativo } : {}),
    };

    const { data, error } = await client.from('mensagens_automatica').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return normalizeMensagemAutomatica(data);
  },

  async delete(id: string): Promise<void> {
    const client = assertSupabase();
    const { error } = await client.from('mensagens_automatica').delete().eq('id', id);
    if (error) throw error;
  },
};

export const financeiroService = {
  async getAll(): Promise<FinanceiroAluno[]> {
    const client = assertSupabase();
    try {
      const { data, error } = await client
        .from('financeiro_alunos')
        .select('*')
        .order('ano_referencia', { ascending: false })
        .order('mes_referencia', { ascending: false })
        .order('aluno_nome', { ascending: true });

      if (error) throw error;
      return (data || []).map(normalizeFinanceiroAluno);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        isBackendUnavailableError(error) ||
        /financeiro_alunos|relation .* does not exist|does not exist/i.test(message)
      ) {
        return [];
      }
      throw error;
    }
  },

  async getByAlunoMesAno(alunoId: string, mesReferencia: number, anoReferencia: number): Promise<FinanceiroAluno | null> {
    const client = assertSupabase();
    try {
      const { data, error } = await client
        .from('financeiro_alunos')
        .select('*')
        .eq('aluno_id', alunoId)
        .eq('mes_referencia', mesReferencia)
        .eq('ano_referencia', anoReferencia)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data ? normalizeFinanceiroAluno(data) : null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        isBackendUnavailableError(error) ||
        /financeiro_alunos|relation .* does not exist|does not exist/i.test(message)
      ) {
        return null;
      }
      throw error;
    }
  },

  async upsert(item: Omit<FinanceiroAluno, 'id' | 'createdAt' | 'updatedAt'>): Promise<FinanceiroAluno> {
    const client = assertSupabase();
    const payload = {
      aluno_id: item.alunoId,
      aluno_nome: item.alunoNome,
      curso: item.curso || item.turma || 'Sem curso',
      turma: item.turma || item.curso || 'Sem turma',
      valor_mensalidade: Number(item.valorMensalidade || 0),
      mes_referencia: Number(item.mesReferencia),
      ano_referencia: Number(item.anoReferencia),
      boleto_emitido: item.boletoEmitido,
      status_pagamento: item.statusPagamento,
      observacoes: item.observacoes || '',
    };

    const existing = await this.getByAlunoMesAno(item.alunoId, Number(item.mesReferencia), Number(item.anoReferencia));

    if (existing?.id) {
      const { data, error } = await client
        .from('financeiro_alunos')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return normalizeFinanceiroAluno(data);
    }

    const { data, error } = await client
      .from('financeiro_alunos')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return normalizeFinanceiroAluno(data);
  },

  async delete(id: string): Promise<void> {
    const client = assertSupabase();
    const { error } = await client.from('financeiro_alunos').delete().eq('id', id);
    if (error) throw error;
  },
};

export const financeiroPerfilService = {
  async getAll(): Promise<FinanceiroPerfil[]> {
    const client = assertSupabase();
    try {
      const { data, error } = await client
        .from('financeiro_perfis')
        .select('*');

      if (error) throw error;
      return (data || []).map(normalizeFinanceiroPerfil);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isBackendUnavailableError(error) || /financeiro_perfis|does not exist/i.test(message)) return [];
      throw error;
    }
  },

  async upsert(alunoId: string, modalidade: FinanceiroModalidade): Promise<FinanceiroPerfil> {
    const client = assertSupabase();
    const { data, error } = await client
      .from('financeiro_perfis')
      .upsert(
        { aluno_id: alunoId, modalidade },
        { onConflict: 'aluno_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return normalizeFinanceiroPerfil(data);
  },

  async upsertMany(perfis: Array<Pick<FinanceiroPerfil, 'alunoId' | 'modalidade'>>): Promise<FinanceiroPerfil[]> {
    const client = assertSupabase();
    if (perfis.length === 0) return [];

    const payload = perfis.map((perfil) => ({
      aluno_id: perfil.alunoId,
      modalidade: perfil.modalidade,
    }));
    const { data, error } = await client
      .from('financeiro_perfis')
      .upsert(payload, { onConflict: 'aluno_id' })
      .select();

    if (error) throw error;
    return (data || []).map(normalizeFinanceiroPerfil);
  },
};

export const financeiroCursoService = {
  async getAll(): Promise<FinanceiroCurso[]> {
    const client = assertSupabase();
    try {
      const { data, error } = await client.from('financeiro_cursos').select('*').order('turma_nome');
      if (error) throw error;
      return (data || []).map(normalizeFinanceiroCurso);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isBackendUnavailableError(error) || /financeiro_cursos|does not exist/i.test(message)) return [];
      throw error;
    }
  },

  async upsertMany(cursos: Array<Omit<FinanceiroCurso, 'id' | 'createdAt' | 'updatedAt'>>): Promise<FinanceiroCurso[]> {
    const client = assertSupabase();
    if (cursos.length === 0) return [];
    const payload = cursos.map((curso) => ({
      turma_id: curso.turmaId,
      turma_nome: curso.turmaNome,
      valor_mensalidade: Number(curso.valorMensalidade || 0),
    }));
    const { data, error } = await client.from('financeiro_cursos').upsert(payload, { onConflict: 'turma_id' }).select();
    if (error) throw error;
    return (data || []).map(normalizeFinanceiroCurso);
  },
};

export const frequenciaService = {
  async getAll(): Promise<Frequencia[]> {
    const client = assertSupabase();
    const { data, error } = await client.from('frequencias').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((item) => ({
      id: item.id,
      data: item.data,
      turma: item.turma,
      aluno: item.aluno,
      presenca: item.presenca,
      conteudoMinistrado: item.conteudo_ministrado,
      observacoes: item.observacoes,
      professorResponsavel: item.professor_responsavel,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },

  async getByData(data: string): Promise<Frequencia[]> {
    const client = assertSupabase();
    const { data: rows, error } = await client.from('frequencias').select('*').eq('data', data);
    if (error) throw error;
    return (rows || []).map((item) => ({
      id: item.id,
      data: item.data,
      turma: item.turma,
      aluno: item.aluno,
      presenca: item.presenca,
      conteudoMinistrado: item.conteudo_ministrado,
      observacoes: item.observacoes,
      professorResponsavel: item.professor_responsavel,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },

  async getByTurma(turmaId: string): Promise<Frequencia[]> {
    const client = assertSupabase();
    const { data: rows, error } = await client.from('frequencias').select('*').eq('turma', turmaId);
    if (error) throw error;
    return (rows || []).map((item) => ({
      id: item.id,
      data: item.data,
      turma: item.turma,
      aluno: item.aluno,
      presenca: item.presenca,
      conteudoMinistrado: item.conteudo_ministrado,
      observacoes: item.observacoes,
      professorResponsavel: item.professor_responsavel,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },

  async create(frequencia: Omit<Frequencia, 'id'>): Promise<Frequencia> {
    const client = assertSupabase();
    const payload = {
      data: frequencia.data,
      turma: frequencia.turma,
      aluno: frequencia.aluno,
      presenca: frequencia.presenca,
      conteudo_ministrado: frequencia.conteudoMinistrado,
      observacoes: frequencia.observacoes,
      professor_responsavel: frequencia.professorResponsavel,
    };

    const { data, error } = await client.from('frequencias').insert(payload).select().single();
    if (error) throw error;
    return {
      id: data.id,
      data: data.data,
      turma: data.turma,
      aluno: data.aluno,
      presenca: data.presenca,
      conteudoMinistrado: data.conteudo_ministrado,
      observacoes: data.observacoes,
      professorResponsavel: data.professor_responsavel,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async update(id: string, frequencia: Partial<Frequencia>): Promise<Frequencia> {
    const client = assertSupabase();
    const current = await this.getAll();
    const currentItem = current.find((item) => item.id === id);
    if (!currentItem) throw new Error('Frequência não encontrada');

    const merged = { ...currentItem, ...frequencia };
    const payload = {
      data: merged.data,
      turma: merged.turma,
      aluno: merged.aluno,
      presenca: merged.presenca,
      conteudo_ministrado: merged.conteudoMinistrado,
      observacoes: merged.observacoes,
      professor_responsavel: merged.professorResponsavel,
    };

    const { data, error } = await client.from('frequencias').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return {
      id: data.id,
      data: data.data,
      turma: data.turma,
      aluno: data.aluno,
      presenca: data.presenca,
      conteudoMinistrado: data.conteudo_ministrado,
      observacoes: data.observacoes,
      professorResponsavel: data.professor_responsavel,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async registrarMultipla(frequenciasInput: Omit<Frequencia, 'id'>[]): Promise<Frequencia[]> {
    const client = assertSupabase();
    const payload = frequenciasInput.map((item) => ({
      data: item.data,
      turma: item.turma,
      aluno: item.aluno,
      presenca: item.presenca,
      conteudo_ministrado: item.conteudoMinistrado,
      observacoes: item.observacoes,
      professor_responsavel: item.professorResponsavel,
    }));

    const { data, error } = await client.from('frequencias').insert(payload).select();
    if (error) throw error;
    return (data || []).map((item) => ({
      id: item.id,
      data: item.data,
      turma: item.turma,
      aluno: item.aluno,
      presenca: item.presenca,
      conteudoMinistrado: item.conteudo_ministrado,
      observacoes: item.observacoes,
      professorResponsavel: item.professor_responsavel,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },
};

export const dashboardService = {
  async getStats() {
    const [alunos, turmas, frequencias] = await Promise.all([
      alunosService.getAll(),
      turmasService.getAll(),
      frequenciaService.getAll(),
    ]);

    const hoje = new Date().toISOString().split('T')[0];
    const frequenciasHoje = frequencias.filter((item) => item.data === hoje);

    return {
      totalAlunos: alunos.length,
      totalTurmas: turmas.length,
      aulasHoje: frequenciasHoje.length,
      frequenciaHoje: frequenciasHoje.filter((item) => item.presenca === 'Presente').length,
      alunosFaltosos: frequenciasHoje.filter((item) => item.presenca === 'Falta').length,
    };
  },
};

export default supabase;
