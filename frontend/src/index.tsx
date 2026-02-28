import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import store from '@/store'
import App from '@/App'
import { AuthProvider } from '@/auth/AuthContext'
import { I18nProvider } from '@/i18n/I18nContext'
import { getLogger } from '@/services/logging/logger'
import './index.css'

const logger = getLogger()
logger.info('Application bootstrap')

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <I18nProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </I18nProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
)
