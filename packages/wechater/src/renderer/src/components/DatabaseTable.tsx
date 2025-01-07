import { FC, useState } from 'react'
import DatabaseContent from './DatabaseContent'

interface DatabaseInfo {
  type: string
  path: string
  key: string
  cipher_compatibility: number
}

const DatabaseTable: FC<{ databases: Record<string, DatabaseInfo[]> }> = ({ databases }) => {
  const [selectedDb, setSelectedDb] = useState<{ path: string; key: string } | null>(null)
  const [dbContent, setDbContent] = useState<any | null>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // Remove duplicates based on path
  const uniqueDatabases = Object.entries(databases).reduce(
    (acc, [type, dbs]) => {
      const uniqueDbs = dbs.filter(
        (db, index, self) => index === self.findIndex((d) => d.path === db.path)
      )
      acc[type] = uniqueDbs
      return acc
    },
    {} as Record<string, DatabaseInfo[]>
  )

  // Get total count of unique databases
  const totalDbs = Object.values(uniqueDatabases).reduce((sum, dbs) => sum + dbs.length, 0)

  const handleDatabaseClick = async (db: DatabaseInfo) => {
    try {
      setSelectedDb({ path: db.path, key: db.key })
      setLoading(true)
      setError('')
      const content = await window.api.openDatabase(db.path, db.key)
      setDbContent(JSON.parse(content))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open database')
      setDbContent(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1 text-left">Type</th>
              <th className="border px-2 py-1 text-left">Count</th>
              <th className="border px-2 py-1 text-left">Files</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(uniqueDatabases).map(([type, dbs]) => (
              <tr key={type} className="hover:bg-gray-50">
                <td className="border px-2 py-1 font-medium">{type}</td>
                <td className="border px-2 py-1 text-center">{dbs.length}</td>
                <td className="border px-2 py-1">
                  {dbs.map((db, index) => (
                    <button
                      key={db.path}
                      onClick={() => handleDatabaseClick(db)}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {db.path.split('/').pop()}
                      {index < dbs.length - 1 && ', '}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-medium">
              <td className="border px-2 py-1">Total</td>
              <td className="border px-2 py-1 text-center">{totalDbs}</td>
              <td className="border px-2 py-1"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="p-4 text-center">
          <div className="animate-pulse">Loading database content...</div>
        </div>
      )}

      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded">
          <h3 className="font-bold">Error</h3>
          <p>{error}</p>
        </div>
      )}

      {dbContent && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">
            Database Content: {selectedDb?.path.split('/').pop()}
          </h2>
          <DatabaseContent data={dbContent} />
        </div>
      )}
    </div>
  )
}

export default DatabaseTable
