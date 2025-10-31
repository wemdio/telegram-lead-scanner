import { Lead } from '../types';
import { API_BASE_URL } from '../src/config/api';

// This function will handle the API call to your new backend.
// The backend will be responsible for processing the files and calling the Gemini API.
export const scanForLeads = async (leadProfile: string, files: File[]): Promise<Lead[]> => {
  const formData = new FormData();
  formData.append('leadProfile', leadProfile);
  files.forEach(file => {
    formData.append('files', file);
  });

  // Use API_BASE_URL from configuration
  const API_ENDPOINT = `${API_BASE_URL}/scan`; 

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      body: formData,
      // Note: Don't set 'Content-Type' header when using FormData with fetch,
      // the browser will automatically set it to 'multipart/form-data' with the correct boundary.
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from server.' }));
      throw new Error(errorData.error || `Server responded with status: ${response.status}`);
    }

    const leads: Lead[] = await response.json();
    return leads;

  } catch (error) {
    console.error('Failed to communicate with the backend:', error);
    if (error instanceof Error) {
        throw new Error(`Failed to get a response from the server. ${error.message}`);
    }
    throw new Error('An unknown network error occurred.');
  }
};
