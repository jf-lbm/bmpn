import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import './styles/index.css';
import './styles/bpmn-overrides.css';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined;

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

// No React.StrictMode: its double-invoked effects double-mount the bpmn-js canvas.
root.render(
  publishableKey ? (
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
      <App />
    </ClerkProvider>
  ) : (
    <div className="flex h-screen items-center justify-center p-6 text-center text-slate-600">
      <div className="max-w-md rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        Missing <code>VITE_CLERK_PUBLISHABLE_KEY</code>. Copy{' '}
        <code>.env.example</code> to <code>.env.local</code> and set your Clerk
        publishable key.
      </div>
    </div>
  ),
);
