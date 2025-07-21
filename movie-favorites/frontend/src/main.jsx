import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {BroswerRouter} from "react-router-dom"
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BroswerRouter>
      {" "}
      <App />
    </BroswerRouter>
  </StrictMode>
)
