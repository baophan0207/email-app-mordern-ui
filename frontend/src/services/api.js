import axios from 'axios';

// Assume backend is running on port 8080 by default
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important to send cookies (session)
});

// Map folder names to standard Gmail Label IDs
const folderToLabelIdMap = {
  Inbox: ['INBOX'], // Fetch all emails with the INBOX label
  Starred: ['STARRED'],
  Snoozed: ['SNOOZED'], // Assuming backend supports this
  Sent: ['SENT'],
  Drafts: ['DRAFT'],
  Important: ['IMPORTANT'],
  Spam: ['SPAM'],
  Trash: ['TRASH'],
  // Add mappings for other categories if needed
};

// Function to check authentication status
export const checkAuthStatus = () => {
  return apiClient.get('/api/auth/status');
};

// Function to initiate login (redirects via backend)
// In the frontend, we'll just navigate the browser window
// Updated to open a popup
export const login = () => {
  const width = 600;
  const height = 700;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  const loginUrl = `${API_BASE_URL}/login`;

  console.log(`Opening popup at: left=${left}, top=${top}`);

  window.open(
    loginUrl,
    'GoogleAuthPopup',
    `width=${width},height=${height},top=${top},left=${left}`
  );
};

// Function to logout
export const logout = () => {
  return apiClient.get('/api/logout');
};

// Function to get user profile info
export const getUserProfile = () => {
  return apiClient.get('/api/user/profile');
};

// Function to fetch email list - accepts folder
export const getEmails = (token = null, folder = 'Inbox') => {
  const params = {};
  if (token) {
    params.pageToken = token;
  }
  // Add labelIds based on the selected folder
  const labelIds = folderToLabelIdMap[folder];
  if (labelIds && labelIds.length > 0) {
    // Join multiple labelIds if necessary (e.g., for Inbox)
    params.labelIds = labelIds.join(',');
  }
  // Backend /api/emails needs to handle this labelIds parameter
  return apiClient.get('/api/emails', { params });
};

// Function to fetch details for a single email
export const getEmailDetails = (messageId) => {
  return apiClient.get(`/api/emails/${messageId}`);
};

// Function to modify email labels (e.g., mark as read/unread, star, etc.)
export const modifyEmailLabels = async (messageId, addLabelIds = [], removeLabelIds = []) => {
  try {
    const response = await apiClient.post(`/api/emails/${messageId}/modify`, {
      addLabelIds,
      removeLabelIds,
    });
    console.log(`Labels modified for ${messageId}:`, response.data);
    return response.data; // Or return true/false based on success
  } catch (error) {
    console.error(`Error modifying labels for message ${messageId}:`, error);
    // Handle specific errors (e.g., 401, 404) if needed
    throw error; // Re-throw to allow caller to handle
  }
};

// Specific function to mark an email as read (removes UNREAD label)
export const markEmailAsRead = async (messageId) => {
  return modifyEmailLabels(messageId, [], ['UNREAD']); // Call the generic modify function
};

// Function to mark email as read/unread, archive, trash etc. (using modify endpoint)
// Example: mark as read
export const markAsRead = (messageId) => {
  return apiClient.post(`/api/emails/${messageId}/modify`, { removeLabelIds: ['UNREAD'] });
};

// Example: mark as unread
export const markAsUnread = (messageId) => {
  return apiClient.post(`/api/emails/${messageId}/modify`, { addLabelIds: ['UNREAD'] });
};

// -- Star --
export const starEmail = (messageId) => {
  return apiClient.post(`/api/emails/${messageId}/modify`, { addLabelIds: ['STARRED'] });
};

export const unstarEmail = (messageId) => {
  return apiClient.post(`/api/emails/${messageId}/modify`, { removeLabelIds: ['STARRED'] });
};

// -- Important --
export const markImportant = (messageId) => {
  return apiClient.post(`/api/emails/${messageId}/modify`, { addLabelIds: ['IMPORTANT'] });
};

export const markNotImportant = (messageId) => {
  return apiClient.post(`/api/emails/${messageId}/modify`, { removeLabelIds: ['IMPORTANT'] });
};

// -- Spam --
export const moveToSpam = (messageId) => {
  // Using modify endpoint approach for consistency, backend needs to handle it
  // Ensure appropriate labels like INBOX are removed if necessary by the backend
  return apiClient.post(`/api/emails/${messageId}/modify`, { addLabelIds: ['SPAM'] });
};

// -- Trash -- (moveToTrash exists, added untrash)
export const moveToTrash = (messageId) => {
  return apiClient.post(`/api/emails/${messageId}/trash`);
};

export const untrashEmail = (messageId) => {
  // Using modify endpoint approach for consistency, backend needs to handle it
  return apiClient.post(`/api/emails/${messageId}/modify`, { removeLabelIds: ['TRASH'] });
};

// Function to send an email
export const sendEmail = async (to, subject, body, attachments = []) => {
  try {
    let response;
    if (attachments && attachments.length > 0) {
      // Use FormData for emails with attachments
      const formData = new FormData();
      formData.append('to', to);
      formData.append('subject', subject);
      formData.append('body', body);
      attachments.forEach((file) => {
        formData.append('attachments', file);
      });
      response = await apiClient.post('/api/send', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } else {
      // Send as JSON if no attachments
      response = await apiClient.post('/api/send', { to, subject, body });
    }
    console.log('Email sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending email:', error.response ? error.response.data : error.message);
    throw error;
  }
};

export default apiClient;
