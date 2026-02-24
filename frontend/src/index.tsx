import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import store from '@/store'
import App from '@/App'
import { AuthProvider } from '@/auth/AuthContext'
import { getLogger } from '@/services/logging/logger'
import './index.css'

const logger = getLogger()
logger.info('Application bootstrap')

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
)
