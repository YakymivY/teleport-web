import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';
import './Tooltip.css';

type TooltipSide = 'top' | 'right' | 'bottom' | 'left';

type TooltipProps = {
  content: ReactNode;
  delayDuration?: number;
  disableHoverableContent?: boolean;
  side?: TooltipSide;
  children: ReactNode;
};

export function TooltipProvider({
  children,
  delayDuration = 400,
  skipDelayDuration = 500,
}: {
  children: ReactNode;
  delayDuration?: number;
  skipDelayDuration?: number;
}) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
    >
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function Tooltip({
  content,
  delayDuration,
  disableHoverableContent,
  side = 'top',
  children,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root
      delayDuration={delayDuration}
      disableHoverableContent={disableHoverableContent}
    >
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className="tooltip-content"
          side={side}
          sideOffset={4}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

