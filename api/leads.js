import GeminiService from '../backend/services/geminiService.js';
import { google } from 'googleapis';

// Store leads analysis state
let analysisState = {
  isAnalyzing: false,
  progress: 0,
  totalMessages: 0,
  processedMessages: 0,
  foundLeads: 0,
  errors: []
};

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
      case 'GET':
        if (action === 'status') {
          return res.status(200).json({
            status: analysisState,
            timestamp: new Date().toISOString()
          });
        }
        break;

      case 'POST':
        if (action === 'analyze') {
          const { spreadsheetId, sheetsConfig, openrouterApiKey, leadCriteria } = req.body;

  if (!spreadsheetId || !sheetsConfig || !openrouterApiKey || !leadCriteria) {
            return res.status(400).json({ error: 'Missing required parameters for lead analysis' });
          }

          if (analysisState.isAnalyzing) {
            return res.status(400).json({ error: 'Analysis is already in progress' });
          }

          try {
            // Start analysis
            analysisState.isAnalyzing = true;
            analysisState.progress = 0;
            analysisState.processedMessages = 0;
            analysisState.foundLeads = 0;
            analysisState.errors = [];

            // Initialize Gemini service
            const geminiService = new GeminiService(openrouterApiKey);

            // Initialize Google Sheets client
            const auth = new google.auth.JWT(
              sheetsConfig.client_email,
              null,
              sheetsConfig.private_key.replace(/\\n/g, '\n'),
              ['https://www.googleapis.com/auth/spreadsheets']
            );

            await auth.authorize();
            const sheetsClient = google.sheets({ version: 'v4', auth });

            // Get messages from spreadsheet
            const response = await sheetsClient.spreadsheets.values.get({
              spreadsheetId: spreadsheetId,
              range: 'A:Z'
            });

            const rows = response.data.values || [];
            if (rows.length <= 1) {
              analysisState.isAnalyzing = false;
              return res.status(400).json({ error: 'No messages found in spreadsheet' });
            }

            const headers = rows[0];
            const messages = rows.slice(1);
            analysisState.totalMessages = messages.length;

            // Find message and username columns
            const messageColumnIndex = headers.findIndex(h => 
              h && h.toLowerCase().includes('message')
            );
            const usernameColumnIndex = headers.findIndex(h => 
              h && (h.toLowerCase().includes('username') || h.toLowerCase().includes('user'))
            );

            if (messageColumnIndex === -1) {
              analysisState.isAnalyzing = false;
              return res.status(400).json({ error: 'Message column not found in spreadsheet' });
            }

            // Process messages in batches
            const batchSize = 10;
            const leads = [];

            for (let i = 0; i < messages.length; i += batchSize) {
              const batch = messages.slice(i, i + batchSize);
              
              for (const row of batch) {
                try {
                  const messageText = row[messageColumnIndex] || '';
                  const username = row[usernameColumnIndex] || 'Unknown';

                  if (messageText.trim()) {
                    const isLead = await geminiService.analyzeMessage(messageText, leadCriteria);
                    
                    if (isLead) {
                      leads.push({
                        username: username,
                        message: messageText,
                        timestamp: new Date().toISOString(),
                        criteria: leadCriteria
                      });
                      analysisState.foundLeads++;
                    }
                  }

                  analysisState.processedMessages++;
                  analysisState.progress = Math.round((analysisState.processedMessages / analysisState.totalMessages) * 100);
                } catch (error) {
                  // Error analyzing message
                  analysisState.errors.push({
                    message: error.message,
                    timestamp: new Date().toISOString()
                  });
                }
              }

              // Small delay between batches to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Save leads to a new sheet or update existing
            if (leads.length > 0) {
              const leadsHeaders = ['Username', 'Message', 'Timestamp', 'Criteria'];
              const leadsValues = leads.map(lead => [
                lead.username,
                lead.message,
                lead.timestamp,
                lead.criteria
              ]);

              // Try to update 'Leads' sheet or create it
              try {
                await sheetsClient.spreadsheets.values.clear({
                  spreadsheetId: spreadsheetId,
                  range: 'Leads!A:Z'
                });
              } catch (error) {
                // Sheet doesn't exist, create it
                await sheetsClient.spreadsheets.batchUpdate({
                  spreadsheetId: spreadsheetId,
                  resource: {
                    requests: [{
                      addSheet: {
                        properties: {
                          title: 'Leads'
                        }
                      }
                    }]
                  }
                });
              }

              // Add headers and data
              await sheetsClient.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: 'Leads!A1',
                valueInputOption: 'RAW',
                resource: {
                  values: [leadsHeaders, ...leadsValues]
                }
              });
            }

            analysisState.isAnalyzing = false;
            analysisState.progress = 100;

            return res.status(200).json({
              success: true,
              message: 'Lead analysis completed',
              results: {
                totalMessages: analysisState.totalMessages,
                processedMessages: analysisState.processedMessages,
                foundLeads: analysisState.foundLeads,
                leads: leads.slice(0, 10), // Return first 10 leads
                errors: analysisState.errors
              }
            });
          } catch (error) {
            // Lead analysis error occurred
            analysisState.isAnalyzing = false;
            analysisState.errors.push({
              message: error.message,
              timestamp: new Date().toISOString()
            });
            return res.status(500).json({ error: error.message || 'Lead analysis failed' });
          }
        } else if (action === 'stop') {
          analysisState.isAnalyzing = false;
          return res.status(200).json({
            success: true,
            message: 'Lead analysis stopped'
          });
        }
        break;

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

    return res.status(404).json({ error: 'Endpoint not found' });
  } catch (error) {
    // Leads API error occurred
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}