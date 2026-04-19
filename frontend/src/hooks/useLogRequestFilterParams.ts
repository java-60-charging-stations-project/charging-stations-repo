import { useSearchParams } from "react-router";

export interface UseLogRequestFilterParams {
    resolved: boolean | undefined;
    setResolved: (value: boolean | undefined) => void;
};

export function useLogRequestFilterParams():UseLogRequestFilterParams {
    const [searchParams, setSearchParams] = useSearchParams();
    
    const getBoolean = (key: string): boolean | undefined => {
        const value = searchParams.get(key)?.trim().toLowerCase();
        if (value === "true" || value === "1") {
            return true;
        };
        if (value === "false" || value === "0") {
            return false;
        };
        return undefined;
    };
    
    const resolved = getBoolean("resolved");

    const setResolved = (newResolved: boolean | undefined) => {
        setSearchParams(
            (prev: URLSearchParams) => {
                const next = new URLSearchParams(prev);
                if (newResolved === undefined) {
                    next.delete("resolved");
                }
                else {
                    next.set("resolved", String(newResolved));
                }
                return next;
            }
        )
    };

    return { resolved, setResolved };
};