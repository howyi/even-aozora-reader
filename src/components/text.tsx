import { cva, type VariantProps } from "class-variance-authority";
import {
	type ComponentProps,
	cloneElement,
	isValidElement,
	type ReactElement,
} from "react";

import { cn } from "@/lib/utils";

const textVariants = cva("", {
	variants: {
		size: {
			"very-large-title":
				"text-[24px] font-normal leading-normal tracking-[-0.72px]",
			"large-title": "text-[20px] font-normal leading-normal tracking-[-0.6px]",
			"medium-title":
				"text-[17px] fonst-normal leading-normal tracking-[-0.17px]",
			"medium-body": "text-[17px] font-light leading-normal tracking-[-0.17px]",
			"normal-title":
				"text-[15px] font-normal leading-normal tracking-[-0.15px]",
			"normal-body": "text-[15px] font-light leading-normal tracking-[-0.15px]",
			"normal-subtitle":
				"text-[13px] font-normal leading-normal tracking-[-0.13px]",
			"normal-detail":
				"text-[11px] font-normal leading-normal tracking-[-0.11px]",
		},
	},
	defaultVariants: {
		size: "normal-body",
	},
});

function Text({
	className,
	size = "normal-body",
	asChild = false,
	...props
}: ComponentProps<"span"> &
	VariantProps<typeof textVariants> & {
		asChild?: boolean;
	}) {
	const textClassName = cn(textVariants({ size, className }));

	if (asChild && isValidElement(props.children)) {
		const child = props.children as ReactElement<{ className?: string }>;
		return cloneElement(child, {
			...props,
			"data-slot": "text",
			"data-size": size,
			className: cn(textClassName, child.props.className),
		} as ComponentProps<"span">);
	}

	return (
		<span
			data-slot="text"
			data-size={size}
			className={textClassName}
			{...props}
		/>
	);
}

export { Text, textVariants };
