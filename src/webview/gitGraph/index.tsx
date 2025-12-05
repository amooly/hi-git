import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { GitGraph } from './GitGraph';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<GitGraph />);
