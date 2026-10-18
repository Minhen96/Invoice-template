import './lib/zod-config'
import '@fontsource-variable/inter'
import './styles/globals.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/app'
import { convex } from './lib/convex'

const root = document.getElementById('root')
if (!root) throw new Error('#root element missing from index.html')

createRoot(root).render(
  <StrictMode>
    <App client={convex} />
  </StrictMode>,
)
