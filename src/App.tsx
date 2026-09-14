import { HashRouter, Routes, Route } from 'react-router-dom'
import { GameDataProvider } from './state/GameDataContext'
import { CollectionProvider } from './state/CollectionContext'
import { CollectionPage } from './routes/CollectionPage'
import { BuildDetailPage } from './routes/BuildDetailPage'
import { UndoRedoControls } from './components/shared/UndoRedoControls'

function App() {
  return (
    <GameDataProvider>
      <CollectionProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<CollectionPage />} />
            <Route path="/build/:buildId" element={<BuildDetailPage />} />
          </Routes>
        </HashRouter>
        <UndoRedoControls />
      </CollectionProvider>
    </GameDataProvider>
  )
}

export default App
