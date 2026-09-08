import { fetchWithAuth } from '../utils/api.ts';
import type {
  IDirectoryConfig,
  IDirectoryUser,
  IImportUserItem,
  IImportUserResult,
  IEntraIdTestResponse,
} from '../models/directory.model';

async function unwrap<T>(res: Response, action: string): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${action} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const DirectoryService = {
  async getConfig(): Promise<IDirectoryConfig | null> {
    const res = await fetchWithAuth('/directory/config');
    if (res.status === 404) return null;
    return unwrap<IDirectoryConfig>(res, 'getConfig');
  },

  async saveConfig(credentialResourceId: string): Promise<IDirectoryConfig> {
    const res = await fetchWithAuth('/directory/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentialResourceId }),
    });
    return unwrap<IDirectoryConfig>(res, 'saveConfig');
  },

  async testConnection(): Promise<IEntraIdTestResponse> {
    const res = await fetchWithAuth('/directory/config/test', { method: 'POST' });
    return unwrap<IEntraIdTestResponse>(res, 'testConnection');
  },

  async listUsers(top = 50): Promise<IDirectoryUser[]> {
    const res = await fetchWithAuth(`/directory/users?top=${top}`);
    return unwrap<IDirectoryUser[]>(res, 'listUsers');
  },

  async searchUsers(search: string, top = 50): Promise<IDirectoryUser[]> {
    const res = await fetchWithAuth(`/directory/users?search=${encodeURIComponent(search)}&top=${top}`);
    return unwrap<IDirectoryUser[]>(res, 'searchUsers');
  },

  async importUsers(users: IImportUserItem[]): Promise<IImportUserResult[]> {
    const res = await fetchWithAuth('/directory/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users }),
    });
    return unwrap<IImportUserResult[]>(res, 'importUsers');
  },
};
