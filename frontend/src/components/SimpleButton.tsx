import type { FC } from "react";

    
export type ButtonColor = "primary" | "secondary" | "tertiary";
export type ButtonSize = "xs" | "small" | "medium" | "large";

const colorToClass: Record<ButtonColor, string> = {
    primary: "bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600",
    secondary: "bg-secondary-500 text-white px-4 py-2 rounded-md hover:bg-secondary-600",
    tertiary: "bg-tertiary-500 text-white px-4 py-2 rounded-md hover:bg-tertiary-600",
}

const sizeToClass: Record<ButtonSize, string> = {
    xs: "px-1 py-0.5 text-xs",
    small: "px-2 py-1 text-sm",
    medium: "px-4 py-2 text-base",
    large: "px-6 py-3 text-lg",
}

export type ButtonType = "button" | "submit" | "reset";

export interface SimpleButtonProps {
    handleClick?: () => void;
    caption: string;
    isLoading?: boolean;
    loadingCaption?: string;
    isDisabled?: boolean;
    color?: ButtonColor;
    size?: ButtonSize;
    underlineOnHover?: boolean;
    className?: string;
    buttonType?: ButtonType;
}

const SimpleButton: FC<SimpleButtonProps> = ({ 
        handleClick,
        caption,
        isLoading=false,
        loadingCaption="Requesting...",
        isDisabled=false,
        color="primary",
        size="small",
        underlineOnHover=false,
        className="",
        buttonType="button",
}) => {
    const hoverUnderline = underlineOnHover ? " hover:underline" : "";
    const buttonClass = `${colorToClass[color]} ${sizeToClass[size]}${hoverUnderline} ${className}`;
    return (
        <button
            type={buttonType}
            onClick={handleClick}
            disabled={isLoading || isDisabled}
            className={buttonClass}
            >
            {isLoading? loadingCaption: caption}
        </button>
    );
}

export default SimpleButton;
