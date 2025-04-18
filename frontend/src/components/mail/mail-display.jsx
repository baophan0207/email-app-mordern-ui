import React, { useState, useEffect } from 'react';
import { format, addHours, addDays, nextSaturday } from 'date-fns';
import {
  Archive,
  ArchiveX,
  Clock,
  Forward,
  MoreVertical,
  Reply,
  ReplyAll,
  Trash2,
  CornerUpLeft,
  Download,
} from 'lucide-react';

import { DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getEmailDetails, markAsRead, markAsUnread, moveToTrash, API_BASE_URL } from '@/services/api'; // Import API functions
import { ScrollArea } from '../ui/scroll-area';

export function MailDisplay({ mailId }) {
  const [emailDetails, setEmailDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!mailId) {
      setEmailDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);
      setEmailDetails(null);
      try {
        const response = await getEmailDetails(mailId);
        setEmailDetails(response.data);
        try {
          await markAsRead(mailId);
        } catch (markReadError) {
          console.error('Failed to mark email as read:', markReadError);
        }
      } catch (err) {
        console.error('Failed to fetch email details:', err);
        setError('Failed to load email details.');
        if (err.response && err.response.status === 401) {
          setError('Authentication error. Please log in again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [mailId]);

  const handleMarkUnread = async () => {
    if (!mailId) return;
    try {
      await markAsUnread(mailId);
    } catch (err) {
      console.error('Failed to mark as unread:', err);
    }
  };

  const handleDelete = async () => {
    if (!mailId) return;
    if (window.confirm('Are you sure you want to move this email to Trash?')) {
      try {
        await moveToTrash(mailId);
        setEmailDetails(null);
      } catch (err) {
        console.error('Failed to move to trash:', err);
      }
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading email...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }

  if (!mailId || !emailDetails) {
    return <div className="p-8 text-center text-muted-foreground">No message selected</div>;
  }

  const fromHeader = emailDetails.from || 'Unknown Sender';
  const dateHeader = emailDetails.date; // Use direct 'date' field
  const subject = emailDetails.subject || '(No Subject)';

  let senderName = fromHeader;
  let senderEmail = '';
  const fromMatch = fromHeader.match(/(.*)<(.*)>/);
  if (fromMatch) {
    senderName = fromMatch[1].trim();
    senderEmail = fromMatch[2].trim();
  } else if (fromHeader.includes('@')) {
    senderEmail = fromHeader;
    senderName = senderEmail.split('@')[0];
  }

  const emailBodyHtml = emailDetails?.body || '<p>No content found.</p>';
  const attachments = emailDetails?.attachments || [];

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center p-2">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!mailId} onClick={handleMarkUnread}>
                <CornerUpLeft className="h-4 w-4" />
                <span className="sr-only">Mark as unread</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mark as unread</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!mailId} onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Move to trash</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move to trash</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <Tooltip>
            <Popover>
              <PopoverTrigger asChild>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={!mailId}>
                    <Clock className="h-4 w-4" />
                    <span className="sr-only">Snooze</span>
                  </Button>
                </TooltipTrigger>
              </PopoverTrigger>
              <PopoverContent className="flex w-[535px] p-0">
                <div className="flex flex-col gap-2 border-r px-2 py-4">
                  <div className="px-4 text-sm font-medium">Snooze until</div>
                  <div className="grid min-w-[250px] gap-1">
                    <Button variant="ghost" className="justify-start font-normal">
                      Later today{' '}
                      <span className="ml-auto text-muted-foreground">
                        {format(addHours(new Date(), 4), 'E, h:m b')}
                      </span>
                    </Button>
                    <Button variant="ghost" className="justify-start font-normal">
                      Tomorrow
                      <span className="ml-auto text-muted-foreground">
                        {format(addDays(new Date(), 1), 'E, h:m b')}
                      </span>
                    </Button>
                    <Button variant="ghost" className="justify-start font-normal">
                      This weekend
                      <span className="ml-auto text-muted-foreground">
                        {format(nextSaturday(new Date()), 'E, h:m b')}
                      </span>
                    </Button>
                    <Button variant="ghost" className="justify-start font-normal">
                      Next week
                      <span className="ml-auto text-muted-foreground">
                        {format(addDays(new Date(), 7), 'E, h:m b')}
                      </span>
                    </Button>
                  </div>
                </div>
                <div className="p-2">
                  <Calendar />
                </div>
              </PopoverContent>
            </Popover>
            <TooltipContent>Snooze</TooltipContent>
          </Tooltip>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!mailId}>
                <Reply className="h-4 w-4" />
                <span className="sr-only">Reply</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reply</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!mailId}>
                <ReplyAll className="h-4 w-4" />
                <span className="sr-only">Reply all</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reply all</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!mailId}>
                <Forward className="h-4 w-4" />
                <span className="sr-only">Forward</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Forward</TooltipContent>
          </Tooltip>
        </div>
        <Separator orientation="vertical" className="mx-2 h-6" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={!mailId}>
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleMarkUnread}>Mark as unread</DropdownMenuItem>
            <DropdownMenuItem>Star thread</DropdownMenuItem>
            <DropdownMenuItem>Add label</DropdownMenuItem>
            <DropdownMenuItem>Mute thread</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Separator />
      <div className="flex flex-1 flex-col min-h-0">
        <div className="flex items-start p-4">
          <div className="flex items-start gap-4 text-sm">
            <Avatar>
              <AvatarImage src={emailDetails.sender?.picture} alt={senderName} />
              <AvatarFallback>
                {senderName
                  ?.split(' ')
                  .filter(Boolean) // Ensure no empty strings from multiple spaces
                  .map((chunk) => chunk[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <div className="grid gap-1">
              <div className="font-semibold">{senderName}</div>
              <div className="font-semibold text-base mb-2">{subject}</div>
              <div className="line-clamp-1 text-xs">{`<${senderEmail}>`}</div>
              {/* Add To/Cc display if needed */}
            </div>
          </div>
          {dateHeader && (
            <div className="ml-auto text-xs text-muted-foreground">
              {format(new Date(dateHeader), 'PPpp')}
            </div>
          )}
        </div>
        <Separator />
        <ScrollArea className="flex-1 whitespace-pre-wrap p-4 text-sm min-h-0">
          <div dangerouslySetInnerHTML={{ __html: emailBodyHtml }} />
        </ScrollArea>
        {attachments.length > 0 && (
          <>
            <Separator />
            <ScrollArea className="max-h-32">
              <div className="p-4">
                <h4 className="mb-2 text-sm font-medium text-muted-foreground">Attachments ({attachments.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((attachment) => (
                    <a
                      key={attachment.attachmentId}
                      href={`${API_BASE_URL}/api/emails/${mailId}/attachments/${attachment.attachmentId}?filename=${encodeURIComponent(attachment.filename)}&mimetype=${encodeURIComponent(attachment.mimeType)}`}
                      download={attachment.filename}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm"
                      title={`Download ${attachment.filename}`}
                    >
                      <Button variant="outline" size="sm" className="h-8 gap-1">
                        <Download className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">
                          {attachment.filename} ({formatFileSize(attachment.size)})
                        </span>
                      </Button>
                    </a>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </>
        )}
        <Separator className="mt-auto" />
        <div className="p-4">
          <form>
            <div className="grid gap-4">
              <Textarea className="p-4" placeholder={`Reply ${senderName}...`} />
              <div className="flex items-center">
                <Label htmlFor="mute" className="flex items-center gap-2 text-xs font-normal">
                  <Switch id="mute" aria-label="Mute thread" /> Mute this thread
                </Label>
                <Button onClick={(e) => e.preventDefault()} size="sm" className="ml-auto">
                  Send
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
