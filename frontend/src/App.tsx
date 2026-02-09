import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="flex gap-8 mb-8">
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="h-24 hover:drop-shadow-lg transition" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="h-24 hover:drop-shadow-lg transition" alt="React logo" />
        </a>
      </div>
      <h1 className="text-4xl font-bold mb-8">Vite + React</h1>
      <div className="border border-gray-300 rounded-lg p-8 mb-8">
        <button 
          onClick={() => setCount((count) => count + 1)}
          className="bg-black hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mb-4"
        >
          count is {count}
        </button>
        <p className="text-gray-700">
          Edit <code className="bg-gray-100 px-2 py-1 rounded">src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="text-sm text-gray-600">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  )
}

export default App
