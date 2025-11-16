import axios from 'axios';

// API base URL - use environment variable or default to localhost:8000
// CORS is configured on the backend to allow requests from localhost:3000
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout for LLM responses
  withCredentials: false, // Set to false when using allow_origins with specific domains
});

// Test backend connection
export const testConnection = async () => {
  try {
    console.log('Testing connection to:', API_BASE_URL);
    const response = await api.get('/health');
    console.log('Connection successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Connection test failed:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      request: error.request
    });
    if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
      throw new Error('Cannot connect to backend server. Please ensure it is running on http://localhost:8000');
    } else if (error.response) {
      throw new Error(`Backend responded with error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else {
      throw new Error(`Connection failed: ${error.message}`);
    }
  }
};

export const sendMessage = async (message, sessionId = null) => {
  try {
    // Validate message
    if (!message || typeof message !== 'string') {
      throw new Error('Message must be a non-empty string');
    }
    
    const messageTrimmed = message.trim();
    if (messageTrimmed.length === 0) {
      throw new Error('Message cannot be empty');
    }
    
    console.log('Sending message to:', `${API_BASE_URL}/chat`);
    console.log('Message content:', messageTrimmed);
    console.log('Message type:', typeof messageTrimmed);
    console.log('Session ID:', sessionId);
    
    const requestBody = {
      message: messageTrimmed,
    };
    
    // Only include session_id if it's not null/undefined
    if (sessionId) {
      requestBody.session_id = sessionId;
    }
    
    console.log('Request body:', JSON.stringify(requestBody));
    
    const response = await api.post('/chat', requestBody);
    console.log('Message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      request: error.request
    });
    
    if (error.response) {
      // Server responded with error status
      let detail = 'Failed to send message';
      if (error.response.data) {
        if (typeof error.response.data === 'string') {
          detail = error.response.data;
        } else if (error.response.data.detail) {
          const detailValue = error.response.data.detail;
          if (Array.isArray(detailValue)) {
            detail = detailValue.map(d => {
              if (typeof d === 'string') return d;
              if (d?.msg) return d.msg;
              return JSON.stringify(d);
            }).join(', ');
          } else if (typeof detailValue === 'string') {
            detail = detailValue;
          } else {
            detail = JSON.stringify(detailValue);
          }
        } else if (error.response.data.message) {
          const msg = error.response.data.message;
          detail = typeof msg === 'string' ? msg : JSON.stringify(msg);
        } else {
          detail = JSON.stringify(error.response.data);
        }
      }
      // Ensure detail is always a string
      detail = typeof detail === 'string' ? detail : JSON.stringify(detail);
      throw new Error(detail);
    } else if (error.request) {
      // Request made but no response received - likely CORS or network issue
      console.error('Request was made but no response received. This could be a CORS issue.');
      console.error('Request details:', {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        fullURL: `${error.config?.baseURL}${error.config?.url}`
      });
      throw new Error('Unable to connect to the server. This might be a CORS issue. Please check: 1) Backend is running on http://localhost:8000, 2) CORS is properly configured, 3) Check browser console Network tab for blocked requests.');
    } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error') || error.message?.includes('ERR_CONNECTION_REFUSED')) {
      throw new Error('Cannot connect to backend server. Please ensure it is running on http://localhost:8000');
    } else {
      // Error setting up request
      const errorMsg = error.message || String(error);
      throw new Error('An unexpected error occurred: ' + errorMsg);
    }
  }
};

