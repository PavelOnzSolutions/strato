import config from '../config';
import { IUserConfiguration } from '../models/user-configuration.model';

class ConfigurationService {
  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  async getConfiguration(username: string): Promise<IUserConfiguration> {
    const response = await fetch(`${config.apiBaseUrl}/user-accounts/${username}/configuration`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch configuration for ${username}`);
    }
    return response.json();
  }

  async updateConfiguration(username: string, configuration: IUserConfiguration): Promise<IUserConfiguration> {
    const response = await fetch(`${config.apiBaseUrl}/user-accounts/${username}/configuration`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(configuration),
    });
    if (!response.ok) {
      throw new Error(`Failed to update configuration for ${username}`);
    }
    return response.json();
  }
}

export default new ConfigurationService();
