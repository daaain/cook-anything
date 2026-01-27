import { createRoot } from 'react-dom/client';
import { RecipeFlowApp } from './components/RecipeFlowApp';

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<RecipeFlowApp />);
}
