import {type FC} from "react";

export interface EasySpinnerProps {
    size?: "sm" | "md" | "lg";
}

const EasySpinner: FC<EasySpinnerProps> = ({ size = "sm" }) => {
    const sizeClass = size === "sm" ? "w-4 h-4" : size === "md" ? "w-8 h-8" : "w-12 h-12";
    return <div className={`${sizeClass} border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin`} />
};

export default EasySpinner;