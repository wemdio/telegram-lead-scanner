import { google } from 'googleapis';

// Store Google Sheets clients
let sheetsClient = null;
let currentCredentials = null;

// Main handler function for Vercel
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { method, query } = req;
    const action = query.action || '';
    switch (method) {
      case 'POST':
        if (action === 'initialize') {
          const { credentials } = req.body;
          
          if (!credentials) {
            return res.status(400).json({ error: 'Google Sheets credentials are required' });
          }

          try {
            // Check if using mock credentials
            if (credentials.type === 'mock' || 
                (credentials.client_email && credentials.client_email.includes('mock'))) {
              return res.status(200).json({
                success: true,
                message: 'Mock Google Sheets client initialized',
                mock: true
              });
            }

            // Initialize real Google Sheets client
            const auth = new google.auth.JWT(
              credentials.client_email,
              null,
              credentials.private_key.replace(/\\n/g, '\n'),
              ['https://www.googleapis.com/auth/spreadsheets']
            );

            await auth.authorize();
            sheetsClient = google.sheets({ version: 'v4', auth });
            currentCredentials = credentials;

            return res.status(200).json({
              success: true,
              message: 'Google Sheets client initialized successfully'
            });
          } catch (error) {
            // Google Sheets initialization error
            return res.status(400).json({ error: error.message || 'Failed to initialize Google Sheets' });
          }
        } else if (action === 'create') {
          const { title, headers } = req.body;
          
          if (!title) {
            return res.status(400).json({ error: 'Spreadsheet title is required' });
          }

          try {
            if (!sheetsClient) {
              return res.status(400).json({ error: 'Google Sheets client not initialized' });
            }

            // Create new spreadsheet
            const createResponse = await sheetsClient.spreadsheets.create({
              resource: {
                properties: {
                  title: title
                }
              }
            });

            const spreadsheetId = createResponse.data.spreadsheetId;

            // Add headers if provided
            if (headers && headers.length > 0) {
              await sheetsClient.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: 'A1',
                valueInputOption: 'RAW',
                resource: {
                  values: [headers]
                }
              });
            }

            return res.status(200).json({
              success: true,
              spreadsheetId: spreadsheetId,
              url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
            });
          } catch (error) {
            // Create spreadsheet error
            return res.status(500).json({ error: error.message || 'Failed to create spreadsheet' });
          }
        } else if (action === 'append') {
          const { spreadsheetId, values, range = 'A:Z' } = req.body;
          
          if (!spreadsheetId || !values) {
            return res.status(400).json({ error: 'Spreadsheet ID and values are required' });
          }

          try {
            if (!sheetsClient) {
              return res.status(400).json({ error: 'Google Sheets client not initialized' });
            }

            const response = await sheetsClient.spreadsheets.values.append({
              spreadsheetId: spreadsheetId,
              range: range,
              valueInputOption: 'RAW',
              insertDataOption: 'INSERT_ROWS',
              resource: {
                values: values
              }
            });

            return res.status(200).json({
              success: true,
              updatedRows: response.data.updates.updatedRows,
              updatedRange: response.data.updates.updatedRange
            });
          } catch (error) {
            // Append to spreadsheet error
            return res.status(500).json({ error: error.message || 'Failed to append to spreadsheet' });
          }
        } else if (action === 'clear') {
          const { spreadsheetId, range = 'A2:Z' } = req.body;
          
          if (!spreadsheetId) {
            return res.status(400).json({ error: 'Spreadsheet ID is required' });
          }

          try {
            if (!sheetsClient) {
              return res.status(400).json({ error: 'Google Sheets client not initialized' });
            }

            await sheetsClient.spreadsheets.values.clear({
              spreadsheetId: spreadsheetId,
              range: range
            });

            return res.status(200).json({
              success: true,
              message: 'Spreadsheet cleared successfully'
            });
          } catch (error) {
            // Clear spreadsheet error
            return res.status(500).json({ error: error.message || 'Failed to clear spreadsheet' });
          }
        } else if (action === 'headers') {
          const { spreadsheetId, headers } = req.body;
          
          if (!spreadsheetId || !headers) {
            return res.status(400).json({ error: 'Spreadsheet ID and headers are required' });
          }

          try {
            if (!sheetsClient) {
              return res.status(400).json({ error: 'Google Sheets client not initialized' });
            }

            await sheetsClient.spreadsheets.values.update({
              spreadsheetId: spreadsheetId,
              range: 'A1',
              valueInputOption: 'RAW',
              resource: {
                values: [headers]
              }
            });

            return res.status(200).json({
              success: true,
              message: 'Headers updated successfully'
            });
          } catch (error) {
            // Update headers error
            return res.status(500).json({ error: error.message || 'Failed to update headers' });
          }
        }
        break;

      case 'GET':
        if (action === 'status') {
          return res.status(200).json({
            initialized: !!sheetsClient,
            hasCredentials: !!currentCredentials,
            timestamp: new Date().toISOString()
          });
        }
        break;

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

    return res.status(404).json({ error: 'Endpoint not found' });
  } catch (error) {
    // Sheets API error occurred
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}