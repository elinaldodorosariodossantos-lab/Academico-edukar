// Types for the School Class Management System

export interface Aluno {
  id: string;

  nome: string;

  cpf?: string;

  dataNascimento: string;

  dataInicio: string;

  responsavel: string;

  cpfResponsavel?: string;

  endereco?: string;

  bairro?: string;

  cidade?: string;

  estado?: string;

  email?: string;

  telefone: string;

  turma: string;

  horaInicio?: string;

  horaFim?: string;

  diasAula: string[];

  mensagem?: string;

  status: 'Ativo' | 'Inativo';

  createdAt?: string;

  updatedAt?: string;
}

export interface Turma {

  id: string;

  nome: string;

  professor: string;

  horario: string;

  horaInicio?: string;

  horaFim?: string;

  diasSemana: string[];

  quantidadeAlunos: number;

  sala?: string;

  createdAt?: string;

  updatedAt?: string;
}

export interface Horario {

  id: string;

  horaInicial: string;

  horaFinal: string;

  sala: string;
}

export interface Frequencia {

  id: string;

  data: string;

  turma: string;

  aluno: string;

  presenca: 'Presente' | 'Falta';

  conteudoMinistrado: string;

  observacoes: string;

  professorResponsavel: string;

  createdAt?: string;

  updatedAt?: string;
}

export interface ContatoVinculado {

  id: string;

  nome: string;

  telefone: string;

  relacao: 'Escola' | 'Mãe' | 'Pai' | 'Responsável' | 'Outro';

  aluno?: string;

  turma: string;

  principal: boolean;

  createdAt?: string;

  updatedAt?: string;
}

export interface MensagemAutomatica {

  id: string;

  turmaId: string;

  titulo: string;

  tipo: 'inicio' | 'presente' | 'ausente' | 'fim';

  minutosAntes: number;

  texto: string;

  ativo: boolean;

  createdAt?: string;

  updatedAt?: string;
}

export type BoletoEmitido = 'Sim' | 'Não';

export type FinanceiroStatus = 'Pago' | 'Permuta' | 'Pendente';
export type FinanceiroModalidade = 'Boleto' | 'Permuta';

export interface FinanceiroPerfil {
  id?: string;
  alunoId: string;
  modalidade: FinanceiroModalidade;
  createdAt?: string;
  updatedAt?: string;
}

export interface FinanceiroCurso {
  id?: string;
  turmaId: string;
  turmaNome: string;
  valorMensalidade: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FinanceiroAluno {
  id?: string;
  alunoId: string;
  alunoNome: string;
  curso: string;
  turma?: string;
  valorMensalidade: number;
  mesReferencia: number;
  anoReferencia: number;
  boletoEmitido: BoletoEmitido;
  statusPagamento: FinanceiroStatus;
  observacoes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Aula {

  id: string;

  turmaId: string;

  data: string;

  horario: string;

  tema: string;

  objetivos: string;

  atividades: string;

  observacoesPedagogicas: string;

  professor: string;
}

export interface User {

  id: string;

  email: string;

  nome: string;

  role: 'admin' | 'professor' | 'coordenador';

  createdAt?: string;
}

export interface DashboardStats {

  totalAlunos: number;

  totalTurmas: number;

  aulasHoje: number;

  frequenciaHoje: number;

  alunosFaltosos: number;

  proximasAulas: Aula[];
}

export interface ApiResponse<T = any> {

  success: boolean;

  data?: T;

  error?: string;

  message?: string;
}
