import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../common';
import { useAlunos } from '../../hooks/useAlunos';
import { useTurmas } from '../../hooks/useTurmas';
import { mensagensAutomaticaService } from '../../services/api';
import type { Aluno, Turma } from '../../types';

type MessageTemplate = {
  id: string;
  titulo: string;
  texto: string;
  turmaIds: string[];
};

type MessageForm = {
  titulo: string;
  texto: string;
  turmaIds: string[];
};

type EscolaContato = {
  nome: string;
  telefone: string;
  turma: string;
};

type TriggerMessage = {
  id: 'inicio' | 'presente' | 'ausente' | 'fim';
  titulo: string;
  minutos: number;
  texto: string;
  ativo: boolean;
};

const EMPTY_FORM: MessageForm = {
  titulo: '',
  texto: '',
  turmaIds: [],
};

const normalizePhone = (phone?: string) => {
  if (!phone) return '';

  const digits = phone.replace(/\D/g, '');

  if (!digits) return '';

  return digits.startsWith('55') ? digits : `55${digits}`;
};

const normalizeText = (value?: string) => value?.trim().toLowerCase() ?? '';

const resolveAlunoPorResponsavel = (contato: { nome: string; telefone: string; aluno?: string }, alunos: Aluno[]) => {
  const nomeAluno = contato.aluno?.trim();
  if (nomeAluno) return nomeAluno;

  const telefoneContato = normalizePhone(contato.telefone);
  const alunoPorTelefone = alunos.find((aluno) => normalizePhone(aluno.telefone) === telefoneContato);
  if (alunoPorTelefone) return alunoPorTelefone.nome;

  const nomeResponsavel = normalizeText(contato.nome);
  const alunoPorResponsavel = alunos.find((aluno) => normalizeText(aluno.responsavel) === nomeResponsavel);
  if (alunoPorResponsavel) return alunoPorResponsavel.nome;

  return '';
};

const resolveMensagemComNomeAluno = (mensagem: string, nomeAluno?: string) => {
  const nome = (nomeAluno || 'aluno').trim() || 'aluno';
  return mensagem.replace(/\{NOME_ALUNO\}/gi, nome).replace(/\{NOME\}/gi, nome);
};

const getTurmaIdByName = (turmas: Turma[], nomeTurma?: string) => {
  const turma = turmas.find((item) => item.nome === nomeTurma);
  return turma?.id || '';
};

const createDefaultSchoolContact = (): EscolaContato => ({
  nome: 'Escola - Robótica Kids',
  telefone: '5511999999999',
  turma: 'Robótica Kids',
});

const createDefaultTriggers = (turma?: Turma | null): TriggerMessage[] => {
  const horaInicio = turma?.horaInicio || '09:00';
  const horaFim = turma?.horaFim || '10:30';

  return [
    {
      id: 'inicio',
      titulo: `15 minutos antes da aula (${horaInicio})`,
      minutos: 15,
      texto:
        `Olá! 👋\n\nA equipe da Edukar XP informa que a aula de Robótica Educacional do(a) aluno(a) {NOME_ALUNO} começará em aproximadamente 15 minutos. ⏰\n\nEstamos preparando mais uma aula especial de criatividade, lógica e tecnologia.\n\nAgradecemos sua atenção e esperamos você no horário combinado. 🚀\n\nEdukar XP - Transformando conhecimento em inovação.`,
      ativo: true,
    },
    {
      id: 'presente',
      titulo: '15 minutos após o início da aula (Aluno Presente)',
      minutos: 15,
      texto:
        `Olá! 👋\n\nInformamos que o(a) aluno(a) {NOME_ALUNO} está presente na aula de Robótica Educacional da Edukar XP. ✅\n\nNeste momento, estamos trabalhando com tecnologia, programação, lógica e criatividade em um ambiente de aprendizado dinâmico.\n\nObrigado pela confiança em nosso trabalho.\n\nEdukar XP`,
      ativo: true,
    },
    {
      id: 'ausente',
      titulo: '15 minutos após o início da aula (Aluno Ausente)',
      minutos: 15,
      texto:
        `Olá! 👋\n\nVerificamos que o(a) aluno(a) {NOME_ALUNO} ainda não registrou presença na aula de Robótica Educacional da Edukar XP.\n\nCaso tenha ocorrido algum imprevisto, fique tranquilo(a). Estamos aguardando sua participação nas próximas atividades.\n\nSe precisar de qualquer orientação, fale conosco. Estamos à disposição!`,
      ativo: true,
    },
    {
      id: 'fim',
      titulo: `10 minutos antes do término da aula (${horaFim})`,
      minutos: 10,
      texto:
        `Olá! 👋\n\nA aula de Robótica Educacional do(a) aluno(a) {NOME_ALUNO} será encerrada em aproximadamente 10 minutos. ⏳\n\nCaso seja necessário a retirada, recomendamos que se organize com antecedência para o horário previsto.\n\nAgradecemos pela confiança em nossa equipe e pelo apoio ao aprendizado.`,
      ativo: true,
    },
  ];
};

export const Mensagem: React.FC = () => {
  const { alunos } = useAlunos();
  const { turmas } = useTurmas();

  const turmaRobotica = useMemo(() => {
    return (
      turmas.find(
        (turma) =>
          turma.nome.toLowerCase().includes('robotica') || turma.nome.toLowerCase().includes('robótica')
      ) ?? turmas[0] ?? null
    );
  }, [turmas]);

  const [templates, setTemplates] = useState<MessageTemplate[]>([
    {
      id: 'template-robotica',
      titulo: 'Mensagem automáticade Robótica Kids',
      texto:
        'Olá! Este é um lembrete da turma de Robótica Kids. A aula começa em breve e todas as informações serão enviadas pelo professor responsavel.',
      turmaIds: turmaRobotica ? [turmaRobotica.id] : [],
    },
  ]);

  const lastTriggeredMessageRef = useRef<Record<string, string>>({});
  const [contatoPrincipal, setContatoPrincipal] = useState<EscolaContato>(createDefaultSchoolContact);
  const [triggerMessages, setTriggerMessages] = useState<TriggerMessage[]>(() => createDefaultTriggers(turmaRobotica));
  const [form, setForm] = useState<MessageForm>(EMPTY_FORM);
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>(turmaRobotica ? [turmaRobotica.id] : []);
  const [selectedAlunos, setSelectedAlunos] = useState<string[]>([]);

  useEffect(() => {
    if (turmaRobotica && selectedTurmas.length === 0) {
      setSelectedTurmas([turmaRobotica.id]);
    }
  }, [turmaRobotica, selectedTurmas]);

  useEffect(() => {
    if (turmaRobotica) {
      setTemplates((prev) =>
        prev.map((template) =>
          template.id === 'template-robotica'
            ? { ...template, turmaIds: [turmaRobotica.id] }
            : template
        )
      );

      setTriggerMessages(createDefaultTriggers(turmaRobotica));
    }
  }, [turmaRobotica]);

  useEffect(() => {
    let active = true;

    const loadSavedData = async () => {
      if (!turmaRobotica) return;

      try {
        setIsSyncingDb(true);
        const savedMessages = await mensagensAutomaticaService.getByTurma(turmaRobotica.id);

        if (!active) return;

        if (savedMessages.length > 0) {
          const mapped: TriggerMessage[] = savedMessages.map((item) => ({
            id: (item.tipo as TriggerMessage['id']) || 'inicio',
            titulo: item.titulo,
            minutos: item.minutosAntes,
            texto: item.texto,
            ativo: item.ativo,
          }));

          setTriggerMessages(mapped);
        }
      } catch (error) {
        if (!active) return;
        setTriggerMessages(createDefaultTriggers(turmaRobotica));
      } finally {
        if (active) setIsSyncingDb(false);
      }
    };

    loadSavedData();
    return () => {
      active = false;
    };
  }, [turmaRobotica]);

  const alunosPorTurma = useMemo(() => {
    return turmas.reduce<Record<string, Aluno[]>>((acc, turma) => {
      acc[turma.id] = alunos.filter((aluno) => aluno.turma === turma.nome);
      return acc;
    }, {});
  }, [alunos, turmas]);

  const alunosSelecionados = useMemo(() => {
    const ids = selectedAlunos.length ? selectedAlunos : [];

    if (ids.length > 0) {
      return alunos.filter((aluno) => ids.includes(aluno.id));
    }

    if (selectedTurmas.length === 0) {
      return [];
    }

    return alunos.filter((aluno) => {
      const turmaId = getTurmaIdByName(turmas, aluno.turma);
      return selectedTurmas.includes(turmaId);
    });
  }, [alunos, selectedAlunos, selectedTurmas, turmas]);

  const contatosDaTurma = useMemo(
    () =>
      alunosSelecionados.map((aluno) => ({
        nome: aluno.nome,
        telefone: aluno.telefone,
        aluno: aluno.nome,
      })),
    [alunosSelecionados]
  );

  const handleToggleTurma = (turmaId: string) => {
    setSelectedTurmas((prev) =>
      prev.includes(turmaId)
        ? prev.filter((item) => item !== turmaId)
        : [...prev, turmaId]
    );
  };

  const handleToggleAluno = (alunoId: string) => {
    setSelectedAlunos((prev) =>
      prev.includes(alunoId)
        ? prev.filter((item) => item !== alunoId)
        : [...prev, alunoId]
    );
  };

  const handleSendToRecipients = (
    mensagem: string,
    recipients: Array<{ nome: string; telefone: string; aluno?: string }>
  ) => {
    const validRecipients = recipients.filter((recipient) => normalizePhone(recipient.telefone));

    if (!validRecipients.length) {
      window.alert('Nenhum contato válido para receber a mensagem. Cadastre o telefone do responsável.');
      return;
    }

    validRecipients.forEach((recipient) => {
      const numero = normalizePhone(recipient.telefone);
      const nomeAluno = resolveAlunoPorResponsavel(recipient, alunos) || recipient.aluno || 'aluno';
      const mensagemFinal = resolveMensagemComNomeAluno(mensagem, nomeAluno);
      const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagemFinal)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  };

  const handleSend = (mensagem: string, recipients: Aluno[]) => {
    if (!recipients.length) {
      window.alert('Selecione pelo menos uma turma ou aluno para enviar a mensagem.');
      return;
    }

    recipients.forEach((aluno) => {
      const numero = normalizePhone(aluno.telefone);

      if (!numero) {
        return;
      }

      const mensagemFinal = resolveMensagemComNomeAluno(mensagem, aluno.nome);
      const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagemFinal)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  };

  const handleSaveTemplate = () => {
    if (!form.titulo.trim() || !form.texto.trim()) {
      window.alert('Preencha o título e o texto da mensagem antes de salvar.');
      return;
    }

    if (editingId) {
      setTemplates((prev) =>
        prev.map((template) =>
          template.id === editingId
            ? { ...template, titulo: form.titulo, texto: form.texto, turmaIds: form.turmaIds }
            : template
        )
      );
    } else {
      setTemplates((prev) => [
        {
          id: `template-${Date.now()}`,
          titulo: form.titulo,
          texto: form.texto,
          turmaIds: form.turmaIds,
        },
        ...prev,
      ]);
    }

    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleEditTemplate = (template: MessageTemplate) => {
    setEditingId(template.id);
    setForm({
      titulo: template.titulo,
      texto: template.texto,
      turmaIds: template.turmaIds,
    });
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((template) => template.id !== id));

    if (editingId === id) {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
  };

  const handleSendSelected = () => {
    const recipients = selectedAlunos.length
      ? alunos.filter((aluno) => selectedAlunos.includes(aluno.id))
      : alunos.filter((aluno) => {
          const turmaId = getTurmaIdByName(turmas, aluno.turma);
          return selectedTurmas.includes(turmaId);
        });

    if (!form.texto.trim()) {
      window.alert('Escreva a mensagem antes de enviar para os contatos selecionados.');
      return;
    }

    handleSend(form.texto, recipients);
  };

  const handleSendTemplateMessage = (template: MessageTemplate) => {
    const recipients = template.turmaIds.length
      ? alunos.filter((aluno) => {
          const turmaId = getTurmaIdByName(turmas, aluno.turma);
          return template.turmaIds.includes(turmaId);
        })
      : alunos;

    handleSend(template.texto, recipients);
  };

  const handleSendAutomatic = (trigger: TriggerMessage) => {
    const recipients = (contatosDaTurma.length
      ? contatosDaTurma
      : [{ nome: contatoPrincipal.nome || 'Escola', telefone: contatoPrincipal.telefone, aluno: '' }].filter((item) => item.telefone)
    ).map((contact) => ({
      ...contact,
      aluno: contact.aluno || resolveAlunoPorResponsavel(contact, alunos),
    }));

    handleSendToRecipients(trigger.texto, recipients);
  };

  const saveAutomaticMessages = async () => {
    if (!turmaRobotica) {
      window.alert('Nenhuma turma ativa para salvar mensagens automáticas.');
      return;
    }

    try {
      const existingRows = await mensagensAutomaticaService.getByTurma(turmaRobotica.id);
      const byTipo = new Map(existingRows.map((item) => [item.tipo, item]));

      await Promise.all(
        triggerMessages.map(async (trigger) => {
          const payload = {
            turmaId: turmaRobotica.id,
            titulo: trigger.titulo,
            tipo: trigger.id,
            minutosAntes: trigger.minutos,
            texto: trigger.texto,
            ativo: trigger.ativo,
          };

          const existing = byTipo.get(trigger.id);
          if (existing) {
            await mensagensAutomaticaService.update(existing.id, payload);
            return;
          }

          await mensagensAutomaticaService.create(payload);
        })
      );

      window.alert('Mensagens automáticas salvas com sucesso no banco de dados.');
    } catch (error) {
      console.error('Erro ao salvar mensagens automáticas:', error);
      window.alert('Não foi possível salvar as mensagens automáticas no banco de dados.');
    }
  };

  useEffect(() => {
    if (!turmaRobotica || !triggerMessages.length) return;

    const checkScheduledTriggers = () => {
      const now = new Date();
      const currentDay = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(now).toLowerCase();
      const mappedDay = {
        domingo: 'Domingo',
        segunda: 'Segunda',
        terça: 'Terça',
        terca: 'Terça',
        quarta: 'Quarta',
        quinta: 'Quinta',
        sexta: 'Sexta',
        sabado: 'Sábado',
        sábado: 'Sábado',
      } as Record<string, string>;

      const currentDayName = mappedDay[currentDay] || currentDay;
      const activeDays = turmaRobotica.diasSemana?.length ? turmaRobotica.diasSemana : ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
      if (!activeDays.includes(currentDayName)) return;

      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      triggerMessages.forEach((trigger) => {
        if (!trigger.ativo) return;

        const targetMinutes = (() => {
          if (trigger.id === 'inicio') {
            return (Number(turmaRobotica.horaInicio?.split(':')[0] ?? 0) * 60 + Number(turmaRobotica.horaInicio?.split(':')[1] ?? 0)) - trigger.minutos;
          }

          if (trigger.id === 'fim') {
            return (Number(turmaRobotica.horaFim?.split(':')[0] ?? 0) * 60 + Number(turmaRobotica.horaFim?.split(':')[1] ?? 0)) - trigger.minutos;
          }

          if (trigger.id === 'presente' || trigger.id === 'ausente') {
            return (Number(turmaRobotica.horaInicio?.split(':')[0] ?? 0) * 60 + Number(turmaRobotica.horaInicio?.split(':')[1] ?? 0)) + trigger.minutos;
          }

          return null;
        })();

        if (targetMinutes === null) return;

        const key = `${now.toDateString()}-${trigger.id}`;
        if (Math.abs(nowMinutes - targetMinutes) <= 2 && !lastTriggeredMessageRef.current[key]) {
          lastTriggeredMessageRef.current[key] = 'sent';
          handleSendAutomatic(trigger);
        }
      });
    };

    const interval = window.setInterval(checkScheduledTriggers, 60000);
    checkScheduledTriggers();

    return () => window.clearInterval(interval);
  }, [turmaRobotica, triggerMessages, alunos]);

  return (
    <div style={{ padding: '2rem', display: 'grid', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <Card padding="lg">
          <h3>Turma ativa</h3>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{turmaRobotica?.nome ?? 'Robótica Kids'}</div>
        </Card>

        <Card padding="lg">
          <h3>Mensagens automáticas</h3>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{triggerMessages.filter((item) => item.ativo).length}</div>
        </Card>

        <Card padding="lg">
          <h3>Destinatários</h3>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{alunosSelecionados.length}</div>
          {isSyncingDb && <div style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.8rem' }}>Sincronizando mensagens...</div>}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.5rem' }}>
        <Card padding="lg">
          <h2>Mensagens automáticas da Robótica Kids</h2>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {triggerMessages.map((trigger) => (
              <div
                key={trigger.id}
                style={{
                  border: '1px solid #dfe7f5',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'grid',
                  gap: '0.75rem',
                  background: trigger.ativo ? '#f8fbff' : '#f3f4f6',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <strong>{trigger.titulo}</strong>
                    <div style={{ color: '#6b7280', marginTop: '0.2rem' }}>{trigger.minutos} minutos</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSendAutomatic(trigger)}
                    style={{ border: 'none', borderRadius: '8px', padding: '0.7rem 0.9rem', background: '#25d366', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Enviar
                  </button>
                </div>

                <textarea
                  value={trigger.texto}
                  onChange={(e) =>
                    setTriggerMessages((prev) =>
                      prev.map((item) =>
                        item.id === trigger.id ? { ...item, texto: e.target.value } : item
                      )
                    )
                  }
                  rows={4}
                  style={{ width: '100%', resize: 'vertical', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <h2>Dados da escola</h2>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Contato principal da escola</label>
              <input
                value={contatoPrincipal.nome}
                onChange={(e) => setContatoPrincipal((prev) => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome da escola"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Telefone principal</label>
              <input
                value={contatoPrincipal.telefone}
                onChange={(e) => setContatoPrincipal((prev) => ({ ...prev, telefone: e.target.value }))}
                placeholder="Telefone do WhatsApp (Ex.: 5511999999999)"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Turma / unidade</label>
              <input
                value={contatoPrincipal.turma}
                onChange={(e) => setContatoPrincipal((prev) => ({ ...prev, turma: e.target.value }))}
                placeholder="Robótica Kids"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
            </div>

            <div style={{ padding: '0.75rem', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}>
              As mensagens automáticas serão enviadas para os celulares dos alunos matriculados na turma selecionada.
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.5rem' }}>
        <Card padding="lg">
          <h2>{editingId ? 'Editar mensagem' : 'Nova mensagem de turma'}</h2>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Título</label>
              <input
                value={form.titulo}
                onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ex.: Lembrete da aula"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Turmas selecionadas</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {turmas.length === 0 ? (
                  <span style={{ color: '#6b7280' }}>Nenhuma turma cadastrada</span>
                ) : (
                  turmas.map((turma) => {
                    const checked = form.turmaIds.includes(turma.id);
                    return (
                      <label key={turma.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #d1d5db', borderRadius: '999px', padding: '0.45rem 0.8rem', background: checked ? '#e0f2fe' : '#fff' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setForm((prev) => ({
                              ...prev,
                              turmaIds: prev.turmaIds.includes(turma.id)
                                ? prev.turmaIds.filter((id) => id !== turma.id)
                                : [...prev.turmaIds, turma.id],
                            }))
                          }
                        />
                        <span>{turma.nome}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Mensagem</label>
              <textarea
                value={form.texto}
                onChange={(e) => setForm((prev) => ({ ...prev, texto: e.target.value }))}
                rows={6}
                placeholder="Digite a mensagem da turma Robótica Kids..."
                style={{ width: '100%', resize: 'vertical', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleSaveTemplate}
                style={{ border: 'none', borderRadius: '8px', padding: '0.8rem 1.1rem', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                {editingId ? 'Salvar edição' : 'Salvar mensagem'}
              </button>

              <button
                type="button"
                onClick={saveAutomaticMessages}
                style={{ border: 'none', borderRadius: '8px', padding: '0.8rem 1.1rem', background: '#0f766e', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                Salvar no banco
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(EMPTY_FORM);
                  }}
                  style={{ border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.8rem 1.1rem', background: '#fff', color: '#111827', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <h2>Enviar para turmas e alunos</h2>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Turmas marcadas</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {turmas.length === 0 ? (
                  <span style={{ color: '#6b7280' }}>Nenhuma turma</span>
                ) : (
                  turmas.map((turma) => {
                    const checked = selectedTurmas.includes(turma.id);
                    return (
                      <label key={turma.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '999px', padding: '0.45rem 0.75rem', border: '1px solid #d1d5db', background: checked ? '#dcfce7' : '#fff' }}>
                        <input type="checkbox" checked={checked} onChange={() => handleToggleTurma(turma.id)} />
                        <span>{turma.nome}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Alunos marcados</label>
              <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'grid', gap: '0.5rem' }}>
                {alunos.length === 0 ? (
                  <span style={{ color: '#6b7280' }}>Nenhum aluno cadastrado</span>
                ) : (
                  alunos.map((aluno) => {
                    const checked = selectedAlunos.includes(aluno.id);
                    return (
                      <label key={aluno.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.5rem 0.7rem', background: checked ? '#f3f4f6' : '#fff' }}>
                        <input type="checkbox" checked={checked} onChange={() => handleToggleAluno(aluno.id)} />
                        <span>{aluno.nome}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendSelected}
              style={{ border: 'none', borderRadius: '8px', padding: '0.9rem 1rem', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
            >
              Enviar para selecionados
            </button>

            <div style={{ color: '#374151', fontSize: '0.95rem' }}>
              {alunosSelecionados.length > 0
                ? `${alunosSelecionados.length} responsável(s) selecionado(s) para receber a mensagem.`
                : 'Nenhum responsável selecionado. Marque uma turma ou aluno para enviar.'}
            </div>
          </div>
        </Card>
      </div>

      <Card padding="lg">
        <h2>Mensagens salvas</h2>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {templates.length === 0 ? (
            <div style={{ color: '#6b7280' }}>Nenhuma mensagem salva.</div>
          ) : (
            templates.map((template) => (
              <div key={template.id} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <strong>{template.titulo}</strong>
                    <div style={{ color: '#6b7280', marginTop: '0.25rem' }}>
                      {template.turmaIds.length > 0
                        ? `Turmas: ${template.turmaIds
                            .map((turmaId) => turmas.find((item) => item.id === turmaId)?.nome || 'Turma')
                            .join(', ')}`
                        : 'Para todas as turmas'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => handleEditTemplate(template)} style={{ border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.6rem 0.8rem', background: '#fff', cursor: 'pointer' }}>
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDeleteTemplate(template.id)} style={{ border: '1px solid #fecaca', borderRadius: '8px', padding: '0.6rem 0.8rem', background: '#fff1f2', color: '#991b1b', cursor: 'pointer' }}>
                      Excluir
                    </button>
                    <button type="button" onClick={() => handleSendTemplateMessage(template)} style={{ border: 'none', borderRadius: '8px', padding: '0.6rem 0.8rem', background: '#25d366', color: '#fff', cursor: 'pointer' }}>
                      Enviar
                    </button>
                  </div>
                </div>

                <div style={{ whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.5 }}>{template.texto}</div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
