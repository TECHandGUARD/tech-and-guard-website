import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StoreAdmin } from '../../../src/StoreAdmin';
import '../../../src/styles.css';

document.title = 'Tech & GUARD Admin';
createRoot(document.getElementById('admin-root')!).render(
  <StrictMode>
    <StoreAdmin />
  </StrictMode>,
);
