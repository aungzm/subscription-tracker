// components/ui/multi-select.tsx
"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Command, CommandGroup, CommandItem } from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// --- Interfaces ---
export interface MultiSelectTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode
}
export interface MultiSelectValueProps extends React.HTMLAttributes<HTMLDivElement> {
    placeholder?: React.ReactNode
}
export interface MultiSelectContentProps extends React.ComponentPropsWithoutRef<typeof CommandGroup> {
    children?: React.ReactNode
}
export interface MultiSelectItemProps extends React.ComponentPropsWithoutRef<typeof CommandItem> {
    value: string
    children?: React.ReactNode
    selected?: boolean
    onSelect?: () => void
}
export interface MultiSelectProps {
    className?: string
    value?: string[]
    onChange?: (value: string[]) => void
    placeholder?: React.ReactNode
    disabled?: boolean
    children: React.ReactNode
}

// --- Components ---
export const MultiSelectTrigger = React.forwardRef<HTMLDivElement, MultiSelectTriggerProps>(
    ({ className, children, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
)
MultiSelectTrigger.displayName = "MultiSelectTrigger"

export const MultiSelectValue = React.forwardRef<HTMLDivElement, MultiSelectValueProps>(
    ({ className, placeholder }, ref) => (
        <div
            ref={ref}
            className={cn("flex gap-1 flex-wrap", className)}
        >
            {placeholder}
        </div>
    )
)
MultiSelectValue.displayName = "MultiSelectValue"

export const MultiSelectContent = React.forwardRef<HTMLDivElement, MultiSelectContentProps>(
    ({ className, children, ...props }, ref) => (
        <CommandGroup ref={ref} className={cn("", className)} {...props}>
            {children}
        </CommandGroup>
    )
)
MultiSelectContent.displayName = "MultiSelectContent"

export const MultiSelectItem = React.forwardRef<HTMLDivElement, MultiSelectItemProps>(
    ({ className, children, value, selected, onSelect, ...props }, ref) => (
        <CommandItem
            ref={ref}
            value={value}
            className={cn("cursor-pointer", className, selected && "bg-accent")}
            onSelect={onSelect}
            {...props}
        >
            {children}
        </CommandItem>
    )
)
MultiSelectItem.displayName = "MultiSelectItem"

// --- Main MultiSelect ---
export const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(
    ({ className, value = [], onChange, placeholder, disabled, children }, ref) => {
        const [open, setOpen] = React.useState(false)
        const [selected, setSelected] = React.useState<string[]>(value)
        const [availableItems, setAvailableItems] = React.useState<{ value: string, label: React.ReactNode }[]>([])

        // Extract items from children
        React.useEffect(() => {
            const items = React.Children.toArray(children)
                .filter(child => React.isValidElement(child) && child.type === MultiSelectContent)
                .flatMap(content =>
                    React.Children.toArray((content as React.ReactElement<MultiSelectContentProps>).props.children)
                        .filter(child => React.isValidElement(child) && child.type === MultiSelectItem)
                        .map(item => ({
                            value: (item as React.ReactElement<MultiSelectItemProps>).props.value,
                            label: (item as React.ReactElement<MultiSelectItemProps>).props.children
                        }))
                )
            setAvailableItems(items)
        }, [children])

        // Update internal state when value prop changes
        React.useEffect(() => {
            setSelected(value)
        }, [value])

        // Handle item selection
        const handleSelect = (itemValue: string) => {
            const newSelected = selected.includes(itemValue)
                ? selected.filter(i => i !== itemValue)
                : [...selected, itemValue]

            setSelected(newSelected)
            onChange && onChange(newSelected)
            setOpen(true) // Keep popover open after selection
        }

        // Remove a selected item
        const handleRemove = (itemValue: string, e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation()
            const newSelected = selected.filter(i => i !== itemValue)
            setSelected(newSelected)
            onChange && onChange(newSelected)
        }

        // Find label for a value
        const getLabelForValue = (itemValue: string) => {
            const item = availableItems.find(i => i.value === itemValue)
            return item ? item.label : itemValue
        }

        // Find the MultiSelectContent child
        const contentChild = React.Children.toArray(children).find(
            child => React.isValidElement(child) && child.type === MultiSelectContent
        ) as React.ReactElement<MultiSelectContentProps> | undefined

        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild disabled={disabled}>
                    <div className="cursor-pointer">
                        <MultiSelectTrigger ref={ref} className={className}>
                            <div className="flex flex-wrap gap-1">
                                {selected.length ? (
                                    selected.map(item => (
                                        <Badge key={item} variant="secondary" className="m-0.5 pl-2">
                                            {getLabelForValue(item)}
                                            <button
                                                type="button"
                                                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={(e) => handleRemove(item, e)}
                                                tabIndex={-1}
                                            >
                                                <X className="h-3 w-3" />
                                                <span className="sr-only">Remove {getLabelForValue(item)}</span>
                                            </button>
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-muted-foreground">{placeholder}</span>
                                )}
                            </div>
                        </MultiSelectTrigger>
                    </div>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                    <Command>
                        {contentChild &&
                            React.cloneElement(
                                contentChild,
                                {
                                    children: React.Children.map(
                                        contentChild.props.children,
                                        child => {
                                            if (React.isValidElement(child) && child.type === MultiSelectItem) {
                                                const itemValue = (child.props as MultiSelectItemProps).value
                                                return React.cloneElement(
                                                    child as React.ReactElement<MultiSelectItemProps>,
                                                    {
                                                        onSelect: () => handleSelect(itemValue),
                                                        selected: selected.includes(itemValue),
                                                    }
                                                )
                                            }
                                            return child
                                        }
                                    )
                                }
                            )
                        }
                    </Command>
                </PopoverContent>
            </Popover>
        )
    }
)
MultiSelect.displayName = "MultiSelect"
