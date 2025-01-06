import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Versions from './components/Versions'
import DatabasePage from './pages/DatabasePage'
import electronLogo from './assets/electron.svg'

function App(): JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <BrowserRouter>
      <nav className="p-4 bg-gray-100">
        <ul className="flex space-x-4">
          <li>
            <Link to="/" className="text-blue-600 hover:text-blue-800">Home</Link>
          </li>
          <li>
            <Link to="/databases" className="text-blue-600 hover:text-blue-800">Databases</Link>
          </li>
        </ul>
      </nav>

      <Routes>
        <Route path="/databases" element={<DatabasePage />} />
        <Route path="/" element={
          <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Welcome to WeChat Database Manager</h1>
            <img alt="logo" className="logo" src={electronLogo} />
            <div className="creator">Powered by electron-vite</div>
            <div className="text">
              Build an Electron app with <span className="react">React</span>
              &nbsp;and <span className="ts">TypeScript</span>
            </div>
            <p className="tip">
              Please try pressing <code>F12</code> to open the devTool
            </p>
            <div className="actions">
              <div className="action">
                <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">
                  Documentation
                </a>
              </div>
              <div className="action">
                <a target="_blank" rel="noreferrer" onClick={ipcHandle}>
                  Send IPC
                </a>
              </div>
            </div>
            <Versions></Versions>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
