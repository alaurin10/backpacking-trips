import { Client, Databases, Storage } from 'appwrite';

const client = new Client();
client
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const databases = new Databases(client);
export const storage = new Storage(client);

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID;
export const TRIPS_ID = import.meta.env.VITE_APPWRITE_TRIPS_COLLECTION_ID;
export const DOCUMENTS_ID = import.meta.env.VITE_APPWRITE_DOCUMENTS_COLLECTION_ID;
export const AVAILABILITY_ID = import.meta.env.VITE_APPWRITE_AVAILABILITY_COLLECTION_ID;
