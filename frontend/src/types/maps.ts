export type LatLng = {
    lat: number;
    lng: number;
};

export type AddressData = {
    city?: string;
    country?: string;
    address?: string;
    state?: string;
    postalCode?: string;
};

export type ExtractedAddressData = { success: false } | {
    success: true;
    address: AddressData;
}

export type AddressDataCallback = (extracted: ExtractedAddressData) => void;