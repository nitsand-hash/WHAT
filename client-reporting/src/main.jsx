import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './generated/theme-tokens.css';
import App from '@generated/App';

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
