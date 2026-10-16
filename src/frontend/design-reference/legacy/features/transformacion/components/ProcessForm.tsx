import React, { useState } from 'react';
import { registrarProcesoLocal } from '../api/procesoDb';

interface ProcessFormProps {
  availableLots: string[];
  onSuccess?: () => void;
}

export function ProcessForm({ availableLots, onSuccess }: ProcessFormProps) {
  const [lotCode, setLotCode] = useState(availableLots[0] || 'CAC128');
  const [stage, setStage] = useState('FERMENTACION');
  const [inputQty, setInputQty] = useState<number>(250);
  const [outputQty, setOutputQty] = useState<number>(200);
  const [responsible] = useState('Operador Campo (Rivera)');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputQty <= 0 || outputQty <= 0) {
      alert('Las cantidades deben ser números mayores a 0 kg.');
      return;
    }

    setLoading(true);
    try {
      await registrarProcesoLocal({
        lotCode,
        stage,
        inputQty,
        outputQty,
        responsible,
        notes,
      });

      if (onSuccess) onSuccess();
      alert('Proceso de transformación registrado con éxito.');
    } catch (err: any) {
      alert(err?.message || 'Error al registrar la transformación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card form-card">
      <div className="card-head">
        <div>
          <span className="eyebrow">RF02 · Transformación</span>
          <h3 className="section-title">Etapas y control de merma</h3>
        </div>
      </div>

      <div className="form-grid">
        <div className="field">
          <label className="field-label">Lote de entrada</label>
          <select className="input" value={lotCode} onChange={(e) => setLotCode(e.target.value)}>
            {availableLots.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label">Etapa del proceso</label>
          <select className="input" value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="FERMENTACION">Fermentación</option>
            <option value="SECADO">Secado en marquesina</option>
            <option value="SELECCION">Selección y empaque</option>
          </select>
        </div>

        <div className="field">
          <label className="field-label">Cantidad de entrada (kg)</label>
          <input
            type="number"
            className="input"
            value={inputQty}
            onChange={(e) => setInputQty(Number(e.target.value))}
          />
        </div>

        <div className="field">
          <label className="field-label">Cantidad de salida (kg)</label>
          <input
            type="number"
            className="input"
            value={outputQty}
            onChange={(e) => setOutputQty(Number(e.target.value))}
          />
        </div>

        <div className="field col-span-full">
          <label className="field-label">Notas de observación</label>
          <textarea
            className="input"
            rows={2}
            placeholder="Anota novedades sobre temperatura, humedad o incidencias..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : 'Registrar proceso'}
        </button>
      </div>
    </form>
  );
}