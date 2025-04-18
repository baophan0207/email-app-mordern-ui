import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function Nav({ isCollapsed, links, selectedFolder, onSelectFolder }) {
  return (
    <TooltipProvider delayDuration={0}>
      <div
        data-collapsed={isCollapsed}
        className="group flex flex-col gap-4 py-2 data-[collapsed=true]:py-2"
      >
        <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
          {links.map((link, index) => {
            return isCollapsed ? (
              <Tooltip key={index} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant={selectedFolder === link.title ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => onSelectFolder(link.title)}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg',
                      selectedFolder !== link.title && 'bg-transparent'
                    )}
                    aria-label={link.title}
                  >
                    <link.icon className="h-4 w-4" />
                    <span className="sr-only">{link.title}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="flex items-center gap-4">
                  {link.title}
                  {link.label && (
                    <span className="ml-auto text-muted-foreground">{link.label}</span>
                  )}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                key={index}
                variant={selectedFolder === link.title ? 'default' : 'ghost'}
                className={cn(
                  'w-full justify-start',
                  selectedFolder !== link.title && 'bg-transparent'
                )}
                onClick={() => onSelectFolder(link.title)}
              >
                <link.icon className="mr-2 h-4 w-4" />
                {link.title}
                {link.label && (
                  <span
                    className={cn(
                      'ml-auto',
                      selectedFolder === link.title && 'text-background dark:text-white'
                    )}
                  >
                    {link.label}
                  </span>
                )}
              </Button>
            );
          })}
        </nav>
      </div>
    </TooltipProvider>
  );
}
