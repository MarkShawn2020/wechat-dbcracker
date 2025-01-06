import { FC, useEffect, useState } from 'react';
import DatabaseTable from '../components/DatabaseTable';
import { DatabaseConfig, loadDatabaseConfig } from '../utils/database';

const DatabasePage: FC = () => {
  const [dbConfig, setDbConfig] = useState<DatabaseConfig | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadDatabaseConfig()
      .then(setDbConfig)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load database config'));
  }, []);

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <h2 className="text-lg font-bold">Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!dbConfig) {
    return (
      <div className="p-4">
        <div className="animate-pulse">Loading database information...</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">WeChat Databases</h1>
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Version: {dbConfig.metadata.version} | 
          Generated: {new Date(dbConfig.metadata.generated_at).toLocaleString()}
        </p>
      </div>
      <DatabaseTable databases={dbConfig.databases} />
    </div>
  );
};

export default DatabasePage;
