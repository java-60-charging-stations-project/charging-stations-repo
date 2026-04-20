import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import './index.css';
import router from './router/router.tsx';
import { Provider } from "react-redux";
import { store } from "./store/store";
import { ToastContainer } from 'react-toastify';
import { config } from "./config/env";


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
      <ToastContainer
        autoClose={config.toasterAutoCloseMs}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        theme="light"
      />
    </Provider>
  </StrictMode>,
);
