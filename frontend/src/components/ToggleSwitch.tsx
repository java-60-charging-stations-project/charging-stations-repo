import type { FC } from "react";

interface ToggleSwitchProps {
    value: boolean;
    onChange: (checked: boolean) => void;
    hint?: string;
    disabled?: boolean;
}

const ToggleSwitch: FC<ToggleSwitchProps> = ({ value, onChange, hint, disabled = false }) => {
    return (
        <div className="flex items-center gap-2">
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
            {hint && <span className="text-[10px] text-neutral-500 select-none">{hint}</span>}
        </div>
    );
};

export default ToggleSwitch;
