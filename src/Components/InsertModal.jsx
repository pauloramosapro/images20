import { useState, useEffect } from 'react';

const InsertModal = ({ isOpen, onClose, onSave, beeldbank, initialConfig = null }) => {
  const [fixedFields, setFixedFields] = useState([]);
  const [ifStatements, setIfStatements] = useState([]);
  const [error, setError] = useState('');

  // Initialize with existing config if provided
  useEffect(() => {
    if (initialConfig) {
      setFixedFields(initialConfig.fixedFields || []);
      setIfStatements(initialConfig.ifStatements || []);
    } else {
      // Reset to empty state for new config
      setFixedFields([]);
      setIfStatements([]);
    }
    setError('');
  }, [initialConfig, isOpen]);

  const addFixedField = () => {
    setFixedFields([...fixedFields, { field: '', value: '' }]);
  };

  const updateFixedField = (index, field, value) => {
    const updated = [...fixedFields];
    updated[index] = { ...updated[index], [field]: value };
    setFixedFields(updated);
  };

  const removeFixedField = (index) => {
    setFixedFields(fixedFields.filter((_, i) => i !== index));
  };

  const addIfStatement = () => {
    setIfStatements([...ifStatements, { 
      conditionField: '', 
      conditionValue: '', 
      actionField: '', 
      actionValue: '' 
    }]);
  };

  const updateIfStatement = (index, field, value) => {
    const updated = [...ifStatements];
    updated[index] = { ...updated[index], [field]: value };
    setIfStatements(updated);
  };

  const removeIfStatement = (index) => {
    setIfStatements(ifStatements.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // Validation: at least 1 fixed field OR 1 if statement is required
    const validFixedFields = fixedFields.filter(f => f.field && f.value);
    const validIfStatements = ifStatements.filter(i => 
      i.conditionField && i.conditionValue && i.actionField && i.actionValue
    );

    if (validFixedFields.length === 0 && validIfStatements.length === 0) {
      setError('Er moet minimaal 1 vast veld OF 1 IF-statement worden ingevoerd');
      return;
    }

    // Validate field numbers are between 3 and 30
    const allFields = [
      ...validFixedFields.map(f => parseInt(f.field)),
      ...validIfStatements.map(i => parseInt(i.conditionField)),
      ...validIfStatements.map(i => parseInt(i.actionField))
    ];

    const invalidFields = allFields.filter(field => isNaN(field) || field < 3 || field > 30);
    if (invalidFields.length > 0) {
      setError('Veldnummers moeten tussen 3 en 30 liggen');
      return;
    }

    const config = {
      beeldbank,
      fixedFields: validFixedFields,
      ifStatements: validIfStatements,
      active: true
    };

    onSave(config);
    onClose();
  };

  const renderFieldSelect = (value, onChange, placeholder = "Kies veld...") => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border rounded text-sm"
    >
      <option value="">{placeholder}</option>
      {Array.from({ length: 28 }, (_, i) => i + 3).map(num => (
        <option key={num} value={num}>VELD {num}</option>
      ))}
    </select>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            Insert Configuratie - {beeldbank}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700">
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Fixed Fields Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-700">Vaste Velden</h3>
              <button
                type="button"
                onClick={addFixedField}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                + Veld toevoegen
              </button>
            </div>
            
            <div className="space-y-2">
              {fixedFields.map((field, index) => (
                <div key={index} className="flex space-x-2 items-center">
                  {renderFieldSelect(field.field, (value) => updateFixedField(index, 'field', value))}
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => updateFixedField(index, 'value', e.target.value)}
                    placeholder="Waarde"
                    className="flex-1 p-2 border rounded text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeFixedField(index)}
                    className="px-3 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                  >
                    -
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* IF Statements Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-700">IF Statements</h3>
              <button
                type="button"
                onClick={addIfStatement}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                + IF toevoegen
              </button>
            </div>
            
            <div className="space-y-2">
              {ifStatements.map((statement, index) => (
                <div key={index} className="flex space-x-2 items-center">
                  <span className="text-sm font-medium">ALS</span>
                  {renderFieldSelect(
                    statement.conditionField, 
                    (value) => updateIfStatement(index, 'conditionField', value),
                    "Veld..."
                  )}
                  <input
                    type="text"
                    value={statement.conditionValue}
                    onChange={(e) => updateIfStatement(index, 'conditionValue', e.target.value)}
                    placeholder="Waarde"
                    className="w-24 p-2 border rounded text-sm"
                  />
                  <span className="text-sm font-medium">DAN</span>
                  {renderFieldSelect(
                    statement.actionField, 
                    (value) => updateIfStatement(index, 'actionField', value),
                    "Veld..."
                  )}
                  <input
                    type="text"
                    value={statement.actionValue}
                    onChange={(e) => updateIfStatement(index, 'actionValue', e.target.value)}
                    placeholder="Waarde"
                    className="w-24 p-2 border rounded text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeIfStatement(index)}
                    className="px-3 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                  >
                    -
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <p className="text-sm text-gray-600">
              <strong>Let op:</strong> Velden moeten tussen 3 en 30 liggen. 
              Er moet minimaal 1 vast veld OF 1 IF-statement worden geconfigureerd.
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-6 mt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-100"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsertModal;
