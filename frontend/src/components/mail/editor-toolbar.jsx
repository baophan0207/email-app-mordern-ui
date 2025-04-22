import React from 'react';
import TextStyle from '@tiptap/extension-text-style';
import {
  Bold,
  Italic,
  Strikethrough,
  Underline,
  List,
  ListOrdered,
  Link2,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Undo,
  Redo,
  Eraser,
  ChevronDown,
  Indent,
  Outdent,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

const commonFonts = [
  { name: 'Sans Serif', value: 'sans-serif' },
  { name: 'Serif', value: 'serif' },
  { name: 'Fixed Width', value: 'monospace' },
  { name: 'Wide', value: '"Arial Black", Arial Bold, Gadget, sans-serif' },
  { name: 'Narrow', value: '"Arial Narrow", Arial, sans-serif' },
  { name: 'Comic Sans MS', value: '"Comic Sans MS", cursive, sans-serif' },
  { name: 'Garamond', value: 'Garamond, serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Tahoma', value: 'Tahoma, "Trebuchet MS", sans-serif' },
  { name: 'Trebuchet MS', value: '"Trebuchet MS", Tahoma, sans-serif' },
  { name: 'Verdana', value: 'Verdana, Arial, Helvetica, sans-serif' },
];

const commonFontSizes = [
  { name: 'Small', value: '8pt' },
  { name: 'Normal', value: '10pt' },
  { name: 'Large', value: '13.5pt' },
  { name: 'Huge', value: '24pt' },
];

const textColors = [
  '#000000',
  '#434343',
  '#666666',
  '#999999',
  '#b7b7b7',
  '#cccccc',
  '#d9d9d9',
  '#efefef',
  '#f3f3f3',
  '#ffffff',
  '#980000',
  '#ff0000',
  '#ff9900',
  '#ffff00',
  '#00ff00',
  '#00ffff',
  '#4a86e8',
  '#0000ff',
  '#9900ff',
  '#ff00ff',
  '#e6b8af',
  '#f4cccc',
  '#fce5cd',
  '#fff2cc',
  '#d9ead3',
  '#d0e0e3',
  '#c9daf8',
  '#cfe2f3',
  '#d9d2e9',
  '#ead1dc',
  '#dd7e6b',
  '#ea9999',
  '#f9cb9c',
  '#ffe599',
  '#b6d7a8',
  '#a2c4c9',
  '#a4c2f4',
  '#9fc5e8',
  '#b4a7d6',
  '#d5a6bd',
  '#cc4125',
  '#e06666',
  '#f6b26b',
  '#ffd966',
  '#93c47d',
  '#76a5af',
  '#6d9eeb',
  '#6fa8dc',
  '#8e7cc3',
  '#c27ba0',
  '#a61c00',
  '#cc0000',
  '#e69138',
  '#f1c232',
  '#6aa84f',
  '#45818e',
  '#3c78d8',
  '#3d85c6',
  '#674ea7',
  '#a64d79',
  '#85200c',
  '#990000',
  '#b45f06',
  '#bf9000',
  '#38761d',
  '#134f5c',
  '#1155cc',
  '#0b5394',
  '#351c75',
  '#741b47',
  '#5b0f00',
  '#660000',
  '#783f04',
  '#7f6000',
  '#274e13',
  '#0c343d',
  '#1c4587',
  '#073763',
  '#20124d',
  '#4c1130',
];

const backgroundColors = [
  '#000000',
  '#434343',
  '#666666',
  '#999999',
  '#b7b7b7',
  '#cccccc',
  '#d9d9d9',
  '#efefef',
  '#f3f3f3',
  '#ffffff',
  '#980000',
  '#ff0000',
  '#ff9900',
  '#ffff00',
  '#00ff00',
  '#00ffff',
  '#4a86e8',
  '#0000ff',
  '#9900ff',
  '#ff00ff',
  '#e6b8af',
  '#f4cccc',
  '#fce5cd',
  '#fff2cc',
  '#d9ead3',
  '#d0e0e3',
  '#c9daf8',
  '#cfe2f3',
  '#d9d2e9',
  '#ead1dc',
  '#dd7e6b',
  '#ea9999',
  '#f9cb9c',
  '#ffe599',
  '#b6d7a8',
  '#a2c4c9',
  '#a4c2f4',
  '#9fc5e8',
  '#b4a7d6',
  '#d5a6bd',
  '#cc4125',
  '#e06666',
  '#f6b26b',
  '#ffd966',
  '#93c47d',
  '#76a5af',
  '#6d9eeb',
  '#6fa8dc',
  '#8e7cc3',
  '#c27ba0',
  '#a61c00',
  '#cc0000',
  '#e69138',
  '#f1c232',
  '#6aa84f',
  '#45818e',
  '#3c78d8',
  '#3d85c6',
  '#674ea7',
  '#a64d79',
  '#85200c',
  '#990000',
  '#b45f06',
  '#bf9000',
  '#38761d',
  '#134f5c',
  '#1155cc',
  '#0b5394',
  '#351c75',
  '#741b47',
  '#5b0f00',
  '#660000',
  '#783f04',
  '#7f6000',
  '#274e13',
  '#0c343d',
  '#1c4587',
  '#073763',
  '#20124d',
  '#4c1130',
];

export function EditorToolbar({ editor }) {
  if (!editor) {
    return null;
  }

  // const setLink = () => {
  //   if (!editor) return;

  //   const previousUrl = editor.getAttributes('link').href;
  //   const url = window.prompt('URL', previousUrl);

  //   if (url === null) {
  //     return;
  //   }

  //   if (url === '') {
  //     editor.chain().focus().extendMarkRange('link').unsetLink().run();
  //     return;
  //   }

  //   editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  // };

  const removeTextColor = () => editor.chain().focus().unsetColor().run();
  const removeHighlight = () => editor.chain().focus().unsetHighlight().run();

  const isTextColorActive = editor.getAttributes('textStyle').color !== undefined;
  const isHighlightActive = editor.isActive('highlight');

  const colorButtonVariant = isTextColorActive || isHighlightActive ? 'secondary' : 'ghost';

  const currentFontSize = editor.getAttributes('textStyle').fontSize ?? '10pt';
  const currentFontFamily = editor.getAttributes('textStyle').fontFamily ?? 'sans-serif';

  const currentAlignment =
    ['left', 'center', 'right'].find((align) => editor.isActive({ textAlign: align })) || 'left';

  return (
    <div className="border border-input bg-transparent rounded-md p-1 flex flex-wrap gap-1 items-center">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        aria-label="Undo"
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        aria-label="Redo"
      >
        <Redo className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Select
        value={currentFontFamily}
        onValueChange={(value) => {
          editor.chain().focus().setFontFamily(value).run();
        }}
      >
        <SelectTrigger className="w-[150px] h-8 text-xs">
          <SelectValue placeholder="Font" />
        </SelectTrigger>
        <SelectContent>
          {commonFonts.map((font) => (
            <SelectItem
              key={font.value}
              value={font.value}
              style={{ fontFamily: font.value }}
              className="text-xs"
            >
              {font.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Select
        value={currentFontSize}
        onValueChange={(value) => {
          editor.chain().focus().setFontSize(value).run();
        }}
      >
        <SelectTrigger className="w-[90px] h-8 text-xs">
          <SelectValue placeholder="Size" />
        </SelectTrigger>
        <SelectContent>
          {commonFontSizes.map((size) => (
            <SelectItem
              key={size.value}
              value={size.value}
              style={{ fontSize: size.value }}
              className="text-xs"
            >
              {size.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive('bold')}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Toggle bold"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('italic')}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Toggle italic"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('underline')}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="Toggle underline"
      >
        <Underline className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('strike')}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Toggle strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* <Button
        variant={editor.isActive('link') ? 'secondary' : 'ghost'}
        size="sm"
        onClick={setLink}
        aria-label="Set link"
      >
        <Link2 className="h-4 w-4" />
      </Button> */}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant={colorButtonVariant} size="sm" aria-label="Color Picker">
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 flex flex-row items-center">
          <div>
            <p className="text-xs font-medium mb-1">Text color</p>
            <div className="grid grid-cols-10 gap-1">
              {textColors.map((color) => (
                <Button
                  key={`text-${color}`}
                  variant="outline"
                  size="icon-sm"
                  className="h-4 w-4 p-0 rounded-sm border transition-transform duration-150 ease-in-out hover:scale-125"
                  style={{ backgroundColor: color }}
                  onClick={() => editor.chain().focus().setColor(color).run()}
                  aria-label={`Set text color ${color}`}
                  title={color}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 text-xs h-7"
              onClick={removeTextColor}
              disabled={!isTextColorActive}
            >
              Remove Text Color
            </Button>
          </div>

          <Separator orientation="vertical" className=" mx-1" />

          <div>
            <p className="text-xs font-medium mb-1">Background color</p>
            <div className="grid grid-cols-10 gap-1">
              {backgroundColors.map((color) => (
                <Button
                  key={`bg-${color}`}
                  variant="outline"
                  size="icon-sm"
                  className="h-4 w-4 p-0 rounded-sm border transition-transform duration-150 ease-in-out hover:scale-125"
                  style={{ backgroundColor: color }}
                  onClick={() => editor.chain().focus().setHighlight({ color: color }).run()}
                  aria-label={`Set background color ${color}`}
                  title={color}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 text-xs h-7"
              onClick={removeHighlight}
              disabled={!isHighlightActive}
            >
              Remove Background Color
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive('bulletList')}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Toggle bullet list"
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('orderedList')}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Toggle ordered list"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            {currentAlignment === 'left' && <AlignLeft className="h-4 w-4" />}
            {currentAlignment === 'center' && <AlignCenter className="h-4 w-4" />}
            {currentAlignment === 'right' && <AlignRight className="h-4 w-4" />}
            <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => editor.chain().focus().setTextAlign('left').run()}>
            <AlignLeft className="h-4 w-4 mr-2" />
            <span>Left</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => editor.chain().focus().setTextAlign('center').run()}>
            <AlignCenter className="h-4 w-4 mr-2" />
            <span>Center</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => editor.chain().focus().setTextAlign('right').run()}>
            <AlignRight className="h-4 w-4 mr-2" />
            <span>Right</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Indentation Buttons */}
      {/* <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().liftListItem('listItem').run()}
        disabled={!editor.can().liftListItem('listItem')}
        aria-label="Indent Less"
      >
        <Outdent className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
        disabled={!editor.can().sinkListItem('listItem')}
        aria-label="Indent More"
      >
        <Indent className="h-4 w-4" />
      </Button> */}
      {/* <Separator orientation="vertical" className="h-6 mx-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().unsetAllMarks().run()}
        aria-label="Clear formatting"
        title="Clear formatting"
      >
        <Eraser className="h-4 w-4" />
      </Button> */}
    </div>
  );
}
