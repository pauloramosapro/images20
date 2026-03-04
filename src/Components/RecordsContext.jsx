// src/context/RecordsContext.js
import { createContext, useContext, useState } from 'react';

const RecordsContext = createContext();

export const RecordsProvider = ({ children }) => {
  const [records, setRecords] = useState([]);
  // Debug log
  // console.log('RecordsProvider - current records:', records);
  
  return (
    <RecordsContext.Provider value={{ records, setRecords }}>
      {children}
    </RecordsContext.Provider>
  );
};

export const useRecords = () => {
  const context = useContext(RecordsContext);
  if (!context) {
    throw new Error('useRecords moet binnen een RecordsProvider gebruikt worden');
  }
  return context;
};
export default RecordsContext;