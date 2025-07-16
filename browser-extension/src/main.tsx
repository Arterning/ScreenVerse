import React from 'react';
import { createRoot } from 'react-dom/client';
import RecordingPage from './recorder/RecordingPage';

const root = createRoot(document.getElementById('root')!);
root.render(<RecordingPage />); 