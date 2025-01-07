import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { Versions } from './components/Versions'
import DatabasePage from './pages/DatabasePage'

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <div className="container">
        <nav>
          <Link to="/">Home</Link>
          <Link to="/database">Database</Link>
        </nav>
        <Routes>
          <Route path="/" element={<div>Welcome to Wechater</div>} />
          <Route path="/database" element={<DatabasePage />} />
        </Routes>
        <Versions />
      </div>
    </BrowserRouter>
  )
}

export default App
