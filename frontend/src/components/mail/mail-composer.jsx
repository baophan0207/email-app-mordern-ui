import { sendEmail } from '@/services/api';
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Type } from 'lucide-react'; // Close icon
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style'; // Needed for color/highlight/font
import { Color } from '@tiptap/extension-color'; // Needed for color
import Highlight from '@tiptap/extension-highlight'; // Needed for highlight
import TextAlign from '@tiptap/extension-text-align';
import History from '@tiptap/extension-history'; // For Undo/Redo
import FontFamily from '@tiptap/extension-font-family';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import { FontSize } from './font-size';
import { EditorToolbar } from './editor-toolbar'; // Import the toolbar
import { Separator } from '../ui/separator';

export function MailComposer({ onClose }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [isToolbarVisible, setIsToolbarVisible] = useState(true); // State for toolbar visibility

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Keep defaults, but disable history as we add it separately
        history: false,
        blockquote: false,
        codeBlock: false,
        // Disable StarterKit's default lists since we're using standalone extensions
        bulletList: false,
        orderedList: false,
      }),
      Underline,
      BulletList,
      OrderedList,
      Link.configure({
        openOnClick: false, // Don't open links immediately on click in editor
        autolink: true, // Automatically detect links
      }),
      TextStyle, // Required by Color and Highlight
      Color,
      Highlight.configure({ multicolor: true }), // Allow multiple highlight colors
      TextAlign.configure({
        types: ['heading', 'paragraph'], // Apply alignment to paragraphs and headings
      }),
      History, // Add Undo/Redo capabilities
      FontFamily, // Add Font Family support
      FontSize.configure({ types: ['textStyle'] }),
    ],
    // Set initial content with default styles using a span
    content: '',
    editorProps: {
      attributes: {
        // Remove direct editor styling, apply to wrapper instead
        class: 'prose dark:prose-invert max-w-none focus:outline-none p-2 min-h-[150px]', // Keep prose, focus, padding, min-height
      },
    },
  });

  const handleSend = async () => {
    const bodyHTML = editor.getHTML(); // Get content as HTML
    if (!to || !subject || editor.isEmpty) {
      alert('Please fill in the recipient, subject, and body.');
      return;
    }
    console.log('Attempting to send email:', { to, subject, body: bodyHTML });
    try {
      await sendEmail(to, subject, bodyHTML);
      console.log('Email sent successfully!');
      alert('Email sent successfully!'); // Simple user feedback
      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
      alert(`Failed to send email: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    }
  };

  // Cleanup editor instance on unmount
  React.useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  return (
    <Card className="fixed bottom-4 right-4 w-[36%] max-w-[90%] h-[70%] max-h-[80%] shadow-lg z-50 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between p-4 bg-muted/50 border-b">
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
