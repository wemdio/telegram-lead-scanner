// Utility function to auto-initialize Google Sheets client from localStorage
export const autoInitializeGoogleSheets = async () => {
  try {
    const googleServiceAccountEmail = localStorage.getItem('googleServiceAccountEmail');
    const googlePrivateKey = localStorage.getItem('googlePrivateKey');
    const googleSpreadsheetId = localStorage.getItem('googleSpreadsheetId');
    
    if (!googleServiceAccountEmail || !googlePrivateKey) {
      console.log('ℹ️ Google Sheets credentials not found in localStorage');
      return { success: false, reason: 'credentials_not_found' };
    }

    console.log('🔧 Auto-initializing Google Sheets from localStorage...');
    
    const { API_ENDPOINTS, apiRequest } = await import('../config/api');
    
    const response = await apiRequest(API_ENDPOINTS.sheets.autoInitialize, {
      method: 'POST',
      body: JSON.stringify({
        googleServiceAccountEmail,
        googlePrivateKey,
        googleSpreadsheetId
      })
    });

    if (response.success) {
      console.log('✅ Google Sheets auto-initialized successfully');
      return { success: true, mock: response.mock || false };
    } else {
      console.warn('⚠️ Failed to auto-initialize Google Sheets:', response.error);
      return { success: false, error: response.error };
    }
  } catch (error) {
    console.error('❌ Auto-initialization error:', error);
    return { success: false, error: error.message };
  }
};