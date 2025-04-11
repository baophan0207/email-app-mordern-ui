import * as React from 'react';
import { Bookmark, Clock, File, Inbox, OctagonAlert, Send, Star, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { AccountSwitcher } from './account-switcher';
import { MailDisplay } from './mail-display';
import { MailList } from './mail-list';
import { Nav } from './nav';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useAuth } from '@/context/AuthContext';

export function Mail({
  defaultLayout = [265, 440, 655],
  defaultCollapsed = false,
  navCollapsedSize,
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [selectedMailId, setSelectedMailId] = React.useState(null);
  const [selectedFolder, setSelectedFolder] = React.useState('Inbox');
  const { logout } = useAuth();

  const handleSelectFolder = (folder) => {
    setSelectedFolder(folder);
    setSelectedMailId(null);
  };

  const placeholderAccounts = [
    {
      label: 'Placeholder Account',
      email: 'user@example.com',
      icon: '',
    },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={(sizes) => {
          document.cookie = `react-resizable-panels:layout=${JSON.stringify(sizes)}`;
        }}
        className="h-full max-h-screen w-full max-w-screen items-stretch"
      >
        <ResizablePanel
          defaultSize={defaultLayout[0]}
          collapsedSize={navCollapsedSize}
          collapsible
          minSize={15}
          maxSize={20}
          onCollapse={() => {
            setIsCollapsed(true);
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(true)}`;
          }}
          onExpand={() => {
            setIsCollapsed(false);
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(false)}`;
          }}
          className={cn(isCollapsed && 'min-w-[50px] transition-all duration-300 ease-in-out')}
        >
          <div
            className={cn(
              'flex h-[52px] items-center justify-center',
              isCollapsed ? 'h-[52px]' : 'px-2 justify-between'
            )}
          >
            <AccountSwitcher
              isCollapsed={isCollapsed}
              accounts={placeholderAccounts}
              onLogout={logout}
            />
          </div>
          <Separator />
          <Nav
            isCollapsed={isCollapsed}
            selectedFolder={selectedFolder}
            onSelectFolder={handleSelectFolder}
            links={[
              {
                title: 'Inbox',
                label: '',
                icon: Inbox,
                variant: 'default',
              },
              {
                title: 'Starred',
                label: '',
                icon: Star,
                variant: 'ghost',
              },
              {
                title: 'Snoozed',
                label: '',
                icon: Clock,
                variant: 'ghost',
              },
              {
                title: 'Sent',
                label: '',
                icon: Send,
                variant: 'ghost',
              },
              {
                title: 'Drafts',
                label: '',
                icon: File,
                variant: 'ghost',
              },
            ]}
          />
          <Separator />
          <Nav
            isCollapsed={isCollapsed}
            selectedFolder={selectedFolder}
            onSelectFolder={handleSelectFolder}
            links={[
              {
                title: 'Important',
                label: '',
                icon: Bookmark,
                variant: 'ghost',
              },
              {
                title: 'Spam',
                label: '',
                icon: OctagonAlert,
                variant: 'ghost',
              },
              {
                title: 'Trash',
                label: '',
                icon: Trash2,
                variant: 'ghost',
              },
            ]}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={defaultLayout[1]} minSize={20} maxSize={40}>
          <MailList
            selectedFolder={selectedFolder}
            onSelectMail={setSelectedMailId}
            selectedMailId={selectedMailId}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={defaultLayout[2]}>
          <div className="h-full w-full flex justify-center items-center">
            <MailDisplay mailId={selectedMailId} />
          </div>
          {/* <MailDisplay 
            mailId={selectedMailId} 
          /> */}
        </ResizablePanel>
      </ResizablePanelGroup>
    </TooltipProvider>
  );
}
