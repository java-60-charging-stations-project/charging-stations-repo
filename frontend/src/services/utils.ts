function normalizeString(value: string): string {
    return value.toLowerCase().trim();
}

async function hashKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
};

export async function buildHash(values: string[]): Promise<string> {
    const normalizedKey = values.map(normalizeString).join('|');
    const hash = await hashKey(normalizedKey);
    return hash;
};

export function userStatusTransform(status: string): string {
    switch (status) {
        case "UNCONFIRMED":
            return "Not confirmed";
        case "CONFIRMED":
            return "Confirmed";
        case "ARCHIVED":
            return "Archived";
        case "COMPROMISED":
            return "Compromised";
        case "RESET_REQUIRED":
            return "Reset required";
        case "FORCE_CHANGE_PASSWORD":
            return "Changing password";
        case "EXTERNAL_PROVIDER":
            return "External";
        default:
            return "Unknown";
    }
}