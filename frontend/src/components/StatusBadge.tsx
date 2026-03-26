import type { FC, ReactNode } from "react";
import type { StationState } from "@/types/stations";

export type StatusBadgeProps ={
    labelText: ReactNode;
    /** Background color (CSS color value) */
    color: string;
    /** Text color (CSS color value) */
    textColor: string;
    /** Tailwind text size class, e.g. text-[10px], text-xs */
    textSize: string;
    /** Tailwind font weight class, e.g. font-medium, font-semibold */
    textWeight: string;
    /** Tailwind padding/size class, e.g. px-2 py-0.5 */
    size: string;
    /** Border color (CSS color value) */
    borderColor?: string;
}

const StatusBadge: FC<StatusBadgeProps> = ({
    labelText,
    color,
    textColor,
    textSize,
    textWeight,
    size,
    borderColor,
}) => {
    const border = borderColor ?? textColor;
    return (
        <span
            className={`inline-flex items-center rounded border ${textSize} ${textWeight} ${size}`}
            style={{
                backgroundColor: color,
                color: textColor,
                borderColor: border,
            }}
        >
            {labelText}
        </span>
    );
};

export default StatusBadge;

/** Fixed presets for station statuses (new element each render — safe in lists). */
export function StationStatusBadgeInactive() {
    return (
        <StatusBadge
            labelText="INACTIVE"
            color="#fecaca"
            textColor="#991b1b"
            borderColor="#d97777"
            textSize="text-[10px]"
            textWeight="font-medium"
            size="px-2 py-0.5"
        />
    );
}

export function StationStatusBadgeActive() {
    return (
        <StatusBadge
            labelText="ACTIVE"
            color="#bbf7d0"
            textColor="#166534"
            borderColor="#4ade80"
            textSize="text-[10px]"
            textWeight="font-medium"
            size="px-2 py-0.5"
        />
    );
}

export function StationStatusBadgeOutOfService() {
    return (
        <StatusBadge
            labelText="OUT_OF_SERVICE"
            color="#fef08a"
            textColor="#854d0e"
            borderColor="#eab308"
            textSize="text-[10px]"
            textWeight="font-medium"
            size="px-2 py-0.5"
        />
    );
}

export function StationStatusBadgeDeleted() {
    return (
        <StatusBadge
            labelText="DELETED"
            color="#4b5563"
            textColor="#e5e7eb"
            borderColor="#374151"
            textSize="text-[10px]"
            textWeight="font-medium"
            size="px-2 py-0.5"
        />
    );
}

export function StationStateBadge({ state }: { state: StationState }) {
    switch (state) {
        case "INACTIVE":
            return <StationStatusBadgeInactive />;
        case "ACTIVE":
            return <StationStatusBadgeActive />;
        case "OUT_OF_SERVICE":
            return <StationStatusBadgeOutOfService />;
        default: {
            return <StationStatusBadgeDeleted />;
        }
    }
}

export function UserStatusBadgeDisabled() {
    return (
        <StatusBadge
            labelText="Disabled"
            color="#fecaca"
            textColor="#991b1b"
            borderColor="#d97777"
            textSize="text-[10px]"
            textWeight="font-medium"
            size="px-2 py-0.5"
        />
    );
}

export function UserStatusBadgeEnabled() {
    return (
        <StatusBadge
            labelText="Enabled"
            color="#bbf7d0"
            textColor="#166534"
            borderColor="#4ade80"
            textSize="text-[10px]"
            textWeight="font-medium"
            size="px-2 py-0.5"
        />
    );
}

export function UserStatusBadge({ enabled }: { enabled: boolean }) {
    return enabled ? <UserStatusBadgeEnabled /> : <UserStatusBadgeDisabled />;
}