import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import './styles/bpmn-overrides.css';

// No React.StrictMode: its double-invoked effects double-mount the bpmn-js canvas.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />);
