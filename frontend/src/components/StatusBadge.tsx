import type { FC, ReactNode } from "react";
import type { PortState, StationState } from "@/types/stations";
import type { UserRole } from "@/types";

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
};

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
};

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
};

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
};

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
};

const portBadgeShared = {
    textSize: "text-[10px]" as const,
    textWeight: "font-medium" as const,
    size: "px-2 py-0.5" as const,
};

export function PortStatusBadgeDisabled() {
    return (
        <StatusBadge
            labelText="DISABLED"
            color="#d1d5db"
            textColor="#1f2937"
            borderColor="#6b7280"
            {...portBadgeShared}
        />
    );
};

export function PortStatusBadgeFree() {
    return (
        <StatusBadge
            labelText="FREE"
            color="#bbf7d0"
            textColor="#14532d"
            borderColor="#15803d"
            {...portBadgeShared}
        />
    );
};

export function PortStatusBadgeBooked() {
    return (
        <StatusBadge
            labelText="BOOKED"
            color="#bfdbfe"
            textColor="#1e3a8a"
            borderColor="#1d4ed8"
            {...portBadgeShared}
        />
    );
};

export function PortStatusBadgeOccupied() {
    return (
        <StatusBadge
            labelText="OCCUPIED"
            color="#ffedd5"
            textColor="#9a3412"
            borderColor="#c2410c"
            {...portBadgeShared}
        />
    );
};

export function PortStatusBadgeError() {
    return (
        <StatusBadge
            labelText="ERROR"
            color="#fecaca"
            textColor="#991b1b"
            borderColor="#dc2626"
            {...portBadgeShared}
        />
    );
};

/** Maps a port state to the corresponding status badge element. */
// Helper export (not a component) — allowed alongside badge components in this module.
// eslint-disable-next-line react-refresh/only-export-components
export function mapPortStateToBadge(state: PortState) {
    switch (state) {
        case "DISABLED":
            return <PortStatusBadgeDisabled />;
        case "FREE":
            return <PortStatusBadgeFree />;
        case "BOOKED":
            return <PortStatusBadgeBooked />;
        case "OCCUPIED":
            return <PortStatusBadgeOccupied />;
        case "ERROR":
            return <PortStatusBadgeError />;
    }
};

export function PortStateBadge({ state }: { state: PortState }) {
    return mapPortStateToBadge(state);
};

export function UserStatusBadgeDisabled() {
    return (
        <StatusBadge
            labelText="Disabled"
            color="#fecaca"
            textColor="#991b1b"
            borderColor="#d97777"
            textSize="text-[11px]"
            textWeight="font-medium"
            size="px-2 py-1"
        />
    );
};

export function UserStatusBadgeEnabled() {
    return (
        <StatusBadge
            labelText="Enabled"
            color="#bbf7d0"
            textColor="#166534"
            borderColor="#4ade80"
            textSize="text-[11px]"
            textWeight="font-medium"
            size="px-2 py-1"
        />
    );
};

export function UserStatusBadge({ enabled }: { enabled: boolean }) {
    return enabled ? <UserStatusBadgeEnabled /> : <UserStatusBadgeDisabled />;
};

export function UserRoleBadgeUser() {
    return (
        <StatusBadge
            labelText="USER"
            color="#bbf7d0"
            textColor="#166534"
            borderColor="#4ade80"
            textSize="text-[11px]"
            textWeight="font-medium"
            size="px-2 py-1"
        />
    );
};

export function UserRoleBadgeSupport() {
    return (
        <StatusBadge
            labelText="SUPPORT"
            color="#fed7aa"
            textColor="#9a3412"
            borderColor="#fb923c"
            textSize="text-[11px]"
            textWeight="font-medium"
            size="px-2 py-1"
        />
    );
};

export function UserRoleBadgeAdmin() {
    return (
        <StatusBadge
            labelText="ADMIN"
            color="#bfdbfe"
            textColor="#1e40af"
            borderColor="#60a5fa"
            textSize="text-[11px]"
            textWeight="font-medium"
            size="px-2 py-1"
        />
    );
};

export function UserRoleBadge({ role }: { role: UserRole }) {
    switch (role) {
        case 'ADMIN':   return <UserRoleBadgeAdmin />;
        case 'SUPPORT': return <UserRoleBadgeSupport />;
        default:        return <UserRoleBadgeUser />;
    }
};

export function StatusBadgeGreen({ labelText }: { labelText: string }) {
    return (
        <StatusBadge
            labelText={labelText}
            color="#bbf7d0"
            textColor="#14532d"
            borderColor="#15803d"
            textSize="text-[10px]"
            textWeight="font-medium"
            size="px-2 py-0.5"
        />
    );
}

export function StatusBadgeError({ labelText }: { labelText: string }) {
    return (
        <StatusBadge
            labelText={labelText}
            color="#fecaca"
            textColor="#991b1b"
            borderColor="#dc2626"
            textSize="text-[10px]"
            textWeight="font-medium"
            size="px-2 py-0.5"
        />
    );
}