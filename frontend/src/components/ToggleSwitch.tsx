import type { FC } from "react";

interface ToggleSwitchProps {
    value: boolean;
    onChange: (checked: boolean) => void;
    hint?: string;
    disabled?: boolean;
}

const ToggleSwitch: FC<ToggleSwitchProps> = ({ value, onChange, hint, disabled = false }) => {
    return (
        <div className="relative inline-flex items-center group">
            <label className={`relative inline-flex items-center ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={value}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={disabled}
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
            {hint && (
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded bg-neutral-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {hint}
                    <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-neutral-800" />
                </div>
            )}
        </div>
    );
};

export default ToggleSwitch;
