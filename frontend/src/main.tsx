import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import './index.css';
import { getLogger } from '@/services/logging';
import router from './router/router.tsx';
import { Provider } from "react-redux";
import { store } from "./store/store";

const logger = getLogger();
logger.info("Application bootstrap");

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
);
