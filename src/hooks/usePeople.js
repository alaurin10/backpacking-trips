import { useState, useEffect } from 'react';
import { ID, Query } from 'appwrite';
import { databases, DATABASE_ID, PEOPLE_ID } from '../lib/appwrite';

export function usePeople() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!PEOPLE_ID) {
      setLoading(false);
      return;
    }
    databases
      .listDocuments(DATABASE_ID, PEOPLE_ID, [Query.orderAsc('name'), Query.limit(200)])
      .then((res) => setPeople(res.documents))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function addPerson(name) {
    if (!PEOPLE_ID) throw new Error('People collection not configured.');
    const doc = await databases.createDocument(DATABASE_ID, PEOPLE_ID, ID.unique(), { name });
    setPeople((prev) => [...prev, doc].sort((a, b) => a.name.localeCompare(b.name)));
    return doc;
  }

  return { people, loading, error, addPerson };
}
