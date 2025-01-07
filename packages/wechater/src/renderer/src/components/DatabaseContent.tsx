import { FC } from 'react';

interface TableData {
  columns: string[];
  rows: any[][];
}

interface DatabaseData {
  [tableName: string]: TableData;
}

const DatabaseContent: FC<{ data: DatabaseData }> = ({ data }) => {
  return (
    <div className="space-y-6">
      {Object.entries(data).map(([tableName, tableData]) => (
        <div key={tableName} className="border rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 font-bold border-b">
            {tableName}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {tableData.columns.map((column) => (
                    <th
                      key={column}
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableData.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-3 py-2 whitespace-nowrap text-sm text-gray-500"
                      >
                        {String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DatabaseContent;
