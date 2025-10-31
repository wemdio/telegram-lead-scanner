import express from 'express';
import cron from 'node-cron';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import GeminiService from '../backend/services/geminiService.js';

// Helper function to parse scan interval from string format to hours
function parseScanInterval(scanInterval) {
  if (typeof scanInterval === 'number') {
    return scanInterval;
  }
  
  if (typeof scanInterval === 'string') {
    const match = scanInterval.match(/^(\d+)([hm])$/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];
      
      if (unit === 'h') {
        return value; // hours
      } else if (unit === 'm') {
        return value / 60; // convert minutes to hours
      }
    }
  }
  
  // Default to 1 hour if parsing fails
  // Could not parse scanInterval, defaulting to 1 hour
  return 1;
}

// Helper function to format time in Moscow timezone in human-readable format
function formatMoscowTime(date) {
  const moscowTime = new Date(date.toLocaleString("en-US", {timeZone: "Europe/Moscow"}));
  
  const day = moscowTime.getDate().toString().padStart(2, '0');
  const month = (moscowTime.getMonth() + 1).toString().padStart(2, '0');
  const year = moscowTime.getFullYear();
  const hours = moscowTime.getHours().toString().padStart(2, '0');
  const minutes = moscowTime.getMinutes().toString().padStart(2, '0');
  const seconds = moscowTime.getSeconds().toString().padStart(2, '0');
  
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds} MSK`;
}

// Store active scan jobs
const activeScanJobs = new Map();
const scanHistory = [];

// Global settings
let globalSettings = {
  sheetsConfig: null,
  spreadsheetId: null,
  openrouterApiKey: null,
  leadCriteria: null
};

// Scanner status
let scannerStatus = {
  isRunning: false,
  lastScan: null,
  nextScan: null,
  totalScans: 0,
  totalMessages: 0,
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
            status: scannerStatus,
            activeScanJobs: activeScanJobs.size,
            timestamp: new Date().toISOString()
          });
        } else if (action === 'history') {
          return res.status(200).json({
            history: scanHistory.slice(-50), // Last 50 scans
            timestamp: new Date().toISOString()
          });
        }
        break;

      case 'POST':
        if (action === 'start') {
          const { selectedChats, telegramConfig, sheetsConfig, spreadsheetId, scanInterval = 1 } = req.body;
          
          if (!selectedChats || selectedChats.length === 0) {
            return res.status(400).json({ error: 'No chats selected for scanning' });
          }

          if (!telegramConfig || !telegramConfig.apiId || !telegramConfig.apiHash) {
            return res.status(400).json({ error: 'Telegram configuration is required' });
          }

          if (!sheetsConfig || !spreadsheetId) {
            return res.status(400).json({ error: 'Google Sheets configuration is required' });
          }

          // Update global settings
          globalSettings.sheetsConfig = sheetsConfig;
          globalSettings.spreadsheetId = spreadsheetId;

          // Start scanning
          scannerStatus.isRunning = true;
          scannerStatus.nextScan = getNextScanTime(parseScanInterval(scanInterval));

          return res.status(200).json({
            message: 'Scanner started successfully',
            status: scannerStatus
          });
        } else if (action === 'stop') {
          scannerStatus.isRunning = false;
          scannerStatus.nextScan = null;
          activeScanJobs.clear();

          return res.status(200).json({
            message: 'Scanner stopped successfully',
            status: scannerStatus
          });
        } else if (action === 'scan') {
          const { selectedChats, telegramConfig, sheetsConfig, spreadsheetId } = req.body;
          
          if (!selectedChats || selectedChats.length === 0) {
            return res.status(400).json({ error: 'No chats selected for scanning' });
          }

          // Perform manual scan
          const scanResult = await performScan({
            selectedChats,
            telegramConfig,
            sheetsConfig,
            spreadsheetId,
            scanInterval: 1,
            isManualScan: true
          });

          return res.status(200).json({
            message: 'Manual scan completed',
            result: scanResult
          });
        }
        break;

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

    return res.status(404).json({ error: 'Endpoint not found' });
  } catch (error) {
    // Scanner API error occurred
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

// Helper functions (simplified versions for serverless)
async function performScan({ selectedChats, telegramConfig, sheetsConfig, spreadsheetId, scanInterval = 1, isManualScan = false }) {
  try {
    scannerStatus.totalScans++;
    scannerStatus.lastScan = new Date().toISOString();
    
    const results = [];
    
    for (const chat of selectedChats) {
      try {
        const messages = await fetchMessagesFromChat(chat.id, scanInterval, isManualScan);
        
        if (messages && messages.length > 0) {
          await appendMessagesToSheet(messages, spreadsheetId);
          scannerStatus.totalMessages += messages.length;
          
          results.push({
            chatId: chat.id,
            chatTitle: chat.title,
            messagesCount: messages.length,
            status: 'success'
          });
        }
      } catch (error) {
        // Error scanning chat
        results.push({
          chatId: chat.id,
          chatTitle: chat.title,
          messagesCount: 0,
          status: 'error',
          error: error.message
        });
      }
    }
    
    // Add to scan history
    scanHistory.push({
      timestamp: new Date().toISOString(),
      type: isManualScan ? 'manual' : 'automatic',
      results: results,
      totalMessages: results.reduce((sum, r) => sum + r.messagesCount, 0)
    });
    
    return results;
  } catch (error) {
    // Scan error occurred
    scannerStatus.errors.push({
      timestamp: new Date().toISOString(),
      error: error.message
    });
    throw error;
  }
}

// Mock function for messages (replace with real implementation)
async function fetchMessagesFromChat(chatId, scanInterval = 1, isManualScan = false) {
  // This is a simplified mock - in production, implement real Telegram API calls
  return [];
}

// Mock function for sheets (replace with real implementation)
async function appendMessagesToSheet(messages, spreadsheetId) {
  // This is a simplified mock - in production, implement real Google Sheets API calls
  return true;
}

function getNextScanTime(intervalHours) {
  const nextScan = new Date();
  nextScan.setHours(nextScan.getHours() + intervalHours);
  return nextScan.toISOString();
}