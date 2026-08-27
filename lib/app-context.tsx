import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppData, storage, Session, PrivateStudent, Institute, InstituteStudent, AppSettings, DEFAULT_SETTINGS, DailyTrackingRecord, generateId, getTodayDate, isThisMonth, getCurrentMonthTag, paidInCurrentMonth, computeTodaySessionsToGenerate } from './storage';

interface AppContextType {
  data: AppData;
  isLoading: boolean;
  isAuthenticated: boolean;
  addPrivateStudent: (student: Omit<PrivateStudent, 'id'>) => string;
  updatePrivateStudent: (id: string, student: Partial<PrivateStudent>) => void;
  deletePrivateStudent: (id: string) => void;
  addInstitute: (institute: Omit<Institute, 'id' | 'students'>) => string;
  updateInstitute: (id: string, institute: Partial<Institute>) => void;
  deleteInstitute: (id: string) => void;
  addInstituteStudent: (instituteId: string, student: Omit<InstituteStudent, 'id'>) => void;
  updateInstituteStudent: (instituteId: string, studentId: string, student: Partial<InstituteStudent>) => void;
  deleteInstituteStudent: (instituteId: string, studentId: string) => void;
  addSession: (session: Omit<Session, 'id'>) => Session;
  updateSession: (id: string, session: Partial<Session>) => void;
  deleteSession: (id: string) => void;
  setAuthenticated: (value: boolean) => void;
  saveData: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => void;
  replaceAllData: (data: AppData) => void;
  deleteAllData: () => void;
  recordPayment: (type: 'private' | 'institute', studentId: string, amount: number) => void;
  generateTodaySessions: () => number;
  renewPrivateStudent: (studentId: string) => void;
  addHomeworkRecord: (
    type: 'private' | 'institute',
    studentId: string,
    record: { date: string; status: 'written' | 'not_done' | 'late'; details?: string }
  ) => void;
  updateDailyTracking: (
    type: 'private' | 'institute',
    studentId: string,
    date: string,
    patch: Partial<Pick<DailyTrackingRecord, 'recitation' | 'exams' | 'interaction'>>
  ) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

type AppAction = 
  | { type: 'SET_DATA'; payload: AppData }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_PRIVATE_STUDENT'; payload: PrivateStudent }
  | { type: 'UPDATE_PRIVATE_STUDENT'; id: string; payload: Partial<PrivateStudent> }
  | { type: 'DELETE_PRIVATE_STUDENT'; id: string }
  | { type: 'ADD_INSTITUTE'; payload: Institute }
  | { type: 'UPDATE_INSTITUTE'; id: string; payload: Partial<Institute> }
  | { type: 'DELETE_INSTITUTE'; id: string }
  | { type: 'ADD_INSTITUTE_STUDENT'; instituteId: string; payload: InstituteStudent }
  | { type: 'UPDATE_INSTITUTE_STUDENT'; instituteId: string; studentId: string; payload: Partial<InstituteStudent> }
  | { type: 'DELETE_INSTITUTE_STUDENT'; instituteId: string; studentId: string }
  | { type: 'ADD_SESSION'; payload: Session }
  | { type: 'UPDATE_SESSION'; id: string; payload: Partial<Session> }
  | { type: 'DELETE_SESSION'; id: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> };

function appReducer(state: AppData, action: AppAction): AppData {
  switch (action.type) {
    case 'SET_DATA':
      return { ...action.payload, settings: { ...DEFAULT_SETTINGS, ...action.payload.settings } };
    
    case 'ADD_PRIVATE_STUDENT':
      return {
        ...state,
        privateStudents: [...state.privateStudents, action.payload],
      };
    
    case 'UPDATE_PRIVATE_STUDENT':
      return {
        ...state,
        privateStudents: state.privateStudents.map(s =>
          s.id === action.id ? { ...s, ...action.payload } : s
        ),
      };
    
    case 'DELETE_PRIVATE_STUDENT':
      return {
        ...state,
        privateStudents: state.privateStudents.filter(s => s.id !== action.id),
        sessions: state.sessions.filter(s => s.studentId !== action.id),
      };
    
    case 'ADD_INSTITUTE':
      return {
        ...state,
        institutes: [...state.institutes, action.payload],
      };
    
    case 'UPDATE_INSTITUTE':
      return {
        ...state,
        institutes: state.institutes.map(i =>
          i.id === action.id ? { ...i, ...action.payload } : i
        ),
      };
    
    case 'DELETE_INSTITUTE':
      return {
        ...state,
        institutes: state.institutes.filter(i => i.id !== action.id),
        sessions: state.sessions.filter(s => s.instituteId !== action.id),
      };
    
    case 'ADD_INSTITUTE_STUDENT': {
      const institute = state.institutes.find(i => i.id === action.instituteId);
      if (!institute) return state;
      return {
        ...state,
        institutes: state.institutes.map(i =>
          i.id === action.instituteId
            ? { ...i, students: [...i.students, action.payload] }
            : i
        ),
      };
    }
    
    case 'UPDATE_INSTITUTE_STUDENT': {
      return {
        ...state,
        institutes: state.institutes.map(i =>
          i.id === action.instituteId
            ? {
                ...i,
                students: i.students.map(s =>
                  s.id === action.studentId ? { ...s, ...action.payload } : s
                ),
              }
            : i
        ),
      };
    }

    case 'DELETE_INSTITUTE_STUDENT': {
      return {
        ...state,
        institutes: state.institutes.map(i =>
          i.id === action.instituteId
            ? { ...i, students: i.students.filter(s => s.id !== action.studentId) }
            : i
        ),
        // Also remove any sessions that were tied to this specific student, so they
        // don't linger as orphaned records pointing at a student that no longer exists
        // (group-level sessions on the institute, with no studentId, are untouched).
        sessions: state.sessions.filter(
          s => !(s.type === 'institute' && s.instituteId === action.instituteId && s.studentId === action.studentId)
        ),
      };
    }
    
    case 'ADD_SESSION':
      return {
        ...state,
        sessions: [...state.sessions, action.payload],
      };
    
    case 'UPDATE_SESSION':
      return {
        ...state,
        sessions: state.sessions.map(s =>
          s.id === action.id ? { ...s, ...action.payload } : s
        ),
      };
    
    case 'DELETE_SESSION':
      return {
        ...state,
        sessions: state.sessions.filter(s => s.id !== action.id),
      };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...DEFAULT_SETTINGS, ...state.settings, ...action.payload },
      };

    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(appReducer, { privateStudents: [], institutes: [], sessions: [], settings: { ...DEFAULT_SETTINGS } });
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Centralized autosave: fires every time `data` actually changes, and always
  // persists the latest state (avoids stale-closure bugs from calling
  // storage.saveData() manually right after a dispatch).
  useEffect(() => {
    if (!isLoading) {
      storage.saveData(data);
    }
  }, [data, isLoading]);

  const loadData = async () => {
    setIsLoading(true);
    const loadedData = await storage.getData();
    dispatch({ type: 'SET_DATA', payload: loadedData });
    setIsLoading(false);
  };

  // Kept for backwards compatibility with existing call sites (modals await
  // this after dispatching). The real persistence now happens in the
  // useEffect above, so this is a harmless no-op safeguard.
  const saveData = async () => {
    await storage.saveData(data);
  };

  const value: AppContextType = {
    data,
    isLoading,
    isAuthenticated,
    
    addPrivateStudent: (student) => {
      const newStudent: PrivateStudent = { ...student, id: generateId() };
      dispatch({ type: 'ADD_PRIVATE_STUDENT', payload: newStudent });
      return newStudent.id;
    },
    
    updatePrivateStudent: (id, student) => {
      dispatch({ type: 'UPDATE_PRIVATE_STUDENT', id, payload: student });
    },
    
    deletePrivateStudent: (id) => {
      dispatch({ type: 'DELETE_PRIVATE_STUDENT', id });
    },
    
    addInstitute: (institute) => {
      const newInstitute: Institute = { ...institute, id: generateId(), students: [] };
      dispatch({ type: 'ADD_INSTITUTE', payload: newInstitute });
      return newInstitute.id;
    },
    
    updateInstitute: (id, institute) => {
      dispatch({ type: 'UPDATE_INSTITUTE', id, payload: institute });
    },
    
    deleteInstitute: (id) => {
      dispatch({ type: 'DELETE_INSTITUTE', id });
    },
    
    addInstituteStudent: (instituteId, student) => {
      const newStudent: InstituteStudent = { ...student, id: generateId() };
      dispatch({ type: 'ADD_INSTITUTE_STUDENT', instituteId, payload: newStudent });
    },
    
    updateInstituteStudent: (instituteId, studentId, student) => {
      dispatch({ type: 'UPDATE_INSTITUTE_STUDENT', instituteId, studentId, payload: student });
    },

    deleteInstituteStudent: (instituteId, studentId) => {
      dispatch({ type: 'DELETE_INSTITUTE_STUDENT', instituteId, studentId });
    },
    
    addSession: (session) => {
      const newSession: Session = { ...session, id: generateId() };
      dispatch({ type: 'ADD_SESSION', payload: newSession });
      return newSession;
    },
    
    updateSession: (id, session) => {
      dispatch({ type: 'UPDATE_SESSION', id, payload: session });
    },
    
    deleteSession: (id) => {
      dispatch({ type: 'DELETE_SESSION', id });
    },
    
    updateSettings: (settings) => {
      dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
    },
    
    replaceAllData: (newData) => {
      dispatch({ type: 'SET_DATA', payload: newData });
    },
    
    deleteAllData: () => {
      dispatch({
        type: 'SET_DATA',
        payload: { privateStudents: [], institutes: [], sessions: [], settings: data.settings },
      });
    },
    
    recordPayment: (type, studentId, amount) => {
      const monthTag = getCurrentMonthTag();
      if (type === 'private') {
        const student = data.privateStudents.find(s => s.id === studentId);
        if (!student) return;
        dispatch({
          type: 'UPDATE_PRIVATE_STUDENT',
          id: studentId,
          payload: { paidThisMonth: paidInCurrentMonth(student) + amount, paidMonthTag: monthTag },
        });
      } else {
        for (const inst of data.institutes) {
          const student = inst.students.find(s => s.id === studentId);
          if (student) {
            dispatch({
              type: 'UPDATE_INSTITUTE_STUDENT',
              instituteId: inst.id,
              studentId,
              payload: { paidThisMonth: paidInCurrentMonth(student) + amount, paidMonthTag: monthTag },
            });
            break;
          }
        }
      }
    },
    
    setAuthenticated: (value) => {
      setIsAuthenticated(value);
    },
    
    addHomeworkRecord: (type, studentId, record) => {
      const entry = { ...record, id: generateId() };
      if (type === 'private') {
        const student = data.privateStudents.find(s => s.id === studentId);
        if (!student) return;
        dispatch({
          type: 'UPDATE_PRIVATE_STUDENT',
          id: studentId,
          payload: { homework: [...(student.homework || []), entry] },
        });
      } else {
        for (const inst of data.institutes) {
          const student = inst.students.find(s => s.id === studentId);
          if (student) {
            dispatch({
              type: 'UPDATE_INSTITUTE_STUDENT',
              instituteId: inst.id,
              studentId,
              payload: { homework: [...(student.homework || []), entry] },
            });
            break;
          }
        }
      }
    },
    
    updateDailyTracking: (type, studentId, date, patch) => {
      const upsert = (existing: DailyTrackingRecord[] | undefined): DailyTrackingRecord[] => {
        const list = existing || [];
        const idx = list.findIndex(r => r.date === date);
        if (idx === -1) return [...list, { date, ...patch }];
        const updated = [...list];
        updated[idx] = { ...updated[idx], ...patch };
        return updated;
      };

      if (type === 'private') {
        const student = data.privateStudents.find(s => s.id === studentId);
        if (!student) return;
        dispatch({
          type: 'UPDATE_PRIVATE_STUDENT',
          id: studentId,
          payload: { dailyTracking: upsert(student.dailyTracking) },
        });
      } else {
        for (const inst of data.institutes) {
          const student = inst.students.find(s => s.id === studentId);
          if (student) {
            dispatch({
              type: 'UPDATE_INSTITUTE_STUDENT',
              instituteId: inst.id,
              studentId,
              payload: { dailyTracking: upsert(student.dailyTracking) },
            });
            break;
          }
        }
      }
    },
    
    generateTodaySessions: () => {
      const toCreate = computeTodaySessionsToGenerate(data);
      toCreate.forEach(session => {
        const newSession: Session = { ...session, id: generateId() };
        dispatch({ type: 'ADD_SESSION', payload: newSession });
      });
      return toCreate.length;
    },
    
    renewPrivateStudent: (studentId) => {
      const student = data.privateStudents.find(s => s.id === studentId);
      if (!student) return;
      data.sessions
        .filter(s => s.type === 'private' && s.studentId === studentId && isThisMonth(s.date))
        .forEach(s => {
          dispatch({ type: 'UPDATE_SESSION', id: s.id, payload: { archived: true } });
        });
      dispatch({
        type: 'UPDATE_PRIVATE_STUDENT',
        id: studentId,
        payload: { paidThisMonth: 0, paidMonthTag: getCurrentMonthTag() },
      });
    },
    
    saveData,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
