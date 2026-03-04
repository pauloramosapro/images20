import './App.css';
import './nav.css';
import { useState } from 'react';
import FunctieResizer from './tests/Functie_resizer.js';
import Explain from './explain';

function App() {
  const [view, setView] = useState('image'); // 'image' | 'explain'
  const [hovered, setHovered] = useState(null); // 'image' | 'explain' | null
  const selectedTint = '#3a0eeb'; // Randkleur knoppen (actief 2px, inactief 1px)

  return (
    <div className="App">
      <header className="App-header">
        <nav className="top-nav">
          <button
            className="nav-btn"
            onClick={() => setView('image')}
            aria-pressed={view === 'image'}
            onMouseEnter={() => setHovered('image')}
            onMouseLeave={() => setHovered(null)}
          >
            Afbeelding
          </button>
          <button
            className="nav-btn"
            onClick={() => setView('explain')}
            aria-pressed={view === 'explain'}
            onMouseEnter={() => setHovered('explain')}
            onMouseLeave={() => setHovered(null)}
          >
            Uitleg
          </button>
        </nav>
        {/* Spacer om te voorkomen dat content onder de vaste navbar valt */}
        <div />

        <div>
          {view === 'image' ? (
            <div>
              <FunctieResizer />
            </div>
          ) : (
            <div>
              <Explain />
            </div>
          )}
        </div>
      </header>
    </div>
  );
}

export default App;
