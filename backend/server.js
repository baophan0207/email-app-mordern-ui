require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const session = require("express-session");
const MemoryStore = require("memorystore")(session);
const cors = require("cors");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const port = process.env.PORT || 8080;

// Middleware for parsing JSON request bodies
app.use(express.json());

// CORS Configuration - Allow requests from frontend
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true, // Allow cookies to be sent
};
app.use(cors(corsOptions));

// Session middleware setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-super-secret-key", // Replace with a strong secret in .env
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 }, // Changed to 1 hour (3600000 ms)
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h (can keep this longer than cookie maxAge)
    }),
  })
);

// Basic route for testing
app.get("/", (req, res) => {
  res.send("Hello from the Email App Backend!");
});

// Placeholder for Google OAuth2 setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID, // You'll add these to your .env file
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI // e.g., http://localhost:3001/oauth2callback
);

// Scopes required for Gmail API access
const scopes = [
  "https://www.googleapis.com/auth/gmail.readonly", // Start with read-only
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify", // Add modify scope (for trash, labels, etc.)
  "https://www.googleapis.com/auth/userinfo.email", // Add scope for email
  "https://www.googleapis.com/auth/userinfo.profile", // Add scope for profile (name, picture)
];

// Middleware to check if user is authenticated AND refresh token if needed
const isAuthenticated = async (req, res, next) => { // Made async
  if (!req.session.tokens) {
    return res.status(401).send("User not authenticated.");
  }

  // Set credentials for potential use or refresh check
  oauth2Client.setCredentials(req.session.tokens);

  // Check if token is expired or close to expiring (e.g., within 5 minutes)
  const expiryDate = req.session.tokens.expiry_date;
  const fiveMinutesInMillis = 5 * 60 * 1000;
  const isTokenExpired = expiryDate ? expiryDate <= (Date.now() + fiveMinutesInMillis) : false;

  if (isTokenExpired) {
    console.log('Access token expired or nearing expiry, attempting refresh...');
    const refreshToken = req.session.tokens.refresh_token;
    if (!refreshToken) {
      console.log('No refresh token found in session.');
      delete req.session.tokens; // Clear invalid session
      return res.status(401).send("Session expired (no refresh token). Please login again.");
    }

    try {
      // Ensure only refresh token is set before refreshing
      oauth2Client.setCredentials({ refresh_token: refreshToken }); 
      const { credentials } = await oauth2Client.refreshAccessToken();
      console.log('Token refreshed successfully.');

      // Update session with new credentials (includes new access_token and potentially new expiry_date)
      // Important: Merge, keeping the original refresh_token if it wasn't returned by refreshAccessToken
      req.session.tokens = { 
        ...req.session.tokens, // Keep original refresh_token if not in credentials
        ...credentials, // Overwrite access_token, expiry_date, etc.
      };
      
      // Set the new credentials for the current request
      oauth2Client.setCredentials(req.session.tokens);
      console.log('Session updated with refreshed tokens.');
      next(); // Proceed with the original request
    } catch (refreshError) {
      console.error('Error refreshing access token:', refreshError.message);
      delete req.session.tokens; // Clear invalid session
      return res.status(401).send("Session expired or invalid. Please login again.");
    }
  } else {
    // Token is valid, proceed
    next();
  }
};

// API Endpoint: Check Authentication Status
app.get("/api/auth/status", (req, res) => {
  if (req.session.tokens) {
    // Optionally: Verify token is still valid or refresh if needed
    // For simplicity, we'll just check existence for now
    res.json({ isAuthenticated: true });
  } else {
    res.json({ isAuthenticated: false });
  }
});

// Route to initiate Google Login
app.get("/login", (req, res) => {
  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: "offline", // Request refresh token
    scope: scopes,
    prompt: "consent", // Ensure user sees consent screen even if already authorized
  });
  res.redirect(authorizeUrl);
});

// Route to handle OAuth2 callback
app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("Authorization code missing.");
  }
  try {
    const { tokens } = await oauth2Client.getToken(code);
    req.session.tokens = tokens; // Store tokens in session

    // Get the frontend origin for postMessage security
    const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:3000";

    // Send HTML to the popup window to communicate back and close
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Authentication Success</title></head>
      <body>
        <p>Authentication successful. Closing this window...</p>
        <script>
          console.log('Sending authSuccess message to opener at origin:', '${frontendOrigin}');
          if (window.opener) {
            // IMPORTANT: Send message to specific frontend origin
            window.opener.postMessage('authSuccess', '${frontendOrigin}');
            console.log('Message sent.');
          } else {
            console.error('window.opener not found!');
          }
          console.log('Closing window.');
          window.close();
        </script>
      </body>
      </html>
    `);

  } catch (error) {
    console.error("Error getting tokens:", error);
    // Optional: Send an error message back to the popup? Or just generic fail.
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Authentication Failed</title></head>
      <body>
        <p>Authentication failed: ${error.message || 'Unknown error'}. Please close this window and try again.</p>
        <script>window.close();</script> // Optionally close on error too
      </body>
      </html>
    `);
  }
});

// API Endpoint: Get User Profile
app.get("/api/user/profile", isAuthenticated, async (req, res) => {
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    res.json({
      email: userInfo.data.email,
      name: userInfo.data.name,
      picture: userInfo.data.picture,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    // Check if the error is due to insufficient scope
    if (error.message && error.message.includes("insufficient scope")) {
      return res
        .status(403)
        .send(
          "Insufficient permissions. Please re-authenticate with required scopes."
        );
    }
    if (error.response && error.response.status === 401) {
      delete req.session.tokens;
      return res
        .status(401)
        .send("Authentication token expired or invalid. Please login again.");
    }
    res.status(500).send("Failed to retrieve user profile.");
  }
});

// API Endpoint: List Emails (Enhanced to accept labelIds and handle SNOOZED)
app.get("/api/emails", isAuthenticated, async (req, res) => {
  const { pageToken, labelIds: labelIdsString } = req.query;
  console.log(
    `Received query parameters: pageToken=${pageToken}, labelIds=${labelIdsString}`
  );

  let requestedLabelIds = labelIdsString
    ? labelIdsString.split(",")
    : ["INBOX"];

  console.log(`Raw requested labels: ${requestedLabelIds.join(", ")}`);

  // --- Handle SNOOZED label ---
  const isSnoozedRequest = requestedLabelIds.includes("SNOOZED");
  let gmailQuery = null; // Initialize query string

  if (isSnoozedRequest) {
    console.log("Detected SNOOZED request. Using query 'in:snoozed'.");
    gmailQuery = "in:snoozed";
    // Remove SNOOZED from labelIds as it's invalid there for listing
    requestedLabelIds = requestedLabelIds.filter(
      (label) => label !== "SNOOZED"
    );
    // If SNOOZED was the *only* requested label, we clear labelIds
    if (requestedLabelIds.length === 0) {
      requestedLabelIds = [];
    }
  }
  // --- End SNOOZED Handling ---

  console.log(`Final labels for API call: ${requestedLabelIds.join(", ")}`);
  console.log(`Gmail query string: ${gmailQuery}`);

  try {
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const listOptions = {
      userId: "me",
      maxResults: 25,
    };

    // Add labelIds if there are any valid ones left
    if (requestedLabelIds.length > 0) {
      listOptions.labelIds = requestedLabelIds;
    }

    // Add the query string if applicable (for snoozed)
    if (gmailQuery) {
      listOptions.q = gmailQuery;
    }

    // Ensure we have *either* labelIds or q, otherwise default to INBOX
    if (!listOptions.labelIds && !listOptions.q) {
      console.log("No specific labels or query, defaulting to INBOX label.");
      listOptions.labelIds = ["INBOX"];
    }

    if (pageToken) {
      listOptions.pageToken = pageToken;
    }

    console.log("Gmail API list options:", listOptions); // Log the final options

    const listResponse = await gmail.users.messages.list(listOptions);

    const messages = listResponse.data.messages || []; // Use messages directly
    const nextPageToken = listResponse.data.nextPageToken;

    if (messages.length === 0) {
      console.log("No messages found for this page/query.");
      return res.json({ emails: [], nextPageToken: null });
    }

    // Fetch details for each message ID
    const emailDetailsPromises = messages.map(async (message) => {
      // Use message.id
      try {
        const msg = await gmail.users.messages.get({
          userId: "me",
          id: message.id, // Use message.id here
          format: "metadata", // Fetch only metadata
          metadataHeaders: ["Subject", "From", "Date"], // Specify needed headers
        });
        // --- Email data extraction (keep your existing logic here) ---
        const headers = msg.data.payload?.headers;
        const subject =
          headers?.find((h) => h.name === "Subject")?.value || "(No Subject)";
        const from =
          headers?.find((h) => h.name === "From")?.value || "Unknown Sender";
        const date = headers?.find((h) => h.name === "Date")?.value;
        const snippet = msg.data.snippet;
        const isUnread = msg.data.labelIds?.includes("UNREAD"); // Check if unread

        return {
          id: msg.data.id,
          threadId: msg.data.threadId,
          subject,
          from, // Keep raw 'From' header
          date: date ? new Date(date).toISOString() : new Date().toISOString(),
          snippet,
          read: !isUnread, // Based on UNREAD label
          labels: msg.data.labelIds || [], // Include labels if needed
        };
        // --- End Email data extraction ---
      } catch (detailError) {
        console.error(
          `Error fetching details for message ${message.id}:`,
          detailError.message
        );
        return null;
      }
    });

    const emails = (await Promise.all(emailDetailsPromises)).filter(
      (email) => email !== null
    );

    res.json({ emails, nextPageToken });
  } catch (error) {
    // Keep existing error handling
    console.error("Error listing emails:", error);
    if (error.response) {
      if (error.response.status === 401) {
        /* ... handler ... */
        delete req.session.tokens; // Clear potentially invalid tokens
        return res
          .status(401)
          .send("Authentication token expired or invalid. Please login again.");
      }
      if (error.response.status === 403) {
        /* ... handler ... */
        // Check if it's an insufficient scope error
        if (
          error.message &&
          (error.message.includes("insufficient scope") ||
            error.message.includes("Insufficient Permission"))
        ) {
          return res
            .status(403)
            .send(
              "Insufficient permissions. Please re-authenticate with required scopes."
            );
        }
        return res.status(403).send("Forbidden: Access denied.");
      }
      // Log the specific Gmail API error if available
      if (error.response.data && error.response.data.error) {
        console.error("Gmail API Error:", error.response.data.error);
      }
    }
    res.status(500).send("Failed to list emails.");
  }
});

// Helper function to find parts by mimeType
const findPartByMimeType = (parts, mimeType) => {
  if (!parts) return null;
  for (const part of parts) {
    if (part.mimeType === mimeType) {
      return part;
    }
    if (part.parts) {
      const found = findPartByMimeType(part.parts, mimeType);
      if (found) return found;
    }
  }
  return null;
};

// Helper function to extract attachments
const extractAttachments = (payload) => {
  const attachments = [];
  const parts = payload.parts || [];

  const findAttachmentsRecursive = (part) => {
    if (part.filename && part.filename.length > 0 && part.body && part.body.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size,
        attachmentId: part.body.attachmentId,
      });
    }
    if (part.parts) {
      part.parts.forEach(findAttachmentsRecursive);
    }
  };

  // Check the main payload body as well, sometimes attachments are not in parts
  if (payload.filename && payload.filename.length > 0 && payload.body && payload.body.attachmentId) {
     attachments.push({
        filename: payload.filename,
        mimeType: payload.mimeType,
        size: payload.body.size,
        attachmentId: payload.body.attachmentId,
      });
  }

  parts.forEach(findAttachmentsRecursive);
  return attachments;
};

// API Endpoint: Get Email Details
app.get("/api/emails/:messageId", isAuthenticated, async (req, res) => {
  const { messageId } = req.params;
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  try {
    const response = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: 'full', // Fetch full message to get parts and attachments
    });

    const message = response.data;
    const payload = message.payload;
    const headers = payload.headers;

    const subjectHeader = headers.find((header) => header.name.toLowerCase() === "subject"); // Case-insensitive
    const fromHeader = headers.find((header) => header.name.toLowerCase() === "from");
    const dateHeader = headers.find((header) => header.name.toLowerCase() === "date");
    const toHeader = headers.find((header) => header.name.toLowerCase() === "to");
    const ccHeader = headers.find((header) => header.name.toLowerCase() === "cc");

    let bodyHtml = "";
    let bodyText = "";

    // Find HTML part
    let htmlPart = findPartByMimeType(payload.parts, 'text/html');
    if (htmlPart && htmlPart.body && htmlPart.body.data) {
      bodyHtml = Buffer.from(htmlPart.body.data, "base64").toString("utf-8");
    } else if (payload.mimeType === 'text/html' && payload.body && payload.body.data) {
       bodyHtml = Buffer.from(payload.body.data, "base64").toString("utf-8");
    }

    // Find Plain Text part (fallback)
    let textPart = findPartByMimeType(payload.parts, 'text/plain');
    if (textPart && textPart.body && textPart.body.data) {
      bodyText = Buffer.from(textPart.body.data, "base64").toString("utf-8");
    } else if (payload.mimeType === 'text/plain' && payload.body && payload.body.data && !bodyHtml) { // Only use if HTML not found
       bodyText = Buffer.from(payload.body.data, "base64").toString("utf-8");
    }

    // Extract attachments
    const attachments = extractAttachments(payload);

    // Prefer HTML body, fallback to text body
    const bodyContent = bodyHtml || bodyText;

    res.json({
      id: message.id,
      snippet: message.snippet,
      labelIds: message.labelIds,
      subject: subjectHeader ? subjectHeader.value : "",
      from: fromHeader ? fromHeader.value : "",
      date: dateHeader ? dateHeader.value : "",
      to: toHeader ? toHeader.value : "", // Include To
      cc: ccHeader ? ccHeader.value : "",   // Include Cc
      body: bodyContent, // Send the decoded body content
      attachments: attachments, // Include attachments array
      threadId: message.threadId, // Include threadId
      // Include other details if needed
    });

  } catch (error) {
    console.error(`Error fetching email details for ${messageId}:`, error.message);
    // Check if the error is due to invalid credentials (401)
    if (error.response && error.response.status === 401) {
      delete req.session.tokens; // Clear session
      return res.status(401).send("Authentication error. Please log in again.");
    }
    // Check if the error is message not found (404)
    if (error.response && error.response.status === 404) {
        return res.status(404).send("Email not found.");
    }
    res.status(500).send("Error fetching email details.");
  }
});

// API Endpoint: Get Email Attachment
app.get("/api/emails/:messageId/attachments/:attachmentId", isAuthenticated, async (req, res) => {
  const { messageId, attachmentId } = req.params;
  // Extract filename and mimetype from query parameters if available (passed by frontend)
  const { filename: queryFilename, mimetype: queryMimetype } = req.query;
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  try {
    // Fetch the raw attachment data
    const response = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId: messageId,
      id: attachmentId,
    });

    const attachmentData = response.data.data;
    if (!attachmentData) {
        console.error(`No attachment data found for message ${messageId}, attachment ${attachmentId}`);
        return res.status(404).send("Attachment data not found.");
    }
    const decodedData = Buffer.from(attachmentData, 'base64');

    let filename = queryFilename || 'attachment'; // Use query filename or default
    let mimeType = queryMimetype || 'application/octet-stream'; // Use query mimetype or default

    // Set headers for file download
    // Encode filename for safety, especially with special characters
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', mimeType);
    res.send(decodedData);

  } catch (error) {
    console.error(`Error fetching attachment ${attachmentId} for message ${messageId}:`, error.message);
    if (error.response) {
      if (error.response.status === 401) {
        delete req.session.tokens;
        return res.status(401).send("Authentication error. Please log in again.");
      }
      if (error.response.status === 404) {
        return res.status(404).send("Attachment or Email not found.");
      }
    }
    res.status(500).send("Error fetching attachment.");
  }
});

// API Endpoint: Modify Email (Labels, Trash, etc.)
app.post("/api/emails/:messageId/modify", isAuthenticated, async (req, res) => {
  const { messageId } = req.params;
  const { addLabelIds, removeLabelIds } = req.body; // e.g., { removeLabelIds: ['UNREAD'] }

  if (!messageId) {
    return res.status(400).send("Message ID is required.");
  }
  if (!addLabelIds && !removeLabelIds) {
    return res
      .status(400)
      .send("Either addLabelIds or removeLabelIds must be provided.");
  }

  try {
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    await gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: {
        addLabelIds: addLabelIds || [], // Ensure it's an array
        removeLabelIds: removeLabelIds || [], // Ensure it's an array
      },
    });
    res
      .status(200)
      .send({ message: `Email ${messageId} modified successfully.` });
  } catch (error) {
    console.error(`Error modifying email ${messageId}:`, error);
    if (error.response && error.response.status === 401) {
      delete req.session.tokens;
      return res
        .status(401)
        .send("Authentication token expired or invalid. Please login again.");
    }
    if (error.response && error.response.status === 404) {
      return res.status(404).send("Email not found.");
    }
    res.status(500).send("Failed to modify email labels.");
  }
});

// API Endpoint: Send Email
app.post("/api/send", isAuthenticated, upload.array('attachments'), async (req, res) => {
  const { to, subject, body } = req.body;
  const attachments = req.files;

  if (!to || !subject || !body) {
    return res.status(400).send("Missing required fields: to, subject, body");
  }

  try {
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    let email;
    if (attachments && attachments.length > 0) {
      // Construct multipart/mixed MIME email with attachments
      const boundary = '----=_Part_' + Date.now();
      let messageParts = [];
      messageParts.push(`To: ${to}`);
      messageParts.push(`Subject: ${subject}`);
      messageParts.push('MIME-Version: 1.0');
      messageParts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      messageParts.push("");
      messageParts.push(`--${boundary}`);
      messageParts.push('Content-Type: text/html; charset="UTF-8"');
      messageParts.push('Content-Transfer-Encoding: 7bit');
      messageParts.push("");
      messageParts.push(body);
      messageParts.push("");

      // Add each attachment
      attachments.forEach(file => {
        messageParts.push(`--${boundary}`);
        messageParts.push(`Content-Type: ${file.mimetype}; name="${file.originalname}"`);
        messageParts.push('Content-Transfer-Encoding: base64');
        messageParts.push(`Content-Disposition: attachment; filename="${file.originalname}"`);
        messageParts.push("");
        messageParts.push(file.buffer.toString('base64'));
        messageParts.push("");
      });
      messageParts.push(`--${boundary}--`);
      email = messageParts.join("\r\n");
    } else {
      // Simple email without attachments
      const emailLines = [];
      emailLines.push(`To: ${to}`);
      emailLines.push(`Subject: ${subject}`);
      emailLines.push("Content-Type: text/html; charset=utf-8");
      emailLines.push("MIME-Version: 1.0");
      emailLines.push("");
      emailLines.push(body);
      email = emailLines.join("\r\n").trim();
    }

    // Base64url encode the email
    const base64EncodedEmail = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: base64EncodedEmail,
      },
    });

    res.status(200).send({ message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    if (error.response && error.response.status === 401) {
      delete req.session.tokens;
      return res
        .status(401)
        .send("Authentication token expired or invalid. Please login again.");
    }
    res.status(500).send("Failed to send email.");
  }
});

// API Endpoint: Delete Email
app.delete("/api/emails/:messageId", isAuthenticated, async (req, res) => {
  const { messageId } = req.params;
  if (!messageId) {
    return res.status(400).send("Message ID is required.");
  }

  try {
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    await gmail.users.messages.trash({
      userId: "me",
      id: messageId,
    });
    res.status(200).send({ message: `Email ${messageId} moved to trash.` });
  } catch (error) {
    console.error(`Error trashing email ${messageId}:`, error);
    if (error.response && error.response.status === 401) {
      delete req.session.tokens;
      return res
        .status(401)
        .send("Authentication token expired or invalid. Please login again.");
    }
    if (error.response && error.response.status === 404) {
      return res.status(404).send("Email not found.");
    }
    res.status(500).send("Failed to move email to trash.");
  }
});

// API Endpoint: Modify Email (e.g., Mark Read/Unread)
app.post("/api/emails/:messageId/modify", isAuthenticated, async (req, res) => {
  const { messageId } = req.params;
  const { addLabelIds, removeLabelIds } = req.body; // e.g., { removeLabelIds: ['UNREAD'] }

  if (!messageId) {
    return res.status(400).send("Message ID is required.");
  }
  if (!addLabelIds && !removeLabelIds) {
    return res
      .status(400)
      .send("Either addLabelIds or removeLabelIds must be provided.");
  }

  try {
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    await gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: {
        addLabelIds: addLabelIds || [], // Ensure it's an array
        removeLabelIds: removeLabelIds || [], // Ensure it's an array
      },
    });
    res
      .status(200)
      .send({ message: `Email ${messageId} modified successfully.` });
  } catch (error) {
    console.error(`Error modifying email ${messageId}:`, error);
    if (error.response && error.response.status === 401) {
      delete req.session.tokens;
      return res
        .status(401)
        .send("Authentication token expired or invalid. Please login again.");
    }
    if (error.response && error.response.status === 404) {
      return res.status(404).send("Email not found.");
    }
    res.status(500).send("Failed to modify email labels.");
  }
});

// API Endpoint: Logout
app.get("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destruction error:", err);
      return res.status(500).send("Could not log out.");
    }
    // Optional: Clear cookie on client-side too, although session destruction on server is key
    res.clearCookie("connect.sid"); // Default cookie name for express-session
    res.status(200).send("Logged out successfully.");
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});
