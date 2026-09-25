import React, { useState } from 'react';
import { Button } from '../common';
import { FiPlus } from 'react-icons/fi';
import { FrequenciaHistorico } from './FrequenciaHistorico';
import './Frequencia.css';

export const Frequencia: React.FC = () => {
  const [newOpen, setNewOpen] = useState(false);
  return <div className="frequencia-container">
    <div className="frequencia-header">
      <div><span className="frequencia-eyebrow">REGISTRO DE AULA</span><h1>Controle de Frequência</h1><p>Registrar presença e conteúdo das aulas</p></div>
      <Button icon={<FiPlus size={20} />} onClick={() => setNewOpen(true)}>Nova Frequência</Button>
    </div>
    <FrequenciaHistorico newOpen={newOpen} onCloseNew={() => setNewOpen(false)} />
  </div>;
};
