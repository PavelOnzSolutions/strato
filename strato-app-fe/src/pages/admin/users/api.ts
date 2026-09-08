import {IUpdateUserRequest, IUserAccount} from "../../../models/user-account.model.ts";
import {fetchWithAuth} from "../../../utils/api.ts";

export const fetchUsers = async (): Promise<IUserAccount[]> => {
  const response = await fetchWithAuth('/user-accounts');
  if (!response.ok) {
    throw new Error('Failed to fetch users: ' + response.statusText);
  }
  return response.json();
};

export const deleteUser = async (username: string): Promise<void> => {
  const response = await fetchWithAuth(`/user-accounts/${username}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete user: ' + response.statusText);
  }
};

export const updateUser = async (
  username: string,
  request: IUpdateUserRequest
): Promise<IUserAccount> => {
  const response = await fetchWithAuth(`/user-accounts/${username}`, {
    method: 'PATCH',
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(await response.text() || 'Failed to update user');
  }
  return response.json();
};
