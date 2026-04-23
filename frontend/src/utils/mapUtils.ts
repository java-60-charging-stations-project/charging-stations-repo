import type { AddressData, AddressDataCallback, LatLng } from "@/types/maps";


function getAddressComponent(geoResult: google.maps.GeocoderResult, type: string ): string | undefined {
    return geoResult.address_components.find(component => component.types.includes(type) )?.long_name;
};

export function getAddressByCoordinates(
    position: LatLng,
    addressCallback: AddressDataCallback
) {
    const { lat, lng } = position;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng }, },
        (results, status) => {
            if (status === "OK" && results?.[0]) {
                const result = results[0];
                const address = result.formatted_address;
                const city =
                    getAddressComponent(result, "locality") ||
                    getAddressComponent(result, "administrative_area_level_2");

                const state = getAddressComponent(result, "administrative_area_level_1");
                const country = getAddressComponent(result, "country");
                const postalCode = getAddressComponent(result, "postal_code");
                addressCallback({
                    success: true, address: {
                        city, country, address, state, postalCode
                    }
                });
            } else {
                addressCallback({ success: false });
            }
        },
    );
};

export async function extractAddress(position: LatLng): Promise<AddressData> {
    const { lat, lng } = position;
    const geocoder = new google.maps.Geocoder();
    
    const geocoderResult = await geocoder.geocode({ location: { lat, lng } });
    if (geocoderResult.results?.[0]) {
        const result = geocoderResult.results[0];
        const address = result.formatted_address;
        const city =
            getAddressComponent(result, "locality") ||
            getAddressComponent(result, "administrative_area_level_2");

        const state = getAddressComponent(result, "administrative_area_level_1");
        const country = getAddressComponent(result, "country");
        const postalCode = getAddressComponent(result, "postal_code");

        return { city, country, address, state, postalCode };
    }
    return {};
};