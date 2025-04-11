import React, { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { getEmails, markEmailAsRead } from '@/services/api'; // Import API function and markEmailAsRead

export function MailList({ selectedMailId, onSelectMail, selectedFolder }) {
  const [emails, setEmails] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Add state for loading more
  const [nextPageToken, setNextPageToken] = useState(null); // Add state for next page token
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Wrap fetchEmails in useCallback
  const fetchEmails = useCallback(
    async (token = null, folder = selectedFolder) => {
      if (!token) {
        setIsLoading(true); // Full load indicator for initial fetch
      } else {
        setIsLoadingMore(true); // Separate indicator for 'Load More'
      }
      setError(null);
      try {
        // Assuming getEmails now accepts an optional token and folder parameter
        const response = await getEmails(token, folder); // Pass folder
        const newEmails = response.data.emails || [];
        const nextToken = response.data.nextPageToken || null;

        // Append emails if loading more, otherwise replace
        setEmails((prevEmails) => (token ? [...prevEmails, ...newEmails] : newEmails));
        setNextPageToken(nextToken); // Store the token for the next page
      } catch (err) {
        console.error('Failed to fetch emails:', err);
        setError('Failed to load emails. Please try again later.');
        if (err.response && err.response.status === 401) {
          setError('Authentication error. Please log in again.');
          // Optionally trigger logout or redirect here
        }
      } finally {
        setIsLoading(false); // Turn off initial loading indicator
        setIsLoadingMore(false); // Turn off 'load more' indicator
      }
    },
    [selectedFolder]
  ); // fetchEmails depends on selectedFolder

  // Initial fetch on component mount and when folder changes
  useEffect(() => {
    fetchEmails(); // Call without a token to get the first page of the selected folder
  }, [fetchEmails]); // Add fetchEmails dependency

  // Handler for the 'Load More' button, wrapped in useCallback
  const handleLoadMore = useCallback(() => {
    if (nextPageToken && !isLoadingMore) {
      fetchEmails(nextPageToken, selectedFolder); // Fetch the next page using the stored token and current folder
    }
  }, [nextPageToken, isLoadingMore, fetchEmails, selectedFolder]);

  const filteredEmails = emails.filter(
    (email) =>
      email.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.senderName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.snippet?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const unreadEmails = filteredEmails.filter((email) => !email.read);

  const displayEmails = (emailList) => {
    if (!emailList || emailList.length === 0) {
      return <div className="p-4 text-center text-muted-foreground">No messages found.</div>;
    }

    return emailList.map((item) => (
      <button
        key={item.id}
        className={cn(
          'flex flex-col items-start gap-2 my-2 w-full rounded-lg border-2 border-solid border-gray-200 p-3 text-left text-sm transition-all hover:bg-accent',
          selectedMailId === item.id && 'bg-muted',
          item.read && 'bg-transparent'
        )}
        onClick={() => handleEmailClick(item)} // Use the new handler
      >
        <div className="flex w-full flex-col gap-1">
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={cn('font-semibold', !item.read && 'font-bold')}>
                {parseSenderName(item.from)}
              </div>
              {!item.read && <span className="flex h-2 w-2 rounded-full bg-blue-600" />}
            </div>
            <div
              className={cn(
                'ml-auto text-xs',
                selectedMailId === item.id ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {formatDistanceToNow(new Date(item.date || Date.now()), {
                // Add fallback for date
                addSuffix: true,
              })}
            </div>
          </div>
          <div className={cn('text-xs font-medium', !item.read && 'font-bold')}>{item.subject}</div>
        </div>
        <div className="line-clamp-2 text-xs text-muted-foreground">
          {item.snippet?.substring(0, 300)}
        </div>
        {item.labels?.length ? (
          <div className="flex items-center gap-2">
            {item.labels.map((label) => (
              <Badge key={label} variant={getBadgeVariantFromLabel(label)}>
                {label.replace(/_/g, ' ')} {/* Basic formatting */}
              </Badge>
            ))}
          </div>
        ) : null}
      </button>
    ));
  };

  const handleEmailClick = async (item) => {
    console.log("Email clicked:", item.id, "Current read status:", item.read);
    onSelectMail(item.id); // Call the original handler to display the mail

    // If the email is currently unread, mark it as read
    if (!item.read) {
      console.log("Marking email as read (UI immediate):", item.id);
      // 1. Update UI state immediately for responsiveness
      setEmails((currentEmails) =>
        currentEmails.map((email) =>
          email.id === item.id ? { ...email, read: true } : email
        )
      );

      // 2. Call API to mark as read on the backend (fire and forget for now)
      try {
        await markEmailAsRead(item.id);
        console.log("Successfully marked email as read on backend:", item.id);
      } catch (error) {
        console.error("Failed to mark email as read on backend:", error);
        // Optional: Revert UI state if backend call fails critically?
        // For now, we prioritize immediate UI feedback.
      }
    }
  };

  // Add a helper function to parse the 'From' header
  const parseSenderName = (fromHeader) => {
    if (!fromHeader) return 'Unknown Sender';
    const match = fromHeader.match(/(.*)<.*>/); // Try to match "Name <email>"
    if (match && match[1]) {
      return match[1].trim().replace(/^"|"$/g, ''); // Return trimmed name, remove surrounding quotes
    }
    // If no match or no name part, return the whole string (might be just email)
    // Or return a default if it's empty
    return fromHeader.trim() || 'Unknown Sender';
  };

  return (
    <Tabs defaultValue="all" className="h-full flex flex-col">
      <div className="flex items-center px-4 py-2">
        {/* Update Title */}
        <h1 className="text-xl font-bold">{selectedFolder}</h1>
        {/* Conditionally show tabs only for Inbox */}
        {selectedFolder === 'Inbox' && (
          <TabsList className="ml-auto">
            <TabsTrigger value="all" className="text-zinc-600 dark:text-zinc-200">
              All mail
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-zinc-600 dark:text-zinc-200">
              Unread
            </TabsTrigger>
          </TabsList>
        )}
      </div>
      <Separator />
      <div className="bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="relative">
            {/* <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /> */}
            <Input
              placeholder="Search"
              className="pl-8" // Add padding if using an icon
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </form>
      </div>
      <ScrollArea className="flex-grow">
        <div className="flex flex-col gap-2 p-4 pt-0">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading emails...</div>
          ) : error && !isLoadingMore ? ( // Don't show main error if just loading more failed momentarily
            <div className="p-4 text-center text-red-600">{error}</div>
          ) : (
            <>
              {/* Conditionally render TabsContent or just display emails */}
              {selectedFolder === 'Inbox' ? (
                <>
                  <TabsContent value="all" className="m-0">
                    {displayEmails(filteredEmails)}
                  </TabsContent>
                  <TabsContent value="unread" className="m-0">
                    {displayEmails(unreadEmails)}
                  </TabsContent>
                </>
              ) : (
                // For other folders, display all fetched emails directly
                displayEmails(filteredEmails)
              )}
              {/* Add Load More button and indicator */}
              {!isLoading && !isLoadingMore && nextPageToken && (
                <div className="p-4 pt-2 text-center">
                  <Button onClick={handleLoadMore} variant="outline" size="sm">
                    Load More
                  </Button>
                </div>
              )}
              {isLoadingMore && (
                <div className="p-4 text-center text-muted-foreground">Loading more...</div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </Tabs>
  );
}

// Helper function (can be moved to utils if needed)
function getBadgeVariantFromLabel(label) {
  // Simple example, customize as needed
  if (['work'].includes(label.toLowerCase())) {
    return 'default';
  }

  if (['personal'].includes(label.toLowerCase())) {
    return 'outline';
  }

  return 'secondary';
}
