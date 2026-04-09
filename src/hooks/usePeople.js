import { useState, useEffect } from 'react';
import { ID, Query } from 'appwrite';
import { databases, DATABASE_ID, PEOPLE_ID, AVAILABILITY_ID, TRIP_INTEREST_ID } from '../lib/appwrite';

async function deleteAllByPerson(collectionId, personName) {
  if (!collectionId) return;
  let offset = 0;
  while (true) {
    const res = await databases.listDocuments(DATABASE_ID, collectionId, [
      Query.equal('personName', personName),
      Query.limit(100),
      Query.offset(offset),
    ]);
    if (res.documents.length === 0) break;
    await Promise.all(
      res.documents.map((doc) => databases.deleteDocument(DATABASE_ID, collectionId, doc.$id))
    );
    if (res.documents.length < 100) break;
  }
}

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

  async function removePerson(id) {
    if (!PEOPLE_ID) throw new Error('People collection not configured.');
    const person = people.find((p) => p.$id === id);
    await databases.deleteDocument(DATABASE_ID, PEOPLE_ID, id);
    if (person) {
      await Promise.all([
        deleteAllByPerson(AVAILABILITY_ID, person.name),
        deleteAllByPerson(TRIP_INTEREST_ID, person.name),
      ]);
    }
    setPeople((prev) => prev.filter((p) => p.$id !== id));
  }

  return { people, loading, error, addPerson, removePerson };
}
