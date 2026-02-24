import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import stationsReducer from '@/store/slices/stationsSlice';
import sessionsReducer from '@/store/slices/sessionsSlice';
import healthReducer from '@/store/slices/healthSlice';
import adminReducer from '@/store/slices/adminSlice';
import techSupportReducer from '@/store/slices/techSupportSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    stations: stationsReducer,
    sessions: sessionsReducer,
    health: healthReducer,
    admin: adminReducer,
    techSupport: techSupportReducer,
  },
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
