import React, { PropsWithChildren } from 'react'

function cn(...args: unknown[]) {
  return args.filter(Boolean).join(' ')
}

interface BaseProps {
  className?: string
  [key: string]: unknown
}
type OrNull<T> = T | null

export const Button = ({
  className,
  active,
  ref,
  ...props
}: PropsWithChildren<
  {
    active: boolean
    ref?: React.Ref<HTMLSpanElement>
  } & BaseProps
>) => (
  <span
    {...props}
    ref={ref}
    className={cn(
      className,
      'cursor-pointer flex justify-center items-center m-1 rounded-sm',
      active ? 'text-white bg-pink-900' : 'text-gray-400 hover:bg-pink-100 hover:text-black',
    )}
  />
)
Button.displayName = 'Button'

export const Menu = ({
  className,
  ref,
  ...props
}: PropsWithChildren<{ ref?: React.Ref<HTMLDivElement> } & BaseProps>) => (
  <div {...props} data-test-id="menu" ref={ref} className={cn(className, '')} />
)
Menu.displayName = 'Menu'

export const Toolbar = ({
  className,
  ref,
  ...props
}: PropsWithChildren<{ ref?: React.Ref<HTMLDivElement> } & BaseProps>) => (
  <Menu
    {...props}
    ref={ref}
    className={cn(className, 'relative border border-b border-gray-200 flex flex-row items-center')}
  />
)

Toolbar.displayName = 'Toolbar'
