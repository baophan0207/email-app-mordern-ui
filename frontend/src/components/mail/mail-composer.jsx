import { sendEmail } from '@/services/api';
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Type, Paperclip } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Color } from '@tiptap/extension-color'; // Needed for color
import Highlight from '@tiptap/extension-highlight'; // Needed for highlight
import TextAlign from '@tiptap/extension-text-align';
import History from '@tiptap/extension-history'; // For Undo/Redo
import FontFamily from '@tiptap/extension-font-family';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import TextStyle from '@tiptap/extension-text-style'; // Added this line
import { FontSize } from './font-size';
import { EditorToolbar } from './editor-toolbar'; // Import the toolbar
import { Separator } from '../ui/separator';

export function MailComposer({ onClose }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [isToolbarVisible, setIsToolbarVisible] = useState(false); // State for toolbar visibility
  const [attachments, setAttachments] = useState([]); // [{file, name, size}]
  const [attachmentError, setAttachmentError] = useState('');
  const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25 MB

  // Calculate total size
  const totalAttachmentSize = attachments.reduce((sum, f) => sum + f.size, 0);

  // File picker handler
  const handleAttachmentChange = (e) => {
    const files = Array.from(e.target.files);
    let newAttachments = [...attachments];
    let newSize = totalAttachmentSize;
    let error = '';
    for (const file of files) {
      if (newAttachments.find((f) => f.name === file.name && f.size === file.size)) continue; // avoid duplicate
      newSize += file.size;
      if (newSize > MAX_ATTACHMENT_SIZE) {
        error = 'Total attachments exceed 25 MB!';
        alert('Total attachments exceed 25 MB!');
        break;
      }
      newAttachments.push(file);
    }
    if (!error) {
      setAttachments(newAttachments);
      setAttachmentError('');
    } else {
      setAttachmentError(error);
    }
    // Reset value so same file can be picked again
    e.target.value = '';
  };

  const handleRemoveAttachment = (name, size) => {
    setAttachments(attachments.filter((f) => !(f.name === name && f.size === size)));
    setAttachmentError('');
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
        blockquote: false,
        codeBlock: false,
        bulletList: false,
        orderedList: false,
      }),
      Underline,
      BulletList,
      OrderedList,
      TextStyle, // Added this line
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      History,
      FontFamily,
      FontSize.configure({ types: ['textStyle'] }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none p-2 min-h-[150px]',
      },
    },
  });

  const handleSend = async () => {
    const bodyHTML = editor.getHTML();
    if (!to || !subject || editor.isEmpty) {
      alert('Please fill in the recipient, subject, and body.');
      return;
    }
    if (totalAttachmentSize > MAX_ATTACHMENT_SIZE) {
      alert('Total attachments exceed 25 MB!');
      return;
    }
    try {
      await sendEmail(to, subject, bodyHTML, attachments);
      console.log('Email sent successfully!');
      alert('Email sent successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
      alert(
        `Failed to send email: ${error.response?.data?.message || error.message || 'Unknown error'}`
      );
    }
  };

  React.useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  return (
    <Card className="fixed bottom-4 right-4 w-[36%] max-w-[90%] h-[70%] max-h-[80%] shadow-lg z-50 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pl-4 pr-4 pt-2 pb-2 bg-muted/50 border-b">
        <CardTitle className="text-lg font-medium">New Message</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </CardHeader>
      <CardContent className="p-4 flex-grow flex flex-col gap-4 overflow-y-auto">
        <div className="flex flex-row items-center gap-2">
          <Label htmlFor="to" className="w-[60px]">
            To
          </Label>
          <Input
            id="to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Recipients"
            className="flex-1"
          />
        </div>
        <div className="flex flex-row items-center gap-2">
          <Label htmlFor="subject" className="w-[60px]">
            Subject
          </Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1"
          />
        </div>
        <div className="flex-grow overflow-y-auto rounded-md border border-input bg-background ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 mt-2 mb-1">
          <EditorContent editor={editor} />
        </div>
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center my-2">
            {attachments.map((file, idx) => (
              <div
                key={file.name + file.size + idx}
                className="flex items-center bg-muted px-2 py-1 rounded text-xs"
              >
                <span className="mr-2">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveAttachment(file.name, file.size)}
                  title="Remove attachment"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <span className="text-xs ml-2">
              Total: {(totalAttachmentSize / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        )}
        {attachmentError && <div className="text-xs text-red-500 mb-2">{attachmentError}</div>}
      </CardContent>
      <CardFooter className="p-2 border-t flex flex-col items-center gap-2">
        {isToolbarVisible && <EditorToolbar editor={editor} />}
        <div className="flex justify-between items-center gap-2 w-full">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsToolbarVisible(!isToolbarVisible)}
              aria-label="Toggle formatting toolbar"
              title="Toggle formatting toolbar"
            >
              <Type className="h-4 w-4" />
            </Button>
            <label htmlFor="file-attach-input" className="cursor-pointer">
              <input
                id="file-attach-input"
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleAttachmentChange}
                accept="*"
              />
              <Button
                variant="ghost"
                size="sm"
                asChild
                tabIndex={-1}
                aria-label="Attach files"
                title="Attach files"
              >
                <span>
                  <Paperclip className="h-4 w-4" />
                </span>
              </Button>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button size="sm" onClick={handleSend}>
              Send
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
