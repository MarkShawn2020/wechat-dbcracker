import { FC } from 'react';

interface DatabaseInfo {
  type: string;
  path: string;
  cipher_compatibility: number;
}

const DatabaseTable: FC<{ databases: Record<string, DatabaseInfo[]> }> = ({ databases }) => {
  // Remove duplicates based on path
  const uniqueDatabases = Object.entries(databases).reduce((acc, [type, dbs]) => {
    const uniqueDbs = dbs.filter((db, index, self) => 
      index === self.findIndex(d => d.path === db.path)
    );
    acc[type] = uniqueDbs;
    return acc;
  }, {} as Record<string, DatabaseInfo[]>);

  // Get total count of unique databases
  const totalDbs = Object.values(uniqueDatabases).reduce((sum, dbs) => sum + dbs.length, 0);

  return (
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
                {dbs.map(db => db.path.split('/').pop()).join(', ')}
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
  );
};

export default DatabaseTable;
