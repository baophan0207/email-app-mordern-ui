require("dotenv").config();
const express = require("express");
const { google } = require("googleapis");
const session = require("express-session");
const MemoryStore = require("memorystore")(session);
const cors = require("cors");

const app = express();
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
    cookie: { maxAge: 86400000 }, // 24 hours
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
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

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.tokens) {
    // Set credentials for the API client for this request
    oauth2Client.setCredentials(req.session.tokens);
    next(); // User is authenticated, proceed
  } else {
    res.status(401).send("User not authenticated.");
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

    // Redirect back to the frontend callback route
    const frontendCallbackUrl = process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/auth/callback`
      : "http://localhost:3000/auth/callback";
    res.redirect(frontendCallbackUrl);
  } catch (error) {
    console.error("Error getting tokens:", error);
    res.status(500).send("Authentication failed.");
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

// API Endpoint: Get Email Details
app.get("/api/emails/:messageId", isAuthenticated, async (req, res) => {
  const { messageId } = req.params;
  if (!messageId) {
    return res.status(400).send("Message ID is required.");
  }

  try {
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const response = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full", // Fetch full email content
    });

    // Basic parsing to find the body (can be complex due to multipart messages)
    // This is a simplified example; robust parsing might need a library
    let body = "";
    const payload = response.data.payload;

    if (payload.parts) {
      // Handle multipart messages (common)
      const part =
        payload.parts.find((p) => p.mimeType === "text/html") ||
        payload.parts.find((p) => p.mimeType === "text/plain");
      if (part && part.body && part.body.data) {
        body = Buffer.from(part.body.data, "base64").toString("utf-8");
      }
    } else if (payload.body && payload.body.data) {
      // Handle single part messages
      body = Buffer.from(payload.body.data, "base64").toString("utf-8");
    }

    // Add the decoded body to the response (or structure it as needed)
    const emailData = {
      ...response.data,
      decodedBody: body,
    };

    res.json(emailData);
  } catch (error) {
    console.error(`Error fetching email ${messageId}:`, error);
    if (error.response && error.response.status === 401) {
      delete req.session.tokens;
      return res
        .status(401)
        .send("Authentication token expired or invalid. Please login again.");
    }
    if (error.response && error.response.status === 404) {
      return res.status(404).send("Email not found.");
    }
    res.status(500).send("Failed to retrieve email details.");
  }
});

// API Endpoint: Move Email to Trash
app.post("/api/emails/:messageId/trash", isAuthenticated, async (req, res) => {
  const { messageId } = req.params;
  console.log(`Request to trash email ID: ${messageId}`); // Logging

  try {
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    await gmail.users.messages.trash({
      userId: "me",
      id: messageId,
    });
    res.status(200).send({ message: "Email moved to trash successfully." });
  } catch (error) {
    console.error(`Error trashing email ${messageId}:`, error);
    // Add specific error handling similar to GET /api/emails
    if (error.response && error.response.status === 401) {
      delete req.session.tokens;
      return res.status(401).send("Authentication token expired or invalid.");
    }
    if (error.response && error.response.status === 404) {
      return res.status(404).send("Email not found.");
    }
    res.status(500).send("Failed to move email to trash.");
  }
});

// API Endpoint: Modify Email Labels (Star, Important, Spam, Untrash, Read/Unread)
app.post("/api/emails/:messageId/modify", isAuthenticated, async (req, res) => {
  const { messageId } = req.params;
  // Get label modifications from request body
  const { addLabelIds, removeLabelIds } = req.body;

  console.log(`Request to modify email ID: ${messageId}`, {
    addLabelIds,
    removeLabelIds,
  }); // Logging

  if (!addLabelIds && !removeLabelIds) {
    return res
      .status(400)
      .send({ message: "No labels provided for modification." });
  }

  try {
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    await gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: {
        addLabelIds: addLabelIds || [], // Ensure arrays are passed
        removeLabelIds: removeLabelIds || [],
      },
    });
    res.status(200).send({ message: "Email labels modified successfully." });
  } catch (error) {
    console.error(`Error modifying email ${messageId}:`, error);
    // Add specific error handling
    if (error.response) {
      if (error.response.status === 401) {
        delete req.session.tokens;
        return res.status(401).send("Authentication token expired or invalid.");
      }
      if (error.response.status === 404) {
        return res.status(404).send("Email not found.");
      }
      if (error.response.status === 400) {
        // Potentially invalid label IDs
        return res
          .status(400)
          .send("Bad request: Invalid label IDs or modification.");
      }
    }
    res.status(500).send("Failed to modify email labels.");
  }
});

// API Endpoint: Send Email
app.post("/api/send", isAuthenticated, async (req, res) => {
  const { to, subject, body } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).send("Missing required fields: to, subject, body");
  }

  try {
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Construct the raw email message (RFC 2822 format)
    const emailLines = [];
    emailLines.push(`To: ${to}`);
    // Assuming 'me' is the sender, fetch user's profile if needed for 'From'
    // For simplicity, let Gmail handle the 'From' header based on the authenticated user
    // emailLines.push(`From: ${senderEmail}`); // Optional: Set explicitly if needed
    emailLines.push(`Subject: ${subject}`);
    emailLines.push("Content-Type: text/html; charset=utf-8"); // Assuming HTML body
    emailLines.push("MIME-Version: 1.0");
    emailLines.push(""); // Empty line separates headers from body
    emailLines.push(body);

    const email = emailLines.join("\r\n").trim();

    // Base64url encode the email
    const base64EncodedEmail = Buffer.from(email).toString("base64url");

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
